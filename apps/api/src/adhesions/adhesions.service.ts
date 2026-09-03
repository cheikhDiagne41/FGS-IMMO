import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdhesionStatus,
  DocumentType,
  EcheanceStatus,
  EcheanceType,
  PieceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PerimetreVendeurService } from '../common/perimetre-vendeur.service';

export interface PieceIdentite {
  pieceType: PieceType;
  pieceNumero: string;
  documents: { type: DocumentType; nom: string; url: string }[];
}

interface EcheancePlan {
  numero: number;
  type: EcheanceType;
  libelle: string;
  montantDu: number;
  dateEcheance: Date;
}

@Injectable()
export class AdhesionsService {
  constructor(
    private prisma: PrismaService,
    private perimetre: PerimetreVendeurService,
  ) {}

  /**
   * Construit le plan d'échéancier à partir des paramètres d'une coopérative.
   * Ordre : frais d'adhésion → acompte → cotisations mensuelles.
   */
  private buildEcheancier(
    coop: {
      fraisAdhesion: Prisma.Decimal;
      montantAcompte: Prisma.Decimal;
      cotisationMensuelle: Prisma.Decimal;
      nbMensualites: number;
    },
    dateAdhesion: Date,
  ): { plan: EcheancePlan[]; montantTotal: number } {
    const frais = Number(coop.fraisAdhesion);
    const acompte = Number(coop.montantAcompte);
    const cotisation = Number(coop.cotisationMensuelle);
    const plan: EcheancePlan[] = [];
    let numero = 1;

    if (frais > 0) {
      plan.push({
        numero: numero++,
        type: EcheanceType.ADHESION,
        libelle: "Frais d'adhésion",
        montantDu: frais,
        dateEcheance: dateAdhesion,
      });
    }

    plan.push({
      numero: numero++,
      type: EcheanceType.ACOMPTE,
      libelle: 'Acompte obligatoire',
      montantDu: acompte,
      dateEcheance: dateAdhesion,
    });

    for (let i = 1; i <= coop.nbMensualites; i++) {
      const d = new Date(dateAdhesion);
      d.setMonth(d.getMonth() + i);
      plan.push({
        numero: numero++,
        type: EcheanceType.COTISATION,
        libelle: `Cotisation mensuelle ${i}/${coop.nbMensualites}`,
        montantDu: cotisation,
        dateEcheance: d,
      });
    }

    const montantTotal = frais + acompte + cotisation * coop.nbMensualites;
    return { plan, montantTotal };
  }

  /** Aperçu affiché au client avant validation de l'adhésion */
  async preview(cooperativeId: string) {
    const coop = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      include: {
        site: { select: { nom: true, commune: true } },
        _count: { select: { adhesions: true } },
      },
    });
    if (!coop) throw new NotFoundException('Coopérative introuvable.');

    const { montantTotal } = this.buildEcheancier(coop, new Date());
    const placesRestantes = coop.nbMaxAdherents - coop._count.adhesions;

    return {
      cooperativeId: coop.id,
      site: coop.site.nom,
      commune: coop.site.commune,
      cooperative: coop.nom,
      fraisAdhesion: Number(coop.fraisAdhesion),
      montantAcompte: Number(coop.montantAcompte),
      cotisationMensuelle: Number(coop.cotisationMensuelle),
      nbMensualites: coop.nbMensualites,
      montantTotal,
      placesRestantes,
      complete: placesRestantes <= 0,
    };
  }

  private async genererNumeroDossier(): Promise<string> {
    const annee = new Date().getFullYear();
    const count = await this.prisma.adhesion.count();
    return `ADH-${annee}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Crée l'adhésion : dossier + échéancier + compte coopérateur,
   * le tout dans une transaction (tout ou rien).
   */
  async create(
    clientId: string,
    cooperativeId: string,
    piece?: PieceIdentite,
  ) {
    const coop = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      include: { _count: { select: { adhesions: true } } },
    });
    if (!coop) throw new NotFoundException('Coopérative introuvable.');

    // Contrôle : place disponible
    if (coop._count.adhesions >= coop.nbMaxAdherents) {
      throw new BadRequestException('Cette coopérative est complète.');
    }

    // Contrôle : le client n'est pas déjà adhérent de cette coopérative
    const existante = await this.prisma.adhesion.findUnique({
      where: { clientId_cooperativeId: { clientId, cooperativeId } },
    });
    if (existante) {
      throw new BadRequestException(
        'Vous êtes déjà adhérent de cette coopérative.',
      );
    }

    const dateAdhesion = new Date();
    const { plan, montantTotal } = this.buildEcheancier(coop, dateAdhesion);
    const numeroDossier = await this.genererNumeroDossier();

    return this.prisma.$transaction(async (tx) => {
      const adhesion = await tx.adhesion.create({
        data: {
          numeroDossier,
          clientId,
          cooperativeId,
          dateAdhesion,
          montantTotal,
          montantPaye: 0,
          soldeRestant: montantTotal,
          progression: 0,
          statut: AdhesionStatus.EN_ATTENTE,
          pieceType: piece?.pieceType,
          pieceNumero: piece?.pieceNumero,
          echeances: {
            create: plan.map((e) => ({
              numero: e.numero,
              type: e.type,
              libelle: e.libelle,
              montantDu: e.montantDu,
              dateEcheance: e.dateEcheance,
              statut: EcheanceStatus.EN_ATTENTE,
            })),
          },
        },
        include: {
          echeances: { orderBy: { numero: 'asc' } },
          cooperative: { include: { site: true } },
        },
      });

      // Marque la coopérative comme complète si plus de place
      if (coop._count.adhesions + 1 >= coop.nbMaxAdherents) {
        await tx.cooperative.update({
          where: { id: cooperativeId },
          data: { statut: 'COMPLETE' },
        });
      }

      // Pièce d'identité : documents + mise à jour du profil client
      if (piece) {
        await tx.document.createMany({
          data: piece.documents.map((d) => ({
            clientId,
            adhesionId: adhesion.id,
            type: d.type,
            nom: d.nom,
            url: d.url,
          })),
        });
        if (piece.pieceType === PieceType.PASSEPORT) {
          await tx.client.update({
            where: { id: clientId },
            data: { passeport: piece.pieceNumero },
          });
        } else if (piece.pieceType === PieceType.CNI) {
          await tx.client.update({
            where: { id: clientId },
            data: { cin: piece.pieceNumero },
          });
        }
      }

      const client = await tx.client.findUnique({ where: { id: clientId } });

      // Notifie les admins/gestionnaires de la nouvelle demande à valider
      const gestionnaires = await tx.user.findMany({
        where: { role: { in: ['ADMIN', 'GESTIONNAIRE'] } },
        select: { id: true },
      });
      await tx.notification.createMany({
        data: gestionnaires.map((g) => ({
          userId: g.id,
          type: 'SYSTEME' as const,
          canal: 'APP' as const,
          titre: "Nouvelle demande d'adhésion",
          message: `${client?.prenom ?? ''} ${client?.nom ?? ''} demande à rejoindre ${coop.nom} (dossier ${numeroDossier}). Pièce ${piece?.pieceType ?? '—'} fournie.`,
        })),
      });

      // Confirmation au client : demande reçue, en attente de validation
      if (client) {
        await tx.notification.create({
          data: {
            userId: client.userId,
            type: 'SYSTEME' as const,
            canal: 'APP' as const,
            titre: 'Demande enregistrée',
            message: `Votre demande d'adhésion à ${coop.nom} a bien été reçue. Elle est en attente de validation par nos services.`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: client?.userId,
          action: 'ADHESION_DEMANDE',
          entite: 'Adhesion',
          entiteId: adhesion.id,
          details: `Demande ${numeroDossier} — ${coop.nom}`,
        },
      });

      return adhesion;
    });
  }

  /** Demandes d'adhésion en attente de validation (admin/gestionnaire) */
  findDemandes() {
    return this.prisma.adhesion.findMany({
      where: { statut: AdhesionStatus.EN_ATTENTE },
      include: {
        client: true,
        cooperative: { select: { nom: true, site: { select: { nom: true } } } },
        documents: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Valide une demande : le dossier est affecté au compte du client */
  async valider(id: string) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id },
      include: { client: true, cooperative: true },
    });
    if (!adhesion) throw new NotFoundException('Demande introuvable.');
    if (adhesion.statut !== AdhesionStatus.EN_ATTENTE) {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.adhesion.update({
        where: { id },
        data: { statut: AdhesionStatus.EN_COURS },
      });
      await tx.notification.create({
        data: {
          userId: adhesion.client.userId,
          type: 'SYSTEME',
          canal: 'APP',
          titre: 'Dossier validé 🎉',
          message: `Votre adhésion à ${adhesion.cooperative.nom} est validée. Votre dossier ${adhesion.numeroDossier} et votre échéancier sont maintenant disponibles dans votre compte. Vous pouvez régler votre acompte.`,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: adhesion.client.userId,
          action: 'ADHESION_VALIDEE',
          entite: 'Adhesion',
          entiteId: id,
          details: `Dossier ${adhesion.numeroDossier} affecté`,
        },
      });
      return updated;
    });
  }

  /** Rejette une demande en attente : la place est libérée */
  async rejeter(id: string, motif?: string) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id },
      include: { client: true, cooperative: true },
    });
    if (!adhesion) throw new NotFoundException('Demande introuvable.');
    if (adhesion.statut !== AdhesionStatus.EN_ATTENTE) {
      throw new BadRequestException('Seule une demande en attente peut être rejetée.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: adhesion.client.userId,
          type: 'SYSTEME',
          canal: 'APP',
          titre: "Demande d'adhésion refusée",
          message: `Votre demande d'adhésion à ${adhesion.cooperative.nom} n'a pas été retenue.${motif ? ' Motif : ' + motif : ''}`,
        },
      });
      // Supprime la demande (libère la place ; échéances et documents en cascade)
      await tx.adhesion.delete({ where: { id } });
      // Réouvre la coopérative si elle était marquée complète
      if (adhesion.cooperative.statut === 'COMPLETE') {
        await tx.cooperative.update({
          where: { id: adhesion.cooperativeId },
          data: { statut: 'ACTIVE' },
        });
      }
      return { ok: true };
    });
  }

  /** Liste paginée des dossiers d'adhésion. */
  async findAll(
    take = 50,
    skip = 0,
    user?: { userId: string; role: string },
  ) {
    const limite = Math.min(Math.max(take, 1), 200);
    const depart = Math.max(skip, 0);

    // Un vendeur ne suit que les adhésions de ses propres coopératives
    const vendeurId = await this.perimetre.vendeurIdDe(user);
    const where: Prisma.AdhesionWhereInput = vendeurId
      ? { cooperative: { vendeurId } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.adhesion.findMany({
        where,
        include: {
          client: { select: { id: true, nom: true, prenom: true } },
          cooperative: {
            select: {
              id: true,
              numero: true,
              nom: true,
              cotisationMensuelle: true,
              site: { select: { nom: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limite,
        skip: depart,
      }),
      this.prisma.adhesion.count({ where }),
    ]);

    return { items, total, take: limite, skip: depart };
  }

  async findOne(
    id: string,
    requester?: { userId?: string; clientId?: string | null; role: string },
  ) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id },
      include: {
        client: true,
        cooperative: { include: { site: true } },
        echeances: { orderBy: { numero: 'asc' } },
        paiements: {
          orderBy: { datePaiement: 'desc' },
          include: { facture: { select: { id: true, numero: true } } },
        },
        terrain: true,
        documents: true,
      },
    });
    if (!adhesion) throw new NotFoundException('Adhésion introuvable.');

    // Un client ne peut consulter que ses propres dossiers
    if (
      requester?.role === 'CLIENT' &&
      adhesion.clientId !== requester.clientId
    ) {
      throw new ForbiddenException("Accès refusé à ce dossier.");
    }

    // Un vendeur ne consulte que les dossiers de ses coopératives
    if (requester?.role === 'VENDEUR' && requester.userId) {
      await this.perimetre.verifierAcces(
        { userId: requester.userId, role: requester.role },
        adhesion.cooperative.vendeurId,
        'les dossiers des coopératives',
      );
    }
    return adhesion;
  }

  findByClient(clientId: string) {
    return this.prisma.adhesion.findMany({
      where: { clientId },
      include: {
        cooperative: { include: { site: true } },
        echeances: { orderBy: { numero: 'asc' } },
        terrain: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
