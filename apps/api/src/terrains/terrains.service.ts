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
    const annee = new Date().getFullYear();
    const count = await this.prisma.terrain.count();
    const reference = `TER-${annee}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.terrain.create({ data: { ...dto, reference } });
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

  /** Détail terrain enrichi : modalités, vendeur (annonce ou société), favori */
  async detail(id: string, requesterClientId?: string | null) {
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
    const societe = await this.vendeur.get();

    // Vendeur affiché : contact propre à l'annonce sinon société
    const vendeur = {
      nom: terrain.vendeurNom ?? societe.nom,
      telephone: terrain.vendeurTelephone ?? societe.telephone,
      estAnnonce: !!terrain.vendeurNom,
      societe,
    };

    const [favorisCount, monFavori] = await Promise.all([
      this.prisma.favori.count({ where: { terrainId: id } }),
      requesterClientId
        ? this.prisma.favori.findUnique({
            where: {
              clientId_terrainId: { clientId: requesterClientId, terrainId: id },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...terrain,
      reference: terrain.reference ?? `TER-${terrain.numeroParcelle}`,
      modalites: cooperatives,
      vendeur,
      favorisCount,
      isFavori: !!monFavori,
    };
  }

  /** Ajoute / retire un terrain des favoris du client */
  async toggleFavori(terrainId: string, clientId: string) {
    await this.findOne(terrainId);
    const existing = await this.prisma.favori.findUnique({
      where: { clientId_terrainId: { clientId, terrainId } },
    });
    if (existing) {
      await this.prisma.favori.delete({ where: { id: existing.id } });
      return { isFavori: false };
    }
    await this.prisma.favori.create({ data: { clientId, terrainId } });
    return { isFavori: true };
  }

  /** Demande de visite : notifie les administrateurs */
  async demanderVisite(terrainId: string, clientId: string, message?: string) {
    const terrain = await this.findOne(terrainId);
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'GESTIONNAIRE'] } },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'SYSTEME' as const,
        canal: 'APP' as const,
        titre: 'Demande de visite',
        message: `${client?.prenom ?? ''} ${client?.nom ?? ''} souhaite visiter la parcelle N° ${terrain.numeroParcelle} (${terrain.reference ?? ''}).${message ? ' Message : ' + message : ''}`,
      })),
    });
    return { ok: true };
  }
}
