import { PaiementsService } from './paiements.service';

/**
 * Affectation des paiements aux échéances.
 *
 * Chaque encaissement est rejoué en cascade sur les échéances les plus
 * anciennes. C'est ce calcul qui détermine le solde du client, sa
 * progression et le statut de son dossier : il doit être exact au franc près.
 */
describe('Affectation des paiements', () => {
  interface EcheanceTest {
    id: string;
    numero: number;
    montantDu: number;
    dateEcheance: Date;
    montantPaye?: number;
    statut?: string;
    datePaiement?: Date | null;
  }

  const DEMAIN = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const HIER = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  /**
   * Base de données simulée en mémoire : on veut vérifier le calcul, pas
   * PostgreSQL. Les mises à jour sont enregistrées pour être inspectées.
   */
  function fauxTx(adhesion: {
    id: string;
    montantTotal: number;
    statut: string;
    echeances: EcheanceTest[];
    paiements: { montant: number; datePaiement: Date }[];
  }) {
    const echeances = adhesion.echeances.map((e) => ({ ...e }));
    const majAdhesion: Record<string, unknown> = {};
    return {
      tx: {
        adhesion: {
          findUniqueOrThrow: async () => ({ ...adhesion, echeances }),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            Object.assign(majAdhesion, data);
            return data;
          },
        },
        echeance: {
          update: async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const e = echeances.find((x) => x.id === where.id)!;
            Object.assign(e, data);
            return e;
          },
        },
      },
      echeances,
      majAdhesion,
    };
  }

  const service = new PaiementsService(
    null as never,
    null as never,
    null as never,
  );

  const recalculer = (adhesion: Parameters<typeof fauxTx>[0]) => {
    const contexte = fauxTx(adhesion);
    const appel = (
      service as unknown as {
        recomputeAdhesion: (tx: unknown, id: string) => Promise<{
          totalPaye: number;
          soldeRestant: number;
          progression: number;
          statut: string;
        }>;
      }
    ).recomputeAdhesion(contexte.tx, adhesion.id);
    return appel.then((resultat) => ({ ...contexte, resultat }));
  };

  /** Dossier type : frais 10 000, acompte 200 000, 2 mensualités de 50 000 */
  const dossier = (paiements: { montant: number; datePaiement: Date }[]) => ({
    id: 'adh-1',
    montantTotal: 310_000,
    statut: 'EN_COURS',
    echeances: [
      { id: 'e1', numero: 1, montantDu: 10_000, dateEcheance: DEMAIN },
      { id: 'e2', numero: 2, montantDu: 200_000, dateEcheance: DEMAIN },
      { id: 'e3', numero: 3, montantDu: 50_000, dateEcheance: DEMAIN },
      { id: 'e4', numero: 4, montantDu: 50_000, dateEcheance: DEMAIN },
    ],
    paiements,
  });

  it('solde les échéances les plus anciennes en premier', async () => {
    const { echeances } = await recalculer(
      dossier([{ montant: 215_000, datePaiement: new Date() }]),
    );

    expect(echeances[0]).toMatchObject({ montantPaye: 10_000, statut: 'PAYEE' });
    expect(echeances[1]).toMatchObject({ montantPaye: 200_000, statut: 'PAYEE' });
    // le reliquat de 5 000 tombe sur la première échéance non soldée
    expect(echeances[2]).toMatchObject({ montantPaye: 5_000, statut: 'PARTIELLE' });
    expect(echeances[3]).toMatchObject({ montantPaye: 0, statut: 'EN_ATTENTE' });
  });

  it('calcule solde et progression', async () => {
    const { resultat, majAdhesion } = await recalculer(
      dossier([{ montant: 155_000, datePaiement: new Date() }]),
    );

    expect(resultat.totalPaye).toBe(155_000);
    expect(resultat.soldeRestant).toBe(155_000);
    expect(resultat.progression).toBe(50);
    expect(majAdhesion).toMatchObject({ montantPaye: 155_000, soldeRestant: 155_000 });
  });

  it('cumule plusieurs versements successifs', async () => {
    const { echeances, resultat } = await recalculer(
      dossier([
        { montant: 10_000, datePaiement: new Date('2026-01-10') },
        { montant: 100_000, datePaiement: new Date('2026-02-10') },
        { montant: 100_000, datePaiement: new Date('2026-03-10') },
      ]),
    );

    expect(resultat.totalPaye).toBe(210_000);
    expect(echeances[0].statut).toBe('PAYEE');
    expect(echeances[1]).toMatchObject({ montantPaye: 200_000, statut: 'PAYEE' });
    expect(echeances[2].montantPaye).toBe(0);
  });

  it('passe le dossier en COMPLETE une fois tout réglé', async () => {
    const { resultat } = await recalculer(
      dossier([{ montant: 310_000, datePaiement: new Date() }]),
    );

    expect(resultat.soldeRestant).toBe(0);
    expect(resultat.progression).toBe(100);
    expect(resultat.statut).toBe('COMPLETE');
  });

  it('ne rend jamais un solde négatif en cas de trop-perçu', async () => {
    const { resultat, echeances } = await recalculer(
      dossier([{ montant: 400_000, datePaiement: new Date() }]),
    );

    expect(resultat.soldeRestant).toBe(0);
    expect(resultat.totalPaye).toBe(400_000);
    // aucune échéance ne reçoit plus que ce qui lui est dû
    echeances.forEach((e) => expect(e.montantPaye).toBeLessThanOrEqual(e.montantDu));
  });

  it('conserve le statut ATTRIBUE quand le dossier est déjà attribué', async () => {
    const { resultat } = await recalculer({
      ...dossier([{ montant: 310_000, datePaiement: new Date() }]),
      statut: 'ATTRIBUE',
    });
    expect(resultat.statut).toBe('ATTRIBUE');
  });

  it('marque en retard une échéance échue et non soldée', async () => {
    const { echeances } = await recalculer({
      ...dossier([]),
      echeances: [
        { id: 'e1', numero: 1, montantDu: 10_000, dateEcheance: HIER },
        { id: 'e2', numero: 2, montantDu: 200_000, dateEcheance: DEMAIN },
        { id: 'e3', numero: 3, montantDu: 50_000, dateEcheance: DEMAIN },
        { id: 'e4', numero: 4, montantDu: 50_000, dateEcheance: DEMAIN },
      ],
    });

    expect(echeances[0].statut).toBe('EN_RETARD');
    expect(echeances[1].statut).toBe('EN_ATTENTE');
  });

  it('classe en retard, et non en partielle, une échéance échue à moitié payée', async () => {
    // Comportement volontaire : le retard prime sur le paiement partiel,
    // pour que la relance reste déclenchée.
    const { echeances } = await recalculer({
      ...dossier([{ montant: 5_000, datePaiement: new Date() }]),
      echeances: [
        { id: 'e1', numero: 1, montantDu: 10_000, dateEcheance: HIER },
        { id: 'e2', numero: 2, montantDu: 200_000, dateEcheance: DEMAIN },
        { id: 'e3', numero: 3, montantDu: 50_000, dateEcheance: DEMAIN },
        { id: 'e4', numero: 4, montantDu: 50_000, dateEcheance: DEMAIN },
      ],
    });

    expect(echeances[0]).toMatchObject({ montantPaye: 5_000, statut: 'EN_RETARD' });
  });

  it('laisse un dossier sans paiement à zéro', async () => {
    const { resultat } = await recalculer(dossier([]));
    expect(resultat).toMatchObject({
      totalPaye: 0,
      soldeRestant: 310_000,
      progression: 0,
      statut: 'EN_COURS',
    });
  });

  it('ne divise pas par zéro sur un dossier à montant nul', async () => {
    const { resultat } = await recalculer({
      id: 'adh-0',
      montantTotal: 0,
      statut: 'EN_COURS',
      echeances: [],
      paiements: [],
    });
    expect(resultat.progression).toBe(0);
    expect(resultat.soldeRestant).toBe(0);
  });
});
