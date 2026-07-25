import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TerrainStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VendeurService } from '../vendeur/vendeur.service';
import {
  CreateTerrainDto,
  SearchTerrainDto,
  UpdateTerrainDto,
} from './dto/terrain.dto';

@Injectable()
export class TerrainsService {
  constructor(
    private prisma: PrismaService,
    private vendeur: VendeurService,
  ) {}

  async create(dto: CreateTerrainDto) {
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) throw new BadRequestException('Site introuvable.');
    return this.prisma.terrain.create({ data: dto });
  }

  /** Recherche multicritère */
  search(filters: SearchTerrainDto) {
    const where: Prisma.TerrainWhereInput = {};
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.statut) where.statut = filters.statut;
    if (filters.type) where.type = filters.type;
    if (filters.prixMin || filters.prixMax) {
      where.prix = {};
      if (filters.prixMin) where.prix.gte = filters.prixMin;
      if (filters.prixMax) where.prix.lte = filters.prixMax;
    }
    if (filters.superficieMin || filters.superficieMax) {
      where.superficie = {};
      if (filters.superficieMin) where.superficie.gte = filters.superficieMin;
      if (filters.superficieMax) where.superficie.lte = filters.superficieMax;
    }

    return this.prisma.terrain.findMany({
      where,
      include: {
        site: { select: { id: true, nom: true, commune: true } },
        images: true,
        client: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: [{ statut: 'asc' }, { numeroParcelle: 'asc' }],
    });
  }

  async findOne(id: string) {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      include: { site: true, images: true, client: true },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable.');
    return terrain;
  }

  async update(id: string, dto: UpdateTerrainDto) {
    await this.findOne(id);
    return this.prisma.terrain.update({ where: { id }, data: dto });
  }

  /** Réserve un terrain disponible */
  async reserver(id: string, clientId?: string) {
    const terrain = await this.findOne(id);
    if (terrain.statut !== TerrainStatus.DISPONIBLE) {
      throw new BadRequestException(
        `Ce terrain n'est pas disponible (statut : ${terrain.statut}).`,
      );
    }
    return this.prisma.terrain.update({
      where: { id },
      data: { statut: TerrainStatus.RESERVE, clientId },
    });
  }

  /** Libère un terrain réservé */
  async liberer(id: string) {
    const terrain = await this.findOne(id);
    if (terrain.statut === TerrainStatus.VENDU) {
      throw new BadRequestException('Un terrain vendu ne peut être libéré.');
    }
    return this.prisma.terrain.update({
      where: { id },
      data: { statut: TerrainStatus.DISPONIBLE, clientId: null, adhesionId: null },
    });
  }

  async remove(id: string) {
    const terrain = await this.findOne(id);
    if (terrain.statut === TerrainStatus.VENDU) {
      throw new BadRequestException('Impossible de supprimer un terrain vendu.');
    }
    return this.prisma.terrain.delete({ where: { id } });
  }

  /** Enregistre les médias (images / vidéos) uploadés pour un terrain */
  async addMedia(
    terrainId: string,
    files: Array<{ filename: string; mimetype: string }>,
  ) {
    await this.findOne(terrainId);
    if (!files?.length) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    await this.prisma.terrainImage.createMany({
      data: files.map((f) => ({
        terrainId,
        url: `/uploads/terrains/${f.filename}`,
        mediaType: f.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
      })),
    });
    return this.findOne(terrainId);
  }

  async removeMedia(mediaId: string) {
    const media = await this.prisma.terrainImage.findUnique({
      where: { id: mediaId },
    });
    if (!media) throw new NotFoundException('Média introuvable.');
    await this.prisma.terrainImage.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  /** Détail terrain enrichi des modalités de paiement (coops du site) */
  async detail(id: string) {
    const terrain = await this.findOne(id);
    const cooperatives = await this.prisma.cooperative.findMany({
      where: { siteId: terrain.siteId },
      select: {
        id: true,
        nom: true,
        numero: true,
        montantAcompte: true,
        cotisationMensuelle: true,
        nbMensualites: true,
        fraisAdhesion: true,
        nbMaxAdherents: true,
        _count: { select: { adhesions: true } },
      },
    });
    const vendeur = await this.vendeur.get();
    return { ...terrain, modalites: cooperatives, vendeur };
  }
}
