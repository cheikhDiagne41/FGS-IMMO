import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Normalise un nom de région (sans accents, minuscules) pour le relier au tracé cartographique */
const slugRegion = (nom: string) =>
  nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

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

  /** Trophées / distinctions affichés sur l'accueil */
  trophees() {
    return this.prisma.trophee.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Vidéos configurées par l'admin pour le carrousel du hero */
  videosAccueil() {
    return this.prisma.videoAccueil.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Statistiques par région (pour la carte du Sénégal) */
  async regions() {
    const sites = await this.prisma.site.findMany({
      where: { statut: { not: 'CLOTURE' } },
      include: { _count: { select: { cooperatives: true, terrains: true } } },
      orderBy: { nom: 'asc' },
    });

    const parRegion = new Map<
      string,
      {
        region: string;
        slug: string;
        nbSites: number;
        nbTerrains: number;
        nbCooperatives: number;
        sites: { id: string; nom: string; commune: string | null; type: string }[];
      }
    >();

    for (const s of sites) {
      const region = s.region ?? 'Non renseignée';
      const slug = slugRegion(region);
      const entree = parRegion.get(slug) ?? {
        region,
        slug,
        nbSites: 0,
        nbTerrains: 0,
        nbCooperatives: 0,
        sites: [],
      };
      entree.nbSites += 1;
      entree.nbTerrains += s._count.terrains;
      entree.nbCooperatives += s._count.cooperatives;
      entree.sites.push({
        id: s.id,
        nom: s.nom,
        commune: s.commune,
        type: s.type,
      });
      parRegion.set(slug, entree);
    }

    return [...parRegion.values()].sort((a, b) => b.nbTerrains - a.nbTerrains);
  }

  /** Informations de la société (À propos, localisation, réseaux sociaux) */
  async societe() {
    const v = await this.prisma.vendeur.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!v) return null;
    return {
      nom: v.nom,
      raisonSociale: v.raisonSociale,
      slogan: v.slogan,
      description: v.description,
      adresse: v.adresse,
      telephone: v.telephone,
      email: v.email,
      siteWeb: v.siteWeb,
      latitude: v.latitude,
      longitude: v.longitude,
      facebook: v.facebook,
      instagram: v.instagram,
      tiktok: v.tiktok,
    };
  }

  /** Actualités (visites de la semaine) publiées par l'admin */
  actualites() {
    return this.prisma.actualite.findMany({
      include: { medias: true },
      orderBy: { createdAt: 'desc' },
    });
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
