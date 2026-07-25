import { Injectable } from '@nestjs/common';
import {
  AdhesionStatus,
  EcheanceStatus,
  PaiementStatut,
  Role,
  TerrainStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** Statistiques globales pour le tableau de bord Administrateur */
  async adminStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfMonthLast30 = new Date();
    startOfMonthLast30.setDate(startOfMonthLast30.getDate() - 30);

    const [
      totalClients,
      totalCooperatives,
      totalSites,
      terrainsDisponibles,
      terrainsVendus,
      encaissementsAgg,
      paiementsMoisAgg,
      echeancesEnRetard,
      nouveauxInscrits,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.cooperative.count(),
      this.prisma.site.count(),
      this.prisma.terrain.count({ where: { statut: TerrainStatus.DISPONIBLE } }),
      this.prisma.terrain.count({ where: { statut: TerrainStatus.VENDU } }),
      this.prisma.paiement.aggregate({
        _sum: { montant: true },
        where: { statut: PaiementStatut.VALIDE },
      }),
      this.prisma.paiement.aggregate({
        _sum: { montant: true },
        where: {
          statut: PaiementStatut.VALIDE,
          datePaiement: { gte: startOfMonth },
        },
      }),
      this.prisma.echeance.count({
        where: { statut: EcheanceStatus.EN_RETARD },
      }),
      this.prisma.user.count({
        where: { role: Role.CLIENT, createdAt: { gte: startOfMonthLast30 } },
      }),
    ]);

    return {
      totalClients,
      totalCooperatives,
      totalSites,
      terrainsDisponibles,
      terrainsVendus,
      totalEncaissements: Number(encaissementsAgg._sum.montant ?? 0),
      paiementsDuMois: Number(paiementsMoisAgg._sum.montant ?? 0),
      paiementsEnRetard: echeancesEnRetard,
      nouveauxInscrits,
    };
  }

  /** Ventes (terrains vendus) par mois sur les 12 derniers mois */
  async ventesParMois() {
    const rows = await this.prisma.$queryRaw<
      { mois: Date; total: bigint }[]
    >`
      SELECT date_trunc('month', "dateAttribution") AS mois, COUNT(*)::bigint AS total
      FROM "terrains"
      WHERE "statut" = 'VENDU' AND "dateAttribution" IS NOT NULL
        AND "dateAttribution" >= (CURRENT_DATE - INTERVAL '12 months')
      GROUP BY 1 ORDER BY 1
    `;
    return rows.map((r) => ({
      mois: r.mois,
      total: Number(r.total),
    }));
  }

  /** Cotisations encaissées par mois sur les 12 derniers mois */
  async cotisationsParMois() {
    const rows = await this.prisma.$queryRaw<
      { mois: Date; total: number }[]
    >`
      SELECT date_trunc('month', "datePaiement") AS mois, COALESCE(SUM("montant"),0) AS total
      FROM "paiements"
      WHERE "statut" = 'VALIDE'
        AND "datePaiement" >= (CURRENT_DATE - INTERVAL '12 months')
      GROUP BY 1 ORDER BY 1
    `;
    return rows.map((r) => ({ mois: r.mois, total: Number(r.total) }));
  }

  /** Tableau de bord d'un client : progression, soldes, prochaine échéance */
  async clientDashboard(clientId: string) {
    const adhesions = await this.prisma.adhesion.findMany({
      where: { clientId },
      include: {
        cooperative: { include: { site: true } },
        terrain: true,
        echeances: {
          where: { statut: { in: [EcheanceStatus.EN_ATTENTE, EcheanceStatus.EN_RETARD, EcheanceStatus.PARTIELLE] } },
          orderBy: { dateEcheance: 'asc' },
          take: 1,
        },
      },
    });

    return adhesions.map((a) => ({
      adhesionId: a.id,
      numeroDossier: a.numeroDossier,
      site: a.cooperative.site.nom,
      cooperative: a.cooperative.nom,
      montantTotal: Number(a.montantTotal),
      montantPaye: Number(a.montantPaye),
      soldeRestant: Number(a.soldeRestant),
      progression: a.progression,
      statut: a.statut,
      terrain: a.terrain
        ? { numeroParcelle: a.terrain.numeroParcelle, statut: a.terrain.statut }
        : null,
      prochaineEcheance: a.echeances[0]
        ? {
            libelle: a.echeances[0].libelle,
            montant: Number(a.echeances[0].montantDu),
            date: a.echeances[0].dateEcheance,
            enRetard: a.echeances[0].statut === EcheanceStatus.EN_RETARD,
          }
        : null,
    }));
  }
}
