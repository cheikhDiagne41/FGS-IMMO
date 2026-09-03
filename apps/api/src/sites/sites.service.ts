import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SiteType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PerimetreVendeurService } from '../common/perimetre-vendeur.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  constructor(
    private prisma: PrismaService,
    private perimetre: PerimetreVendeurService,
  ) {}

  async create(dto: CreateSiteDto, user?: { userId: string; role: string }) {
    const { cooperative, ...siteData } = dto;
    // Un site créé par un vendeur lui est rattaché : il sera seul à le gérer
    const vendeurId = await this.perimetre.vendeurIdDe(user);
    const type = dto.type ?? SiteType.COOPERATIVE;

    if (type === SiteType.COOPERATIVE && !cooperative) {
      throw new BadRequestException(
        'Un site coopératif nécessite la configuration de sa coopérative (acompte, mensualités…).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({ data: { ...siteData, type, vendeurId } });

      if (type === SiteType.COOPERATIVE && cooperative) {
        await tx.cooperative.create({
          data: {
            numero: cooperative.numero ?? (await this.prochainNumeroCoop(tx)),
            nom: cooperative.nom ?? `Coopérative ${site.nom}`,
            siteId: site.id,
            nbMaxAdherents: cooperative.nbMaxAdherents,
            fraisAdhesion: cooperative.fraisAdhesion ?? 0,
            montantAcompte: cooperative.montantAcompte,
            cotisationMensuelle: cooperative.cotisationMensuelle,
            nbMensualites: cooperative.nbMensualites,
            dureeRemboursement: cooperative.nbMensualites,
            responsable: cooperative.responsable,
            // la coopérative suit le même gestionnaire que son site
            vendeurId,
          },
        });
      }

      return site;
    });
  }

  /** Prochain numéro libre de coopérative (COOP-001), robuste aux suppressions. */
  private async prochainNumeroCoop(tx: {
    cooperative: {
      findMany: (a: unknown) => Promise<{ numero: string }[]>;
    };
  }) {
    const existants = await tx.cooperative.findMany({
      where: { numero: { startsWith: 'COOP-' } },
      select: { numero: true },
    });
    // On ignore les numéros saisis à la main (COOP-DIAMNIADIO…)
    const numeros = existants
      .map((c) => Number(c.numero.slice('COOP-'.length)))
      .filter((n) => Number.isInteger(n));
    const suivant = numeros.length ? Math.max(...numeros) + 1 : 1;
    return `COOP-${String(suivant).padStart(3, '0')}`;
  }

  async findAll(user?: { userId: string; role: string }) {
    return this.prisma.site.findMany({
      where: await this.perimetre.filtre(user),
      include: {
        photos: true,
        _count: { select: { cooperatives: true, terrains: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        photos: true,
        cooperatives: true,
        terrains: true,
      },
    });
    if (!site) throw new NotFoundException('Site introuvable.');
    return site;
  }

  /** Plan des parcelles d'un site : liste numérotée + disponibilité */
  async parcelles(id: string, requesterClientId?: string | null) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        terrains: {
          select: {
            id: true,
            numeroParcelle: true,
            statut: true,
            clientId: true,
          },
        },
      },
    });
    if (!site) throw new NotFoundException('Site introuvable.');

    const parcelles = site.terrains
      .map((t) => ({
        numero: t.numeroParcelle,
        statut: t.statut,
        estAMoi: !!requesterClientId && t.clientId === requesterClientId,
      }))
      .sort((a, b) => Number(a.numero) - Number(b.numero));

    const disponibles = parcelles
      .filter((p) => p.statut === 'DISPONIBLE')
      .map((p) => p.numero);
    const maParcelle = parcelles.find((p) => p.estAMoi)?.numero ?? null;

    return {
      siteId: site.id,
      siteNom: site.nom,
      nbParcelles: site.nbParcelles || parcelles.length,
      totalParcelles: parcelles.length,
      nbDisponibles: disponibles.length,
      nbReserves: parcelles.filter((p) => p.statut === 'RESERVE').length,
      nbVendus: parcelles.filter((p) => p.statut === 'VENDU').length,
      numerosDisponibles: disponibles,
      maParcelle,
      parcelles,
    };
  }

  async update(id: string, dto: UpdateSiteDto, user?: { userId: string; role: string }) {
    const site = await this.findOne(id);
    await this.perimetre.verifierAcces(user, site.vendeurId, 'les sites');
    const { cooperative, ...siteData } = dto;
    return this.prisma.site.update({ where: { id }, data: siteData });
  }

  async remove(id: string, user?: { userId: string; role: string }) {
    const site = await this.findOne(id);
    await this.perimetre.verifierAcces(user, site.vendeurId, 'les sites');
    return this.prisma.site.delete({ where: { id } });
  }

  /** Ajoute des photos à un site */
  async addPhotos(
    id: string,
    files: Array<{ filename: string }>,
  ) {
    await this.findOne(id);
    if (!files?.length) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    await this.prisma.sitePhoto.createMany({
      data: files.map((f) => ({
        siteId: id,
        url: `/uploads/sites/${f.filename}`,
      })),
    });
    return this.findOne(id);
  }

  async removePhoto(photoId: string) {
    const photo = await this.prisma.sitePhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) throw new NotFoundException('Photo introuvable.');
    await this.prisma.sitePhoto.delete({ where: { id: photoId } });
    return { ok: true };
  }
}
