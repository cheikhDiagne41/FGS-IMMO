import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSiteDto) {
    return this.prisma.site.create({ data: dto });
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
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.site.delete({ where: { id } });
  }
}
