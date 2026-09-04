import { FacturesService } from './factures.service';

/**
 * Numérotation des factures.
 *
 * Le numéro est unique en base et sert de référence comptable. Le calculer à
 * partir du *nombre* de factures redonne un numéro déjà émis dès qu'une
 * facture a été supprimée — et l'encaissement échoue.
 */
describe('Numéro de facture', () => {
  const annee = new Date().getFullYear();

  const numeroSuivant = (derniere: string | null) => {
    const service = new FacturesService(null as never, null as never);
    const tx = {
      facture: {
        findFirst: async () => (derniere ? { numero: derniere } : null),
      },
    };
    return (
      service as unknown as {
        genererNumero: (tx: unknown) => Promise<string>;
      }
    ).genererNumero(tx);
  };

  it('commence à 0001 la première année', async () => {
    expect(await numeroSuivant(null)).toBe(`FAC-${annee}-0001`);
  });

  it('suit le dernier numéro émis', async () => {
    expect(await numeroSuivant(`FAC-${annee}-0022`)).toBe(`FAC-${annee}-0023`);
  });

  it("ne réutilise pas un numéro après la suppression d'une facture", async () => {
    // 22 factures émises, 3 supprimées : compter donnerait FAC-…-0020,
    // qui existe déjà. On doit obtenir 0023.
    expect(await numeroSuivant(`FAC-${annee}-0022`)).not.toBe(`FAC-${annee}-0020`);
    expect(await numeroSuivant(`FAC-${annee}-0022`)).toBe(`FAC-${annee}-0023`);
  });

  it('passe le cap des quatre chiffres sans casser le format', async () => {
    expect(await numeroSuivant(`FAC-${annee}-0099`)).toBe(`FAC-${annee}-0100`);
    expect(await numeroSuivant(`FAC-${annee}-9999`)).toBe(`FAC-${annee}-10000`);
  });
});
