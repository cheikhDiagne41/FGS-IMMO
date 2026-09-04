import { ForbiddenException } from '@nestjs/common';
import { PerimetreVendeurService } from './perimetre-vendeur.service';

/**
 * Cloisonnement des vendeurs.
 *
 * C'est la barrière qui empêche un vendeur de voir ou de modifier les biens
 * de l'agence et ceux de ses confrères. Une régression ici ouvrirait l'accès
 * à des données commerciales qui ne le concernent pas.
 */
describe('Périmètre vendeur', () => {
  const fauxPrisma = (fiche: unknown) =>
    ({ vendeur: { findFirst: async () => fiche } }) as never;

  const VENDEUR = { userId: 'u-1', role: 'VENDEUR' };
  const ADMIN = { userId: 'u-admin', role: 'ADMIN' };
  const FICHE = { id: 'v-1', suspendu: false };

  describe('identification', () => {
    it('rattache un vendeur à sa fiche', async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      expect(await s.vendeurIdDe(VENDEUR)).toBe('v-1');
    });

    it("ne restreint pas l'administration", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      expect(await s.vendeurIdDe(ADMIN)).toBeNull();
      expect(await s.vendeurIdDe({ userId: 'u', role: 'GESTIONNAIRE' })).toBeNull();
      expect(await s.vendeurIdDe(undefined)).toBeNull();
    });

    it('refuse un compte vendeur sans fiche rattachée', async () => {
      const s = new PerimetreVendeurService(fauxPrisma(null));
      await expect(s.vendeurIdDe(VENDEUR)).rejects.toThrow(ForbiddenException);
    });

    it('refuse un vendeur suspendu', async () => {
      const s = new PerimetreVendeurService(fauxPrisma({ id: 'v-1', suspendu: true }));
      await expect(s.vendeurIdDe(VENDEUR)).rejects.toThrow(/suspendu/i);
    });
  });

  describe('filtrage des listes', () => {
    it("limite un vendeur à ses propres biens", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      expect(await s.filtre(VENDEUR)).toEqual({ vendeurId: 'v-1' });
    });

    it("n'ajoute aucune condition pour l'administration", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      expect(await s.filtre(ADMIN)).toEqual({});
      expect(await s.filtre(undefined)).toEqual({});
    });
  });

  describe('contrôle avant modification', () => {
    it('laisse passer un vendeur sur son propre bien', async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      await expect(s.verifierAcces(VENDEUR, 'v-1', 'les sites')).resolves.toBeUndefined();
    });

    it("bloque un vendeur sur le bien d'un autre", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      await expect(s.verifierAcces(VENDEUR, 'v-2', 'les sites')).rejects.toThrow(
        'Vous ne pouvez agir que sur les sites que vous gérez.',
      );
    });

    it("bloque un vendeur sur un bien de l'agence (sans propriétaire)", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      await expect(s.verifierAcces(VENDEUR, null, 'les terrains')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("laisse l'administration agir sur tout", async () => {
      const s = new PerimetreVendeurService(fauxPrisma(FICHE));
      await expect(s.verifierAcces(ADMIN, 'v-2')).resolves.toBeUndefined();
      await expect(s.verifierAcces(ADMIN, null)).resolves.toBeUndefined();
      await expect(s.verifierAcces(undefined, 'v-2')).resolves.toBeUndefined();
    });
  });
});
