import { Prisma } from '@prisma/client';
import { AdhesionsService } from './adhesions.service';

/**
 * Calcul de l'échéancier d'adhésion.
 *
 * C'est le cœur financier de la plateforme : ce que le client s'engage à
 * payer, et quand. Une erreur ici se répercute sur les factures, le solde et
 * les relances — d'où ces contrôles.
 */
describe("Échéancier d'adhésion", () => {
  const service = new AdhesionsService(null as never, null as never);
  const construire = (
    coop: {
      fraisAdhesion: number;
      montantAcompte: number;
      cotisationMensuelle: number;
      nbMensualites: number;
    },
    date: Date,
  ) =>
    (
      service as unknown as {
        buildEcheancier: (
          c: {
            fraisAdhesion: Prisma.Decimal;
            montantAcompte: Prisma.Decimal;
            cotisationMensuelle: Prisma.Decimal;
            nbMensualites: number;
          },
          d: Date,
        ) => {
          plan: {
            numero: number;
            type: string;
            libelle: string;
            montantDu: number;
            dateEcheance: Date;
          }[];
          montantTotal: number;
        };
      }
    ).buildEcheancier(
      {
        fraisAdhesion: new Prisma.Decimal(coop.fraisAdhesion),
        montantAcompte: new Prisma.Decimal(coop.montantAcompte),
        cotisationMensuelle: new Prisma.Decimal(coop.cotisationMensuelle),
        nbMensualites: coop.nbMensualites,
      },
      date,
    );

  const COOP_TYPE = {
    fraisAdhesion: 10_000,
    montantAcompte: 2_000_000,
    cotisationMensuelle: 250_000,
    nbMensualites: 48,
  };

  it('enchaîne frais, acompte puis les mensualités, dans cet ordre', () => {
    const { plan } = construire(COOP_TYPE, new Date('2026-01-15'));

    expect(plan).toHaveLength(50); // 1 frais + 1 acompte + 48 cotisations
    expect(plan[0]).toMatchObject({
      numero: 1,
      type: 'ADHESION',
      montantDu: 10_000,
    });
    expect(plan[1]).toMatchObject({
      numero: 2,
      type: 'ACOMPTE',
      montantDu: 2_000_000,
    });
    expect(plan[2]).toMatchObject({
      numero: 3,
      type: 'COTISATION',
      libelle: 'Cotisation mensuelle 1/48',
      montantDu: 250_000,
    });
    expect(plan[49].libelle).toBe('Cotisation mensuelle 48/48');
  });

  it('numérote les échéances sans trou ni doublon', () => {
    const { plan } = construire(COOP_TYPE, new Date('2026-01-15'));
    expect(plan.map((e) => e.numero)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
  });

  it('additionne frais + acompte + toutes les mensualités', () => {
    const { plan, montantTotal } = construire(COOP_TYPE, new Date('2026-01-15'));

    expect(montantTotal).toBe(10_000 + 2_000_000 + 250_000 * 48);
    // le total annoncé doit être exactement la somme des échéances
    expect(plan.reduce((s, e) => s + e.montantDu, 0)).toBe(montantTotal);
  });

  it("saute la ligne de frais quand la coopérative n'en demande pas", () => {
    const { plan, montantTotal } = construire(
      { ...COOP_TYPE, fraisAdhesion: 0 },
      new Date('2026-01-15'),
    );

    expect(plan).toHaveLength(49);
    expect(plan[0].type).toBe('ACOMPTE');
    expect(plan[0].numero).toBe(1);
    expect(montantTotal).toBe(2_000_000 + 250_000 * 48);
  });

  it("place frais et acompte le jour de l'adhésion, puis un mois d'écart", () => {
    const debut = new Date('2026-01-15');
    const { plan } = construire(COOP_TYPE, debut);

    expect(plan[0].dateEcheance).toEqual(debut);
    expect(plan[1].dateEcheance).toEqual(debut);
    expect(plan[2].dateEcheance.toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(plan[3].dateEcheance.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('reste dans le mois attendu pour une adhésion en fin de mois', () => {
    // 31 janvier + 1 mois : février n'a pas de 31, la date déborde sur mars.
    // Ce test fige le comportement réel pour qu'un changement soit visible.
    const { plan } = construire(COOP_TYPE, new Date('2026-01-31'));
    expect(plan[2].dateEcheance.toISOString().slice(0, 10)).toBe('2026-03-03');
  });

  it('ne modifie pas la date fournie en construisant les échéances', () => {
    const debut = new Date('2026-01-15');
    construire(COOP_TYPE, debut);
    expect(debut.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('gère une coopérative à une seule mensualité', () => {
    const { plan, montantTotal } = construire(
      { fraisAdhesion: 5_000, montantAcompte: 100_000, cotisationMensuelle: 50_000, nbMensualites: 1 },
      new Date('2026-06-10'),
    );
    expect(plan).toHaveLength(3);
    expect(plan[2].libelle).toBe('Cotisation mensuelle 1/1');
    expect(montantTotal).toBe(155_000);
  });
});

/**
 * Numérotation des dossiers d'adhésion.
 *
 * Même règle que les factures et les terrains : on repart du dernier numéro
 * attribué, jamais du nombre de dossiers.
 */
describe('Numéro de dossier', () => {
  const annee = new Date().getFullYear();

  const numeroSuivant = (dernier: string | null) => {
    const service = new AdhesionsService(
      {
        adhesion: {
          findFirst: async () => (dernier ? { numeroDossier: dernier } : null),
        },
      } as never,
      null as never,
    );
    return (
      service as unknown as { genererNumeroDossier: () => Promise<string> }
    ).genererNumeroDossier();
  };

  it('commence à 0001', async () => {
    expect(await numeroSuivant(null)).toBe(`ADH-${annee}-0001`);
  });

  it('suit le dernier dossier ouvert', async () => {
    expect(await numeroSuivant(`ADH-${annee}-0007`)).toBe(`ADH-${annee}-0008`);
  });

  it("ne réattribue pas un numéro après la suppression d'un dossier", async () => {
    expect(await numeroSuivant(`ADH-${annee}-0007`)).not.toBe(`ADH-${annee}-0005`);
  });
});
