import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TerrainStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VendeurService } from '../vendeur/vendeur.service';
import { PerimetreVendeurService } from '../common/perimetre-vendeur.service';
import { ParametresService } from '../parametres/parametres.service';
import { supprimerFichiers } from '../common/upload.util';
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
    private perimetre: PerimetreVendeurService,
    private parametres: ParametresService,
  ) {}

  async create(dto: CreateTerrainDto, user?: { userId: string; role: string }) {
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) throw new BadRequestException('Site introuvable.');
    // Un vendeur ne peut ajouter un terrain que sur un site qu'il gère
    await this.perimetre.verifierAcces(user, site.vendeurId, 'les sites');
    // Un terrain créé par un vendeur lui est rattaché
    const proprietaire = await this.perimetre.vendeurIdDe(user);

    // La référence suit le dernier numéro de l'année : robuste aux
    // suppressions et aux créations simultanées (nouvel essai si collision).
    for (let essai = 0; essai < 5; essai++) {
      const reference = await this.prochaineReference();
      try {
        return await this.prisma.terrain.create({
          data: { ...dto, reference, vendeurId: proprietaire ?? dto.vendeurId },
        });
      } catch (e) {
        const collision =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002';
        if (!collision) throw e;
      }
    }
    throw new BadRequestException(
      'Impossible de générer une référence de terrain, réessayez.',
    );
  }

  /** Prochaine référence disponible pour l'année en cours (TER-AAAA-00001). */
  private async prochaineReference() {
    const annee = new Date().getFullYear();
    const prefixe = `TER-${annee}-`;
    const dernier = await this.prisma.terrain.findFirst({
      where: { reference: { startsWith: prefixe } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });
    const numero = dernier?.reference
      ? Number(dernier.reference.slice(prefixe.length)) + 1
      : 1;
    return `${prefixe}${String(numero).padStart(5, '0')}`;
  }

  /** Recherche multicritère */
  async search(filters: SearchTerrainDto, user?: { userId: string; role: string }) {
    const where: Prisma.TerrainWhereInput = await this.perimetre.filtre(user);
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
        vendeurRef: { select: { id: true, nom: true } },
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

  async update(id: string, dto: UpdateTerrainDto, user?: { userId: string; role: string }) {
    const existant = await this.findOne(id);
    await this.perimetre.verifierAcces(user, existant.vendeurId, 'les terrains');
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

  async remove(id: string, user?: { userId: string; role: string }) {
    const terrain = await this.findOne(id);
    await this.perimetre.verifierAcces(user, terrain.vendeurId, 'les terrains');
    if (terrain.statut === TerrainStatus.VENDU) {
      throw new BadRequestException('Impossible de supprimer un terrain vendu.');
    }
    return this.prisma.terrain.delete({ where: { id } });
  }

  /** Enregistre les médias (images / vidéos) uploadés pour un terrain */
  async addMedia(
    terrainId: string,
    files: Array<{ filename: string; mimetype: string }>,
    user?: { userId: string; role: string },
  ) {
    const terrain = await this.findOne(terrainId);
    try {
      await this.perimetre.verifierAcces(user, terrain.vendeurId, 'les terrains');
    } catch (e) {
      // l'upload a déjà écrit les fichiers : on ne laisse rien traîner
      supprimerFichiers('uploads/terrains', files);
      throw e;
    }
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

  async removeMedia(mediaId: string, user?: { userId: string; role: string }) {
    const media = await this.prisma.terrainImage.findUnique({
      where: { id: mediaId },
      include: { terrain: { select: { vendeurId: true } } },
    });
    if (!media) throw new NotFoundException('Média introuvable.');
    await this.perimetre.verifierAcces(
      user,
      media.terrain.vendeurId,
      'les terrains',
    );
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
    if (!(await this.parametres.actif('demande_visite_active', true))) {
      throw new ForbiddenException(
        'Les demandes de visite en ligne sont désactivées pour le moment.',
      );
    }
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
