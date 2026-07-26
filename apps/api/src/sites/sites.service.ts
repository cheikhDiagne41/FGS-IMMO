import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SiteType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSiteDto) {
    const { cooperative, ...siteData } = dto;
    const type = dto.type ?? SiteType.COOPERATIVE;

    if (type === SiteType.COOPERATIVE && !cooperative) {
      throw new BadRequestException(
        'Un site coopératif nécessite la configuration de sa coopérative (acompte, mensualités…).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({ data: { ...siteData, type } });

      if (type === SiteType.COOPERATIVE && cooperative) {
        const count = await tx.cooperative.count();
        await tx.cooperative.create({
          data: {
            numero: cooperative.numero ?? `COOP-${String(count + 1).padStart(3, '0')}`,
            nom: cooperative.nom ?? `Coopérative ${site.nom}`,
            siteId: site.id,
            nbMaxAdherents: cooperative.nbMaxAdherents,
            fraisAdhesion: cooperative.fraisAdhesion ?? 0,
            montantAcompte: cooperative.montantAcompte,
            cotisationMensuelle: cooperative.cotisationMensuelle,
            nbMensualites: cooperative.nbMensualites,
            dureeRemboursement: cooperative.nbMensualites,
            responsable: cooperative.responsable,
          },
        });
      }

      return site;
    });
  }

  findAll() {
    return this.prisma.site.findMany({
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

  async update(id: string, dto: UpdateSiteDto) {
    await this.findOne(id);
    const { cooperative, ...siteData } = dto;
    return this.prisma.site.update({ where: { id }, data: siteData });
  }

  async remove(id: string) {
    await this.findOne(id);
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
