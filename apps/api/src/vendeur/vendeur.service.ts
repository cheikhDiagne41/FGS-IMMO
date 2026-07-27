import { Injectable, NotFoundException } from '@nestjs/common';
import { Vendeur } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVendeurDto } from './dto/vendeur.dto';

@Injectable()
export class VendeurService {
  constructor(private prisma: PrismaService) {}

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

  create(dto: UpdateVendeurDto): Promise<Vendeur> {
    return this.prisma.vendeur.create({
      data: { nom: dto.nom ?? 'Nouveau vendeur', ...dto },
    });
  }

  async update(id: string, dto: UpdateVendeurDto): Promise<Vendeur> {
    const existing = await this.prisma.vendeur.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendeur introuvable.');
    return this.prisma.vendeur.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.vendeur.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendeur introuvable.');
    await this.prisma.vendeur.delete({ where: { id } });
    return { ok: true };
  }
}
