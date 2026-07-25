import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EcheanceStatus,
  PaiementStatut,
  TerrainStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildExcel,
  buildPdf,
  ReportData,
} from './report-builders';

export type ReportType =
  | 'encaissements'
  | 'clients'
  | 'cooperatives'
  | 'sites'
  | 'retards'
  | 'paiements'
  | 'factures'
  | 'ventes'
  | 'comptabilite';

export interface ReportFilters {
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(f: ReportFilters) {
    const gte = f.from ? new Date(f.from) : undefined;
    const lte = f.to ? new Date(`${f.to}T23:59:59`) : undefined;
    return gte || lte ? { gte, lte } : undefined;
  }

  private n = (v: any) => Number(v) || 0;
  private money = (v: any) =>
    new Intl.NumberFormat('fr-FR').format(Math.round(this.n(v))) + ' FCFA';

  /** Construit la structure de données d'un rapport */
  async buildReportData(
    type: ReportType,
    filters: ReportFilters,
  ): Promise<ReportData> {
    switch (type) {
      case 'encaissements':
        return this.encaissements(filters);
      case 'clients':
        return this.clients();
      case 'cooperatives':
        return this.cooperatives();
      case 'sites':
        return this.sites();
      case 'retards':
        return this.retards();
      case 'paiements':
        return this.paiements(filters);
      case 'factures':
        return this.factures(filters);
      case 'ventes':
        return this.ventes(filters);
      case 'comptabilite':
        return this.comptabilite(filters);
      default:
        throw new BadRequestException('Type de rapport inconnu.');
    }
  }

  async generate(
    type: ReportType,
    format: 'pdf' | 'excel',
    filters: ReportFilters,
  ): Promise<{ buffer: Buffer; filename: string; mime: string }> {
    const data = await this.buildReportData(type, filters);
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'excel') {
      return {
        buffer: await buildExcel(data),
        filename: `FGS_${type}_${stamp}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    return {
      buffer: await buildPdf(data),
      filename: `FGS_${type}_${stamp}.pdf`,
      mime: 'application/pdf',
    };
  }

  // ---- Rapports ----

  private async encaissements(f: ReportFilters): Promise<ReportData> {
    const datePaiement = this.dateRange(f);
    const paiements = await this.prisma.paiement.findMany({
      where: { statut: PaiementStatut.VALIDE, datePaiement },
      include: {
        adhesion: {
          include: {
            client: { select: { nom: true, prenom: true } },
            cooperative: { select: { nom: true } },
          },
        },
      },
      orderBy: { datePaiement: 'desc' },
    });
    const total = paiements.reduce((s, p) => s + this.n(p.montant), 0);
    return {
      titre: 'Rapport des encaissements',
      colonnes: [
        { key: 'date', label: 'Date', format: 'date' },
        { key: 'client', label: 'Client', width: 1.6 },
        { key: 'cooperative', label: 'Coopérative', width: 1.6 },
        { key: 'methode', label: 'Mode' },
        { key: 'reference', label: 'Référence', width: 1.5 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'money', width: 1.3 },
      ],
      lignes: paiements.map((p) => ({
        date: p.datePaiement,
        client: `${p.adhesion.client.prenom} ${p.adhesion.client.nom}`,
        cooperative: p.adhesion.cooperative.nom,
        methode: p.methode.replace('_', ' '),
        reference: p.refTransaction ?? p.reference,
        montant: p.montant,
      })),
      resume: [
        { label: 'Nombre de paiements', value: String(paiements.length) },
        { label: 'Total encaissé', value: this.money(total) },
      ],
    };
  }

  private async clients(): Promise<ReportData> {
    const clients = await this.prisma.client.findMany({
      include: {
        adhesions: { select: { montantPaye: true, soldeRestant: true } },
      },
      orderBy: { nom: 'asc' },
    });
    return {
      titre: 'Rapport des clients',
      colonnes: [
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'telephone', label: 'Téléphone', width: 1.2 },
        { key: 'profession', label: 'Profession', width: 1.2 },
        { key: 'nbAdhesions', label: 'Adhésions', align: 'right' },
        { key: 'totalPaye', label: 'Total payé', align: 'right', format: 'money', width: 1.3 },
      ],
      lignes: clients.map((c) => ({
        nom: c.nom,
        prenom: c.prenom,
        telephone: c.telephone,
        profession: c.profession ?? '—',
        nbAdhesions: c.adhesions.length,
        totalPaye: c.adhesions.reduce((s, a) => s + this.n(a.montantPaye), 0),
      })),
      resume: [{ label: 'Total clients', value: String(clients.length) }],
    };
  }

  private async cooperatives(): Promise<ReportData> {
    const coops = await this.prisma.cooperative.findMany({
      include: {
        site: { select: { nom: true } },
        _count: { select: { adhesions: true } },
      },
      orderBy: { nom: 'asc' },
    });
    return {
      titre: 'Rapport des coopératives',
      colonnes: [
        { key: 'numero', label: 'N°' },
        { key: 'nom', label: 'Nom', width: 1.8 },
        { key: 'site', label: 'Site', width: 1.5 },
        { key: 'adherents', label: 'Adhérents', align: 'right' },
        { key: 'max', label: 'Max', align: 'right' },
        { key: 'cotisation', label: 'Cotisation', align: 'right', format: 'money', width: 1.3 },
        { key: 'statut', label: 'Statut' },
      ],
      lignes: coops.map((c) => ({
        numero: c.numero,
        nom: c.nom,
        site: c.site.nom,
        adherents: c._count.adhesions,
        max: c.nbMaxAdherents,
        cotisation: c.cotisationMensuelle,
        statut: c.statut,
      })),
      resume: [{ label: 'Total coopératives', value: String(coops.length) }],
    };
  }

  private async sites(): Promise<ReportData> {
    const sites = await this.prisma.site.findMany({
      include: {
        _count: { select: { cooperatives: true, terrains: true } },
        terrains: { select: { statut: true } },
      },
      orderBy: { nom: 'asc' },
    });
    return {
      titre: 'Rapport des sites',
      colonnes: [
        { key: 'code', label: 'Code' },
        { key: 'nom', label: 'Nom', width: 1.8 },
        { key: 'region', label: 'Région', width: 1.2 },
        { key: 'parcelles', label: 'Parcelles', align: 'right' },
        { key: 'dispo', label: 'Disponibles', align: 'right' },
        { key: 'vendus', label: 'Vendus', align: 'right' },
        { key: 'coops', label: 'Coops', align: 'right' },
        { key: 'statut', label: 'Statut', width: 1.3 },
      ],
      lignes: sites.map((s) => ({
        code: s.code,
        nom: s.nom,
        region: s.region ?? '—',
        parcelles: s.nbParcelles,
        dispo: s.terrains.filter((t) => t.statut === TerrainStatus.DISPONIBLE).length,
        vendus: s.terrains.filter((t) => t.statut === TerrainStatus.VENDU).length,
        coops: s._count.cooperatives,
        statut: s.statut.replace('_', ' '),
      })),
      resume: [{ label: 'Total sites', value: String(sites.length) }],
    };
  }

  private async retards(): Promise<ReportData> {
    const echeances = await this.prisma.echeance.findMany({
      where: { statut: EcheanceStatus.EN_RETARD },
      include: {
        adhesion: {
          include: {
            client: { select: { nom: true, prenom: true, telephone: true } },
            cooperative: { select: { nom: true } },
          },
        },
      },
      orderBy: { dateEcheance: 'asc' },
    });
    const now = Date.now();
    const total = echeances.reduce(
      (s, e) => s + (this.n(e.montantDu) - this.n(e.montantPaye)),
      0,
    );
    return {
      titre: 'Rapport des retards de paiement',
      colonnes: [
        { key: 'client', label: 'Client', width: 1.5 },
        { key: 'telephone', label: 'Téléphone', width: 1.2 },
        { key: 'dossier', label: 'Dossier', width: 1.3 },
        { key: 'libelle', label: 'Échéance', width: 1.6 },
        { key: 'echeance', label: 'Date due', format: 'date' },
        { key: 'jours', label: 'Jours retard', align: 'right' },
        { key: 'reste', label: 'Reste dû', align: 'right', format: 'money', width: 1.3 },
      ],
      lignes: echeances.map((e) => ({
        client: `${e.adhesion.client.prenom} ${e.adhesion.client.nom}`,
        telephone: e.adhesion.client.telephone,
        dossier: e.adhesion.numeroDossier,
        libelle: e.libelle,
        echeance: e.dateEcheance,
        jours: Math.floor((now - new Date(e.dateEcheance).getTime()) / 86400000),
        reste: this.n(e.montantDu) - this.n(e.montantPaye),
      })),
      resume: [
        { label: 'Échéances en retard', value: String(echeances.length) },
        { label: 'Montant total en retard', value: this.money(total) },
      ],
    };
  }

  private async paiements(f: ReportFilters): Promise<ReportData> {
    const datePaiement = this.dateRange(f);
    const paiements = await this.prisma.paiement.findMany({
      where: { datePaiement },
      include: {
        adhesion: {
          include: { client: { select: { nom: true, prenom: true } } },
        },
        facture: { select: { numero: true } },
      },
      orderBy: { datePaiement: 'desc' },
    });
    return {
      titre: 'Rapport des paiements',
      colonnes: [
        { key: 'date', label: 'Date', format: 'date' },
        { key: 'client', label: 'Client', width: 1.6 },
        { key: 'methode', label: 'Mode' },
        { key: 'montant', label: 'Montant', align: 'right', format: 'money', width: 1.3 },
        { key: 'statut', label: 'Statut' },
        { key: 'facture', label: 'Facture', width: 1.2 },
      ],
      lignes: paiements.map((p) => ({
        date: p.datePaiement,
        client: `${p.adhesion.client.prenom} ${p.adhesion.client.nom}`,
        methode: p.methode.replace('_', ' '),
        montant: p.montant,
        statut: p.statut,
        facture: p.facture?.numero ?? '—',
      })),
      resume: [{ label: 'Total paiements', value: String(paiements.length) }],
    };
  }

  private async factures(f: ReportFilters): Promise<ReportData> {
    const dateEmission = this.dateRange(f);
    const factures = await this.prisma.facture.findMany({
      where: { dateEmission },
      include: {
        paiement: {
          include: {
            adhesion: {
              include: { client: { select: { nom: true, prenom: true } } },
            },
          },
        },
      },
      orderBy: { dateEmission: 'desc' },
    });
    const total = factures.reduce((s, ff) => s + this.n(ff.montant), 0);
    return {
      titre: 'Rapport des factures',
      colonnes: [
        { key: 'numero', label: 'N° Facture', width: 1.3 },
        { key: 'date', label: 'Date', format: 'date' },
        { key: 'client', label: 'Client', width: 1.6 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'money', width: 1.3 },
        { key: 'statut', label: 'Statut' },
      ],
      lignes: factures.map((ff) => ({
        numero: ff.numero,
        date: ff.dateEmission,
        client: `${ff.paiement.adhesion.client.prenom} ${ff.paiement.adhesion.client.nom}`,
        montant: ff.montant,
        statut: ff.statut,
      })),
      resume: [
        { label: 'Nombre de factures', value: String(factures.length) },
        { label: 'Montant total facturé', value: this.money(total) },
      ],
    };
  }

  private async ventes(f: ReportFilters): Promise<ReportData> {
    const dateAttribution = this.dateRange(f);
    const terrains = await this.prisma.terrain.findMany({
      where: { statut: TerrainStatus.VENDU, dateAttribution },
      include: {
        site: { select: { nom: true } },
        client: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateAttribution: 'desc' },
    });
    const total = terrains.reduce((s, t) => s + this.n(t.prix), 0);
    return {
      titre: 'Rapport des ventes de terrains',
      colonnes: [
        { key: 'date', label: 'Date attribution', format: 'date', width: 1.2 },
        { key: 'parcelle', label: 'Parcelle' },
        { key: 'site', label: 'Site', width: 1.5 },
        { key: 'client', label: 'Acquéreur', width: 1.6 },
        { key: 'superficie', label: 'Superficie (m²)', align: 'right' },
        { key: 'prix', label: 'Prix', align: 'right', format: 'money', width: 1.3 },
      ],
      lignes: terrains.map((t) => ({
        date: t.dateAttribution,
        parcelle: t.numeroParcelle,
        site: t.site.nom,
        client: t.client ? `${t.client.prenom} ${t.client.nom}` : '—',
        superficie: this.n(t.superficie),
        prix: t.prix,
      })),
      resume: [
        { label: 'Terrains vendus', value: String(terrains.length) },
        { label: 'Chiffre d\'affaires', value: this.money(total) },
      ],
    };
  }

  private async comptabilite(f: ReportFilters): Promise<ReportData> {
    const datePaiement = this.dateRange(f);
    const paiements = await this.prisma.paiement.findMany({
      where: { statut: PaiementStatut.VALIDE, datePaiement },
      select: { montant: true, methode: true, datePaiement: true },
    });
    // Agrégation par mois
    const parMois: Record<string, number> = {};
    const parMethode: Record<string, number> = {};
    let total = 0;
    for (const p of paiements) {
      const m = new Date(p.datePaiement).toISOString().slice(0, 7);
      parMois[m] = (parMois[m] ?? 0) + this.n(p.montant);
      parMethode[p.methode] = (parMethode[p.methode] ?? 0) + this.n(p.montant);
      total += this.n(p.montant);
    }
    // Reste à encaisser global
    const adhesions = await this.prisma.adhesion.aggregate({
      _sum: { soldeRestant: true },
    });
    const resteAEncaisser = this.n(adhesions._sum.soldeRestant);

    const lignes = Object.entries(parMois)
      .sort()
      .map(([mois, montant]) => ({
        mois,
        encaisse: montant,
      }));

    return {
      titre: 'Rapport comptable (synthèse)',
      colonnes: [
        { key: 'mois', label: 'Mois' },
        { key: 'encaisse', label: 'Encaissé', align: 'right', format: 'money', width: 1.5 },
      ],
      lignes,
      resume: [
        { label: 'Total encaissé', value: this.money(total) },
        ...Object.entries(parMethode).map(([m, v]) => ({
          label: m.replace('_', ' '),
          value: this.money(v),
        })),
        { label: 'Reste à encaisser', value: this.money(resteAEncaisser) },
      ],
    };
  }
}
