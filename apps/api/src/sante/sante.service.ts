import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SanteService {
  private demarrage = Date.now();

  constructor(private prisma: PrismaService) {}

  /** Réponse minimale : le service répond et la base est joignable. */
  async sonde() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { statut: 'ok' };
    } catch {
      return { statut: 'degrade' };
    }
  }

  /** Vue d'ensemble pour l'administrateur : version, base, volumétrie. */
  async diagnostic() {
    const debut = Date.now();
    let base: { joignable: boolean; latenceMs?: number; migrations?: number } = {
      joignable: false,
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const migrations = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL
      `;
      base = {
        joignable: true,
        latenceMs: Date.now() - debut,
        migrations: Number(migrations[0]?.count ?? 0),
      };
    } catch {
      base = { joignable: false };
    }

    const [
      comptes,
      clients,
      sites,
      terrains,
      cooperatives,
      adhesions,
      paiements,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.client.count(),
      this.prisma.site.count(),
      this.prisma.terrain.count(),
      this.prisma.cooperative.count(),
      this.prisma.adhesion.count(),
      this.prisma.paiement.count(),
    ]);

    return {
      statut: base.joignable ? 'ok' : 'degrade',
      version: process.env.npm_package_version ?? '0.1.0',
      environnement: process.env.NODE_ENV ?? 'development',
      demarreDepuisSecondes: Math.round((Date.now() - this.demarrage) / 1000),
      memoireMo: Math.round(process.memoryUsage().rss / 1024 / 1024),
      base,
      volumetrie: {
        comptes,
        clients,
        sites,
        terrains,
        cooperatives,
        adhesions,
        paiements,
      },
    };
  }
}
