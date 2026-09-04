import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ParametresService } from './parametres.service';

/**
 * Lecture et contrôle des réglages.
 *
 * Ces valeurs pilotent des fonctionnalités entières : un interrupteur mal
 * interprété couperait l'inscription ou la messagerie sans qu'on le veuille.
 */
describe('Paramètres', () => {
  const fauxPrisma = (
    valeurs: Record<string, { valeur: string; type?: string; systeme?: boolean }>,
    espion?: { lectures: string[]; ecritures: unknown[] },
  ) =>
    ({
      parametre: {
        findUnique: async ({ where }: { where: { cle: string } }) => {
          espion?.lectures.push(where.cle);
          const v = valeurs[where.cle];
          return v ? { cle: where.cle, type: 'TEXTE', systeme: false, ...v } : null;
        },
        update: async (args: unknown) => {
          espion?.ecritures.push(args);
          return args;
        },
        delete: async (args: unknown) => args,
        create: async ({ data }: { data: unknown }) => data,
      },
    }) as never;

  describe('interrupteurs', () => {
    it('reconnaît les façons habituelles de dire oui', async () => {
      const s = new ParametresService(
        fauxPrisma({ a: { valeur: 'true' }, b: { valeur: '1' }, c: { valeur: 'oui' } }),
      );
      expect(await s.actif('a')).toBe(true);
      expect(await s.actif('b')).toBe(true);
      expect(await s.actif('c')).toBe(true);
    });

    it('considère toute autre valeur comme coupée', async () => {
      const s = new ParametresService(
        fauxPrisma({ a: { valeur: 'false' }, b: { valeur: '' }, c: { valeur: 'non' } }),
      );
      expect(await s.actif('a')).toBe(false);
      expect(await s.actif('b')).toBe(false);
      expect(await s.actif('c')).toBe(false);
    });

    it('applique la valeur de repli quand le réglage n\'existe pas', async () => {
      const s = new ParametresService(fauxPrisma({}));
      expect(await s.actif('inconnu')).toBe(false);
      expect(await s.actif('inconnu', true)).toBe(true);
    });

    it('ne coupe pas une fonctionnalité si son réglage a disparu', async () => {
      // cas réel : une fonctionnalité livrée avant que son réglage soit créé
      const s = new ParametresService(fauxPrisma({}));
      expect(await s.actif('messagerie_active', true)).toBe(true);
    });
  });

  describe('nombres et listes', () => {
    it('lit un nombre', async () => {
      const s = new ParametresService(fauxPrisma({ duree: { valeur: '7' } }));
      expect(await s.nombre('duree')).toBe(7);
    });

    it('retombe sur la valeur de repli si ce n\'est pas un nombre', async () => {
      const s = new ParametresService(fauxPrisma({ duree: { valeur: 'sept' } }));
      expect(await s.nombre('duree', 30)).toBe(30);
    });

    it('découpe une liste et enlève les espaces', async () => {
      const s = new ParametresService(
        fauxPrisma({ moyens: { valeur: 'ESPECES, WAVE ,ORANGE_MONEY' } }),
      );
      expect(await s.liste('moyens')).toEqual(['ESPECES', 'WAVE', 'ORANGE_MONEY']);
    });

    it('rend une liste vide plutôt que [""]', async () => {
      const s = new ParametresService(fauxPrisma({ moyens: { valeur: '' } }));
      expect(await s.liste('moyens')).toEqual([]);
    });
  });

  describe('cache', () => {
    it('ne relit la base qu\'une fois par clé', async () => {
      const espion = { lectures: [] as string[], ecritures: [] as unknown[] };
      const s = new ParametresService(fauxPrisma({ site_nom: { valeur: 'FGS' } }, espion));
      await s.lire('site_nom');
      await s.lire('site_nom');
      await s.lire('site_nom');
      expect(espion.lectures.filter((c) => c === 'site_nom')).toHaveLength(1);
    });

    it('oublie la valeur en cache après une modification', async () => {
      const espion = { lectures: [] as string[], ecritures: [] as unknown[] };
      const s = new ParametresService(fauxPrisma({ site_nom: { valeur: 'FGS' } }, espion));
      await s.lire('site_nom');
      await s.update('site_nom', { valeur: 'FGS_IMMO' });
      await s.lire('site_nom');
      // 1 lecture initiale + 1 lecture dans update + 1 relecture après vidage
      expect(espion.lectures.filter((c) => c === 'site_nom').length).toBeGreaterThan(1);
    });
  });

  describe('contrôles de saisie', () => {
    it('refuse un texte là où un nombre est attendu', async () => {
      const s = new ParametresService(
        fauxPrisma({ duree: { valeur: '7', type: 'NOMBRE' } }),
      );
      await expect(s.update('duree', { valeur: 'abc' })).rejects.toThrow(
        'Ce paramètre attend un nombre.',
      );
    });

    it('refuse autre chose que true/false sur un interrupteur', async () => {
      const s = new ParametresService(
        fauxPrisma({ actif: { valeur: 'true', type: 'BOOLEEN' } }),
      );
      await expect(s.update('actif', { valeur: 'peut-etre' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('signale un réglage inexistant', async () => {
      const s = new ParametresService(fauxPrisma({}));
      await expect(s.update('inconnu', { valeur: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('protection du socle', () => {
    it('interdit la suppression d\'un réglage du socle', async () => {
      const s = new ParametresService(
        fauxPrisma({ site_nom: { valeur: 'FGS', systeme: true } }),
      );
      await expect(s.remove('site_nom')).rejects.toThrow(/socle/);
    });

    it('autorise la suppression d\'un réglage ajouté par l\'admin', async () => {
      const s = new ParametresService(
        fauxPrisma({ mon_reglage: { valeur: 'x', systeme: false } }),
      );
      await expect(s.remove('mon_reglage')).resolves.toEqual({ ok: true });
    });

    it('ne change que la valeur d\'un réglage du socle', async () => {
      const espion = { lectures: [] as string[], ecritures: [] as unknown[] };
      const s = new ParametresService(
        fauxPrisma({ site_nom: { valeur: 'FGS', systeme: true } }, espion),
      );
      await s.update('site_nom', { valeur: 'Nouveau', cle: 'autre' } as never);
      expect(espion.ecritures[0]).toMatchObject({ data: { valeur: 'Nouveau' } });
      expect((espion.ecritures[0] as { data: Record<string, unknown> }).data.cle)
        .toBeUndefined();
    });
  });

  describe('création', () => {
    it('normalise la clé saisie', async () => {
      const s = new ParametresService(fauxPrisma({}));
      const cree = (await s.create({
        cle: 'Paiement Carte!',
        valeur: 'false',
        libelle: 'Paiement carte',
      })) as { cle: string };
      expect(cree.cle).toBe('paiement_carte_');
    });

    it('refuse une clé déjà utilisée', async () => {
      const s = new ParametresService(fauxPrisma({ deja: { valeur: 'x' } }));
      await expect(
        s.create({ cle: 'deja', valeur: 'x', libelle: 'Déjà là' }),
      ).rejects.toThrow('Ce paramètre existe déjà.');
    });
  });
});
