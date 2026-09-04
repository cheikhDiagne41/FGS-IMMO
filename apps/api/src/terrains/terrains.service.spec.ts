import { TerrainsService } from './terrains.service';

/**
 * Génération des références de terrain.
 *
 * La référence est unique en base : si elle est recalculée à partir du
 * *nombre* de terrains, elle se répète dès qu'une parcelle a été supprimée et
 * la création échoue. Ces tests figent la règle « on repart du dernier
 * numéro utilisé ».
 */
describe('Référence de terrain', () => {
  const service = (dernier: string | null) =>
    new TerrainsService(
      {
        terrain: { findFirst: async () => (dernier ? { reference: dernier } : null) },
      } as never,
      null as never,
      null as never,
      null as never,
    );

  const prochaine = (s: TerrainsService) =>
    (
      s as unknown as { prochaineReference: () => Promise<string> }
    ).prochaineReference();

  const annee = new Date().getFullYear();

  it('commence à 00001 pour la première parcelle de l\'année', async () => {
    expect(await prochaine(service(null))).toBe(`TER-${annee}-00001`);
  });

  it('reprend au numéro suivant', async () => {
    expect(await prochaine(service(`TER-${annee}-00007`))).toBe(`TER-${annee}-00008`);
  });

  it('ne recule pas après la suppression de parcelles', async () => {
    // 11 parcelles créées, 3 supprimées : la suivante doit être la 12e,
    // surtout pas la 9e — qui existe déjà.
    expect(await prochaine(service(`TER-${annee}-00011`))).toBe(`TER-${annee}-00012`);
  });

  it('passe correctement le cap des trois chiffres', async () => {
    expect(await prochaine(service(`TER-${annee}-00099`))).toBe(`TER-${annee}-00100`);
    expect(await prochaine(service(`TER-${annee}-00999`))).toBe(`TER-${annee}-01000`);
  });

  it('garde le remplissage à cinq chiffres', async () => {
    const ref = await prochaine(service(`TER-${annee}-00042`));
    expect(ref).toMatch(/^TER-\d{4}-\d{5}$/);
  });
});
