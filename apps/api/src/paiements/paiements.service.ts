import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdhesionStatus,
  EcheanceStatus,
  NotificationCanal,
  NotificationType,
  PaiementMethode,
  PaiementStatut,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FacturesService } from '../factures/factures.service';
import { AttributionsService } from '../attributions/attributions.service';
import { CreatePaiementDto } from './dto/paiement.dto';

@Injectable()
export class PaiementsService {
  constructor(
    private prisma: PrismaService,
    private factures: FacturesService,
    private attributions: AttributionsService,
  ) {}

  private genererReference(): string {
    return `PAY-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  /**
   * Recalcule intégralement l'échéancier et les totaux d'une adhésion
   * en rejouant tous les paiements VALIDES (source de vérité unique).
   * Robuste face aux confirmations / annulations / remboursements.
   */
  private async recomputeAdhesion(
    tx: Prisma.TransactionClient,
    adhesionId: string,
  ) {
    const adhesion = await tx.adhesion.findUniqueOrThrow({
      where: { id: adhesionId },
      include: {
        echeances: { orderBy: { numero: 'asc' } },
        paiements: {
          where: { statut: PaiementStatut.VALIDE },
          orderBy: { datePaiement: 'asc' },
        },
      },
    });

    // 1) Réinitialise les échéances
    const paye: Record<string, number> = {};
    for (const e of adhesion.echeances) paye[e.id] = 0;

    // 2) Rejoue chaque paiement valide en cascade (échéances les plus anciennes d'abord)
    let totalPaye = 0;
    for (const p of adhesion.paiements) {
      let reste = Number(p.montant);
      totalPaye += Number(p.montant);
      for (const e of adhesion.echeances) {
        if (reste <= 0) break;
        const du = Number(e.montantDu) - paye[e.id];
        if (du <= 0) continue;
        const applique = Math.min(reste, du);
        paye[e.id] += applique;
        reste -= applique;
      }
    }

    // 3) Met à jour le statut de chaque échéance
    const now = new Date();
    for (const e of adhesion.echeances) {
      const montantPaye = paye[e.id];
      let statut: EcheanceStatus;
      let datePaiement: Date | null = null;
      if (montantPaye >= Number(e.montantDu)) {
        statut = EcheanceStatus.PAYEE;
        datePaiement = now;
      } else if (e.dateEcheance < now) {
        statut = EcheanceStatus.EN_RETARD;
      } else if (montantPaye > 0) {
        statut = EcheanceStatus.PARTIELLE;
      } else {
        statut = EcheanceStatus.EN_ATTENTE;
      }
      await tx.echeance.update({
        where: { id: e.id },
        data: { montantPaye, statut, datePaiement },
      });
    }

    // 4) Met à jour l'adhésion (solde, progression, statut)
    const montantTotal = Number(adhesion.montantTotal);
    const soldeRestant = Math.max(montantTotal - totalPaye, 0);
    const progression =
      montantTotal > 0 ? Math.round((totalPaye / montantTotal) * 100) : 0;
    const statut =
      soldeRestant <= 0
        ? adhesion.statut === AdhesionStatus.ATTRIBUE
          ? AdhesionStatus.ATTRIBUE
          : AdhesionStatus.COMPLETE
        : AdhesionStatus.EN_COURS;

    await tx.adhesion.update({
      where: { id: adhesionId },
      data: { montantPaye: totalPaye, soldeRestant, progression, statut },
    });

    return { totalPaye, soldeRestant, progression, statut };
  }

  /** Enregistre un paiement, l'applique et génère la facture (transactionnel) */
  async create(
    dto: CreatePaiementDto,
    options: {
      statut?: PaiementStatut;
      saisiParId?: string;
      requesterClientId?: string | null;
      requesterRole: string;
      commentaire?: string;
    },
  ) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id: dto.adhesionId },
      include: { client: true },
    });
    if (!adhesion) throw new NotFoundException('Adhésion introuvable.');

    // Un client ne peut payer que ses propres dossiers
    if (
      options.requesterRole === 'CLIENT' &&
      adhesion.clientId !== options.requesterClientId
    ) {
      throw new ForbiddenException("Ce dossier ne vous appartient pas.");
    }

    const solde = Number(adhesion.soldeRestant);
    if (dto.montant > solde + 0.5) {
      throw new BadRequestException(
        `Le montant dépasse le solde restant (${solde} FCFA).`,
      );
    }

    const statut = options.statut ?? PaiementStatut.VALIDE;

    return this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          reference: this.genererReference(),
          adhesionId: dto.adhesionId,
          echeanceId: dto.echeanceId,
          montant: dto.montant,
          methode: dto.methode,
          refTransaction: dto.refTransaction,
          statut,
          saisiParId: options.saisiParId,
          commentaire: options.commentaire,
        },
      });

      let facture: Awaited<
        ReturnType<FacturesService['createForPaiement']>
      > | null = null;
      if (statut === PaiementStatut.VALIDE) {
        const recompute = await this.recomputeAdhesion(tx, dto.adhesionId);
        facture = await this.factures.createForPaiement(tx, {
          paiementId: paiement.id,
          montant: dto.montant,
          soldeRestant: recompute.soldeRestant,
        });

        // Notification in-app (email/SMS branchés ultérieurement)
        await tx.notification.create({
          data: {
            userId: adhesion.client.userId,
            type: NotificationType.CONFIRMATION_PAIEMENT,
            canal: NotificationCanal.APP,
            titre: 'Paiement confirmé',
            message: `Votre paiement de ${dto.montant} FCFA a été enregistré. Facture ${facture.numero}.`,
          },
        });

        // Attribution automatique d'une parcelle si le dossier est soldé
        if (recompute.soldeRestant <= 0) {
          await this.attributions.autoAttribuer(tx, dto.adhesionId);
        }
      }

      await tx.activityLog.create({
        data: {
          userId: options.saisiParId ?? adhesion.client.userId,
          action: statut === PaiementStatut.VALIDE ? 'PAIEMENT_VALIDE' : 'PAIEMENT_ENREGISTRE',
          entite: 'Paiement',
          entiteId: paiement.id,
          details: `${dto.montant} FCFA via ${dto.methode}`,
        },
      });

      return { paiement, facture };
    });
  }

  /** Confirme un paiement en attente (comptable) */
  async confirmer(id: string, saisiParId: string) {
    const paiement = await this.prisma.paiement.findUnique({ where: { id } });
    if (!paiement) throw new NotFoundException('Paiement introuvable.');
    if (paiement.statut !== PaiementStatut.EN_ATTENTE) {
      throw new BadRequestException('Seul un paiement en attente peut être confirmé.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id },
        data: { statut: PaiementStatut.VALIDE, saisiParId },
      });
      const recompute = await this.recomputeAdhesion(tx, paiement.adhesionId);
      const facture = await this.factures.createForPaiement(tx, {
        paiementId: id,
        montant: Number(paiement.montant),
        soldeRestant: recompute.soldeRestant,
      });
      if (recompute.soldeRestant <= 0) {
        await this.attributions.autoAttribuer(tx, paiement.adhesionId);
      }
      return { ok: true, facture };
    });
  }

  /** Annule un paiement (comptable) — réajuste l'échéancier */
  async annuler(id: string) {
    return this.changeStatut(id, PaiementStatut.ANNULE, 'ANNULEE');
  }

  /** Rembourse un paiement (comptable) — réajuste l'échéancier */
  async rembourser(id: string) {
    return this.changeStatut(id, PaiementStatut.REMBOURSE, 'ANNULEE');
  }

  private async changeStatut(
    id: string,
    statut: PaiementStatut,
    factureStatut: 'ANNULEE',
  ) {
    const paiement = await this.prisma.paiement.findUnique({
      where: { id },
      include: { facture: true },
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable.');
    if (
      paiement.statut === PaiementStatut.ANNULE ||
      paiement.statut === PaiementStatut.REMBOURSE
    ) {
      throw new BadRequestException('Paiement déjà annulé ou remboursé.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({ where: { id }, data: { statut } });
      if (paiement.facture) {
        await tx.facture.update({
          where: { id: paiement.facture.id },
          data: { statut: factureStatut },
        });
      }
      await this.recomputeAdhesion(tx, paiement.adhesionId);
      return { ok: true };
    });
  }

  findAll(statut?: PaiementStatut) {
    return this.prisma.paiement.findMany({
      where: statut ? { statut } : undefined,
      include: {
        adhesion: {
          include: {
            client: { select: { nom: true, prenom: true } },
            cooperative: { select: { nom: true } },
          },
        },
        facture: { select: { id: true, numero: true } },
      },
      orderBy: { datePaiement: 'desc' },
    });
  }

  findByClient(clientId: string) {
    return this.prisma.paiement.findMany({
      where: { adhesion: { clientId } },
      include: {
        facture: { select: { id: true, numero: true } },
        adhesion: { include: { cooperative: { select: { nom: true } } } },
      },
      orderBy: { datePaiement: 'desc' },
    });
  }
}
