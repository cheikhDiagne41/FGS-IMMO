import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Délimite ce qu'un vendeur a le droit de voir et de modifier.
 *
 * Un vendeur ne travaille que sur ses propres sites, coopératives et
 * terrains, et ne suit que les clients ayant adhéré à SES coopératives.
 * L'administration et les gestionnaires, eux, voient l'ensemble.
 */
@Injectable()
export class PerimetreVendeurService {
  constructor(private prisma: PrismaService) {}

  /**
   * Identifiant de la fiche vendeur du compte connecté, ou null si le
   * compte n'est pas un vendeur (il voit alors tout).
   */
  async vendeurIdDe(user?: { userId: string; role: string }): Promise<string | null> {
    if (!user || user.role !== 'VENDEUR') return null;
    const vendeur = await this.prisma.vendeur.findFirst({
      where: { userId: user.userId },
      select: { id: true, suspendu: true },
    });
    if (!vendeur) {
      throw new ForbiddenException(
        "Aucune fiche vendeur n'est rattachée à ce compte. Contactez l'administrateur.",
      );
    }
    if (vendeur.suspendu) {
      throw new ForbiddenException(
        'Votre compte vendeur est suspendu. Contactez l\'administrateur.',
      );
    }
    return vendeur.id;
  }

  /**
   * Filtre à appliquer aux listes : restreint au vendeur, ou vide pour
   * les autres rôles (qui voient tout).
   */
  async filtre(user?: { userId: string; role: string }) {
    const vendeurId = await this.vendeurIdDe(user);
    return vendeurId ? { vendeurId } : {};
  }

  /**
   * Vérifie qu'un vendeur agit bien sur un élément qui lui appartient.
   * Sans effet pour les autres rôles.
   */
  async verifierAcces(
    user: { userId: string; role: string } | undefined,
    proprietaireId: string | null | undefined,
    libelle = 'cet élément',
  ) {
    const vendeurId = await this.vendeurIdDe(user);
    if (vendeurId && proprietaireId !== vendeurId) {
      throw new ForbiddenException(
        `Vous ne pouvez agir que sur ${libelle} que vous gérez.`,
      );
    }
  }
}
