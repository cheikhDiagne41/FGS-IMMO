/**
 * Réinjecte le contenu « vitrine » exporté (prisma/vitrine.json) dans la base.
 * Conçu pour l'hébergement de démonstration : s'exécute après les migrations
 * et le seed, et ne fait rien si le fichier est absent.
 *
 * Rejouable sans risque : chaque élément est créé s'il n'existe pas déjà
 * (identifiants d'origine conservés), jamais dupliqué.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

/** Crée l'élément s'il n'existe pas encore, sinon le laisse tel quel. */
async function creerSiAbsent<T extends { id: string }>(
  nom: string,
  elements: T[] | undefined,
  existe: (id: string) => Promise<unknown | null>,
  creer: (element: T) => Promise<unknown>,
) {
  if (!elements?.length) return;
  let ajoutes = 0;
  for (const element of elements) {
    if (await existe(element.id)) continue;
    try {
      await creer(element);
      ajoutes += 1;
    } catch (e: any) {
      console.warn(`  ${nom} ignoré (${element.id}) :`, e.message.split('\n')[0]);
    }
  }
  console.log(`  ${nom.padEnd(14)} ${ajoutes} ajouté(s) sur ${elements.length}`);
}

async function main() {
  const chemin = join(process.cwd(), 'prisma', 'vitrine.json');
  if (!existsSync(chemin)) {
    console.log('Aucun contenu vitrine à importer (prisma/vitrine.json absent).');
    return;
  }

  const d = JSON.parse(readFileSync(chemin, 'utf8'));
  console.log('Import du contenu vitrine exporté le', d.exporteLe);

  // La société est mise à jour si elle existe déjà (le seed en crée une)
  if (d.societe) {
    const { id, createdAt, updatedAt, userId, ...champs } = d.societe;
    const existante = await prisma.vendeur.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existante) {
      await prisma.vendeur.update({ where: { id: existante.id }, data: champs });
      console.log('  société        mise à jour');
    } else {
      await prisma.vendeur.create({ data: { id, ...champs } });
      console.log('  société        créée');
    }
  }

  await creerSiAbsent(
    'sites', d.sites,
    (id) => prisma.site.findUnique({ where: { id } }),
    ({ photos, createdAt, updatedAt, ...s }: any) =>
      prisma.site.create({
        data: { ...s, photos: { create: photos.map(({ id, siteId, ...p }: any) => p) } },
      }),
  );

  await creerSiAbsent(
    'coopératives', d.cooperatives,
    (id) => prisma.cooperative.findUnique({ where: { id } }),
    ({ createdAt, updatedAt, ...c }: any) => prisma.cooperative.create({ data: c }),
  );

  await creerSiAbsent(
    'terrains', d.terrains,
    (id) => prisma.terrain.findUnique({ where: { id } }),
    ({ images, createdAt, updatedAt, clientId, adhesionId, dateAttribution, ...t }: any) =>
      prisma.terrain.create({
        data: {
          ...t,
          // Un terrain attribué à un client n'a pas de sens ici : les clients
          // ne sont pas exportés. La parcelle repart donc disponible.
          statut: t.statut === 'VENDU' ? 'DISPONIBLE' : t.statut,
          images: { create: images.map(({ id, terrainId, createdAt, ...i }: any) => i) },
        },
      }),
  );

  await creerSiAbsent(
    'trophées', d.trophees,
    (id) => prisma.trophee.findUnique({ where: { id } }),
    ({ createdAt, ...t }: any) => prisma.trophee.create({ data: t }),
  );

  await creerSiAbsent(
    'gouvernance', d.gouvernance,
    (id) => prisma.membreGouvernance.findUnique({ where: { id } }),
    ({ createdAt, ...m }: any) => prisma.membreGouvernance.create({ data: m }),
  );

  await creerSiAbsent(
    'partenaires', d.partenaires,
    (id) => prisma.partenaire.findUnique({ where: { id } }),
    ({ createdAt, ...p }: any) => prisma.partenaire.create({ data: p }),
  );

  await creerSiAbsent(
    'actualités', d.actualites,
    (id) => prisma.actualite.findUnique({ where: { id } }),
    ({ medias, createdAt, ...a }: any) =>
      prisma.actualite.create({
        data: {
          ...a,
          medias: { create: medias.map(({ id, actualiteId, createdAt, ...m }: any) => m) },
        },
      }),
  );

  await creerSiAbsent(
    'vidéos accueil', d.videosAccueil,
    (id) => prisma.videoAccueil.findUnique({ where: { id } }),
    ({ createdAt, ...v }: any) => prisma.videoAccueil.create({ data: v }),
  );

  console.log('Import terminé.');
}

main()
  .catch((e) => {
    // Ne jamais empêcher l'application de démarrer à cause de l'import
    console.error('Import du contenu vitrine ignoré :', e.message);
  })
  .finally(() => prisma.$disconnect());
