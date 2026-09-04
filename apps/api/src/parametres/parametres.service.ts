import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TypeParametre } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParametreDto, UpdateParametreDto } from './dto/parametre.dto';

/**
 * Réglages de la plateforme.
 *
 * Le but est de pouvoir brancher une fonctionnalité plus tard sans toucher au
 * code : on ajoute un paramètre, l'écran de configuration l'affiche tout seul
 * selon son type, et le reste de l'application le lit avec `lire()`.
 */
@Injectable()
export class ParametresService {
  /** Petit cache mémoire : ces valeurs sont lues souvent et changent peu. */
  private cache = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  private async valeurBrute(cle: string): Promise<string | null> {
    if (this.cache.has(cle)) return this.cache.get(cle)!;
    const p = await this.prisma.parametre.findUnique({ where: { cle } });
    if (!p) return null;
    this.cache.set(cle, p.valeur);
    return p.valeur;
  }

  /** Valeur texte d'un paramètre, ou la valeur de repli fournie. */
  async lire(cle: string, defaut = ''): Promise<string> {
    return (await this.valeurBrute(cle)) ?? defaut;
  }

  /** Interrupteur : la fonctionnalité est-elle active ? */
  async actif(cle: string, defaut = false): Promise<boolean> {
    const v = await this.valeurBrute(cle);
    if (v === null) return defaut;
    return v === 'true' || v === '1' || v === 'oui';
  }

  /** Valeur numérique (durée, seuil, pourcentage…). */
  async nombre(cle: string, defaut = 0): Promise<number> {
    const v = await this.valeurBrute(cle);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : defaut;
  }

  /** Valeurs séparées par des virgules. */
  async liste(cle: string): Promise<string[]> {
    const v = await this.valeurBrute(cle);
    return v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
  }

  async findAll() {
    return this.prisma.parametre.findMany({
      orderBy: [{ groupe: 'asc' }, { ordre: 'asc' }, { libelle: 'asc' }],
    });
  }

  /** Réglages visibles sans être connecté, sous forme { clé: valeur }. */
  async publics() {
    const liste = await this.prisma.parametre.findMany({
      where: { public: true },
      select: { cle: true, valeur: true, type: true },
    });
    return Object.fromEntries(
      liste.map((p) => [
        p.cle,
        p.type === TypeParametre.BOOLEEN
          ? p.valeur === 'true'
          : p.type === TypeParametre.NOMBRE
            ? Number(p.valeur)
            : p.valeur,
      ]),
    );
  }

  /** Contrôle que la valeur correspond bien au type déclaré. */
  private valider(type: TypeParametre, valeur: string) {
    if (type === TypeParametre.NOMBRE && !Number.isFinite(Number(valeur))) {
      throw new BadRequestException('Ce paramètre attend un nombre.');
    }
    if (type === TypeParametre.BOOLEEN && !['true', 'false'].includes(valeur)) {
      throw new BadRequestException('Ce paramètre attend « true » ou « false ».');
    }
  }

  async create(dto: CreateParametreDto) {
    const cle = dto.cle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cle) throw new BadRequestException('Clé invalide.');
    const existant = await this.prisma.parametre.findUnique({ where: { cle } });
    if (existant) throw new BadRequestException('Ce paramètre existe déjà.');

    const type = dto.type ?? TypeParametre.TEXTE;
    this.valider(type, dto.valeur);
    this.cache.delete(cle);
    return this.prisma.parametre.create({
      data: { ...dto, cle, type, systeme: false },
    });
  }

  async update(cle: string, dto: UpdateParametreDto) {
    const p = await this.prisma.parametre.findUnique({ where: { cle } });
    if (!p) throw new NotFoundException('Paramètre introuvable.');

    const type = dto.type ?? p.type;
    if (dto.valeur !== undefined) this.valider(type, dto.valeur);

    // La clé et le type d'un paramètre du socle ne bougent pas : du code
    // s'appuie dessus. Seule sa valeur est modifiable.
    const data: Prisma.ParametreUpdateInput = p.systeme
      ? { valeur: dto.valeur }
      : { ...dto };

    this.cache.delete(cle);
    return this.prisma.parametre.update({ where: { cle }, data });
  }

  async remove(cle: string) {
    const p = await this.prisma.parametre.findUnique({ where: { cle } });
    if (!p) throw new NotFoundException('Paramètre introuvable.');
    if (p.systeme) {
      throw new BadRequestException(
        'Ce paramètre fait partie du socle et ne peut pas être supprimé — vous pouvez seulement changer sa valeur.',
      );
    }
    this.cache.delete(cle);
    await this.prisma.parametre.delete({ where: { cle } });
    return { ok: true };
  }
}
