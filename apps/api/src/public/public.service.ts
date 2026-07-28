import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  sites() {
    return this.prisma.site.findMany({
      where: { statut: { not: 'CLOTURE' } },
      include: {
        photos: true,
        _count: { select: { cooperatives: true, terrains: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async site(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        photos: true,
        cooperatives: {
          select: {
            id: true,
            numero: true,
            nom: true,
            montantAcompte: true,
            cotisationMensuelle: true,
            nbMensualites: true,
            fraisAdhesion: true,
            nbMaxAdherents: true,
            responsable: true,
            _count: { select: { adhesions: true } },
          },
        },
        terrains: {
          select: {
            id: true,
            numeroParcelle: true,
            statut: true,
            prix: true,
            superficie: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
    if (!site) throw new NotFoundException('Site introuvable.');
    return site;
  }

  cooperatives() {
    return this.prisma.cooperative.findMany({
      include: {
        site: { select: { id: true, nom: true, commune: true } },
        _count: { select: { adhesions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  terrains() {
    return this.prisma.terrain.findMany({
      include: {
        site: { select: { id: true, nom: true, commune: true, type: true } },
        images: true,
      },
      orderBy: [{ enVedette: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async terrain(id: string) {
    const t = await this.prisma.terrain.findUnique({
      where: { id },
      include: {
        site: true,
        images: true,
      },
    });
    if (!t) throw new NotFoundException('Terrain introuvable.');
    const societe = await this.prisma.vendeur.findFirst();
    return {
      ...t,
      reference: t.reference ?? `TER-${t.numeroParcelle}`,
      vendeur: {
        nom: t.vendeurNom ?? societe?.nom ?? 'FGS_IMMO',
        telephone: t.vendeurTelephone ?? societe?.telephone,
      },
    };
  }

  /** Chiffres clés affichés sur la page d'accueil */
  async stats() {
    const [nbTerrains, nbClients, regions] = await Promise.all([
      this.prisma.terrain.count(),
      this.prisma.client.count(),
      this.prisma.site.findMany({
        where: { region: { not: null } },
        select: { region: true },
        distinct: ['region'],
      }),
    ]);
    return { nbTerrains, nbClients, nbRegions: regions.length };
  }

  /** Points cartographiques : terrains géolocalisés */
  async map() {
    const terrains = await this.prisma.terrain.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        numeroParcelle: true,
        titre: true,
        prix: true,
        statut: true,
        latitude: true,
        longitude: true,
        site: { select: { nom: true } },
      },
    });
    return terrains;
  }
}
