import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PerimetreVendeurService } from '../common/perimetre-vendeur.service';
import {
  CreateCooperativeDto,
  UpdateCooperativeDto,
} from './dto/cooperative.dto';

@Injectable()
export class CooperativesService {
  constructor(
    private prisma: PrismaService,
    private perimetre: PerimetreVendeurService,
  ) {}

  async create(dto: CreateCooperativeDto, user?: { userId: string; role: string }) {
    // Contrainte métier : la coopérative doit être rattachée à un site existant
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new BadRequestException(
        "Impossible de créer une coopérative : le site indiqué n'existe pas.",
      );
    }

    if (dto.dureeRemboursement && dto.dureeRemboursement < dto.nbMensualites) {
      throw new BadRequestException(
        'La durée de remboursement doit couvrir le nombre de mensualités.',
      );
    }

    // Un vendeur ne peut créer une coopérative que sur un site qu'il gère
    await this.perimetre.verifierAcces(user, site.vendeurId, 'les sites');

    // Une coopérative créée par un vendeur lui est rattachée
    const vendeurId = await this.perimetre.vendeurIdDe(user);
    return this.prisma.cooperative.create({ data: { ...dto, vendeurId } });
  }

  async findAll(siteId?: string, user?: { userId: string; role: string }) {
    return this.prisma.cooperative.findMany({
      where: { ...(siteId ? { siteId } : {}), ...(await this.perimetre.filtre(user)) },
      include: {
        site: {
          select: {
            id: true,
            nom: true,
            code: true,
            commune: true,
            gerantNom: true,
            gerantTelephone: true,
          },
        },
        vendeur: { select: { id: true, nom: true } },
        _count: { select: { adhesions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coop = await this.prisma.cooperative.findUnique({
      where: { id },
      include: {
        site: true,
        _count: { select: { adhesions: true } },
      },
    });
    if (!coop) throw new NotFoundException('Coopérative introuvable.');

    const placesRestantes = coop.nbMaxAdherents - coop._count.adhesions;
    return { ...coop, placesRestantes };
  }

  async update(id: string, dto: UpdateCooperativeDto, user?: { userId: string; role: string }) {
    const existante = await this.findOne(id);
    await this.perimetre.verifierAcces(user, existante.vendeurId, 'les coopératives');
    if (dto.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) throw new BadRequestException('Site cible introuvable.');
      await this.perimetre.verifierAcces(user, site.vendeurId, 'les sites');
    }
    return this.prisma.cooperative.update({ where: { id }, data: dto });
  }

  async remove(id: string, user?: { userId: string; role: string }) {
    const coop = await this.prisma.cooperative.findUnique({
      where: { id },
      include: { _count: { select: { adhesions: true } } },
    });
    if (!coop) throw new NotFoundException('Coopérative introuvable.');
    await this.perimetre.verifierAcces(user, coop.vendeurId, 'les coopératives');
    if (coop._count.adhesions > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une coopérative ayant des adhérents.',
      );
    }
    return this.prisma.cooperative.delete({ where: { id } });
  }

  /** Vérifie la disponibilité (place restante) d'une coopérative */
  async checkDisponibilite(id: string) {
    const coop = await this.findOne(id);
    return {
      cooperativeId: coop.id,
      nbMaxAdherents: coop.nbMaxAdherents,
      adherents: coop._count.adhesions,
      placesRestantes: coop.placesRestantes,
      complete: coop.placesRestantes <= 0,
    };
  }
}
