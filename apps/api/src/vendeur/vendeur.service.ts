import { Injectable } from '@nestjs/common';
import { Vendeur } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVendeurDto } from './dto/vendeur.dto';

@Injectable()
export class VendeurService {
  constructor(private prisma: PrismaService) {}

  /** Récupère le profil vendeur (le crée avec des valeurs par défaut si absent) */
  async get(): Promise<Vendeur> {
    const existing = await this.prisma.vendeur.findFirst();
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

  async update(dto: UpdateVendeurDto): Promise<Vendeur> {
    const current = await this.get();
    return this.prisma.vendeur.update({
      where: { id: current.id },
      data: dto,
    });
  }
}
