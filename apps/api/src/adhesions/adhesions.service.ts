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
  constructor(private prisma: PrismaService) {}

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
          statut: AdhesionStatus.EN_COURS,
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

      // Journal d'activité
      const client = await tx.client.findUnique({ where: { id: clientId } });
      await tx.activityLog.create({
        data: {
          userId: client?.userId,
          action: 'ADHESION_CREEE',
          entite: 'Adhesion',
          entiteId: adhesion.id,
          details: `Dossier ${numeroDossier} — ${coop.nom}`,
        },
      });

      return adhesion;
    });
  }

  findAll() {
    return this.prisma.adhesion.findMany({
      include: {
        client: { select: { id: true, nom: true, prenom: true } },
        cooperative: { select: { nom: true, site: { select: { nom: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requester?: { clientId?: string | null; role: string }) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id },
      include: {
        client: true,
        cooperative: { include: { site: true } },
        echeances: { orderBy: { numero: 'asc' } },
        paiements: { orderBy: { datePaiement: 'desc' } },
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
