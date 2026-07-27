import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, Vendeur } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVendeurDto } from './dto/vendeur.dto';

@Injectable()
export class VendeurService {
  constructor(private prisma: PrismaService) {}

  /** Crée / relie un compte de connexion VENDEUR (email + mot de passe) */
  private async provisionUser(
    vendeurId: string,
    email: string | undefined,
    motDePasse: string | undefined,
    userId: string | null,
  ): Promise<string | null> {
    if (!motDePasse) return userId; // rien à faire
    if (!email) {
      throw new BadRequestException(
        'Un email est requis pour créer le compte de connexion du vendeur.',
      );
    }
    const passwordHash = await bcrypt.hash(motDePasse, 10);
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email, passwordHash, role: Role.VENDEUR },
      });
      return userId;
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Cet email est déjà utilisé par un compte.');
    }
    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: Role.VENDEUR },
    });
    await this.prisma.vendeur.update({
      where: { id: vendeurId },
      data: { userId: user.id },
    });
    return user.id;
  }

  /** Vendeur principal (utilisé sur les factures / certificats). Créé par défaut si absent. */
  async get(): Promise<Vendeur> {
    const existing = await this.prisma.vendeur.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;
    return this.prisma.vendeur.create({
      data: {
        nom: 'FGS_IMMO',
        raisonSociale: 'FGS IMMO SARL',
        slogan: "Vente de terrains & coopératives d'habitat",
        adresse: 'Dakar, Sénégal',
        telephone: '+221 33 000 00 00',
        email: 'contact@fgsimmo.sn',
        siteWeb: 'www.fgsimmo.sn',
      },
    });
  }

  /** Liste de tous les vendeurs (le 1er est le vendeur principal). */
  async list(): Promise<Vendeur[]> {
    const all = await this.prisma.vendeur.findMany({
      orderBy: { createdAt: 'asc' },
    });
    if (all.length === 0) return [await this.get()];
    return all;
  }

  async create(dto: UpdateVendeurDto): Promise<Vendeur> {
    const { motDePasse, ...data } = dto;
    const vendeur = await this.prisma.vendeur.create({
      data: { nom: dto.nom ?? 'Nouveau vendeur', ...data },
    });
    await this.provisionUser(vendeur.id, dto.email, motDePasse, null);
    return this.prisma.vendeur.findUniqueOrThrow({ where: { id: vendeur.id } });
  }

  async update(id: string, dto: UpdateVendeurDto): Promise<Vendeur> {
    const existing = await this.prisma.vendeur.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendeur introuvable.');
    const { motDePasse, ...data } = dto;
    const updated = await this.prisma.vendeur.update({ where: { id }, data });
    await this.provisionUser(id, dto.email ?? existing.email ?? undefined, motDePasse, existing.userId);
    return this.prisma.vendeur.findUniqueOrThrow({ where: { id } });
  }

  /** Suspend / réactive un vendeur (l'admin reprend la main sur ses échanges) */
  async setSuspendu(id: string, suspendu: boolean): Promise<Vendeur> {
    const existing = await this.prisma.vendeur.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendeur introuvable.');
    return this.prisma.vendeur.update({ where: { id }, data: { suspendu } });
  }

  /** Profil vendeur lié à un compte utilisateur */
  async byUser(userId: string): Promise<Vendeur | null> {
    return this.prisma.vendeur.findFirst({ where: { userId } });
  }

  async remove(id: string) {
    const existing = await this.prisma.vendeur.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendeur introuvable.');
    await this.prisma.vendeur.delete({ where: { id } });
    if (existing.userId) {
      await this.prisma.user.delete({ where: { id: existing.userId } }).catch(() => {});
    }
    return { ok: true };
  }
}
