/**
 * Sauvegarde de la plateforme : base de données + fichiers envoyés.
 *
 *   npm run sauvegarde
 *
 * Produit un dossier daté sous « sauvegardes/ » contenant :
 *   - base.sql        : la base complète (pg_dump)
 *   - uploads/        : photos, vidéos et pièces jointes
 *   - inventaire.json : volumétrie, pour vérifier une restauration
 *
 * À faire avant toute évolution qui touche au schéma ou aux données.
 * Les pièces d'identité des clients sont incluses : ce dossier est
 * confidentiel, ne le déposez pas sur un espace partagé.
 */
const { execFileSync } = require('child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} = require('fs');
const { join } = require('path');
const { PrismaClient } = require('@prisma/client');

const RACINE = process.cwd();
const horodatage = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const dossier = join(RACINE, '..', '..', 'sauvegardes', horodatage);

/**
 * pg_dump n'est pas toujours dans le PATH sous Windows : on va le chercher
 * dans l'installation PostgreSQL standard avant d'abandonner.
 */
function trouverPgDump() {
  const candidats = ['pg_dump'];
  const base = join('C:', 'Program Files', 'PostgreSQL');
  try {
    for (const version of readdirSync(base).sort().reverse()) {
      candidats.push(join(base, version, 'bin', 'pg_dump.exe'));
    }
  } catch {
    // pas d'installation Windows standard : on s'en tient au PATH
  }
  return candidats;
}

/**
 * Prisma ajoute des paramètres à l'URL (schema, connection_limit…) que
 * pg_dump refuse. On les retire et on passe le schéma séparément.
 */
function urlPourPgDump(brut) {
  const u = new URL(brut);
  const schema = u.searchParams.get('schema');
  u.search = '';
  return { url: u.toString(), schema };
}

function dumpBase(destination) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL absent : vérifiez apps/api/.env');
  }
  const { url, schema } = urlPourPgDump(process.env.DATABASE_URL);
  const args = ['--no-owner', '--no-privileges'];
  if (schema) args.push('--schema', schema);
  args.push('--file', destination, url);

  let commandeTrouvee = false;
  let derniereErreur = 'commande introuvable';
  for (const pgDump of trouverPgDump()) {
    try {
      execFileSync(pgDump, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      return true;
    } catch (e) {
      if (e.code !== 'ENOENT') commandeTrouvee = true;
      const sortie = e.stderr ? e.stderr.toString().trim() : '';
      derniereErreur = sortie ? sortie.split(/\r?\n/).pop() : e.message;
    }
  }
  console.warn(`  ⚠️  Sauvegarde de la base impossible : ${derniereErreur}`);
  if (!commandeTrouvee) {
    console.warn('     pg_dump est introuvable — installez les outils client PostgreSQL.');
  }
  return false;
}

(async () => {
  const prisma = new PrismaClient();
  mkdirSync(dossier, { recursive: true });
  console.log(`Sauvegarde vers ${dossier}\n`);

  const baseOk = dumpBase(join(dossier, 'base.sql'));
  if (baseOk) {
    const taille = Math.round(statSync(join(dossier, 'base.sql')).size / 1024);
    console.log(`  ✅ base.sql (${taille} Ko)`);
  }

  const uploads = join(RACINE, 'uploads');
  if (existsSync(uploads)) {
    cpSync(uploads, join(dossier, 'uploads'), { recursive: true });
    console.log('  ✅ uploads/ (photos, vidéos, pièces jointes)');
  }

  const inventaire = {
    date: new Date().toISOString(),
    comptes: await prisma.user.count(),
    clients: await prisma.client.count(),
    sites: await prisma.site.count(),
    terrains: await prisma.terrain.count(),
    cooperatives: await prisma.cooperative.count(),
    adhesions: await prisma.adhesion.count(),
    paiements: await prisma.paiement.count(),
    factures: await prisma.facture.count(),
    documents: await prisma.document.count(),
    parametres: await prisma.parametre.count(),
  };
  writeFileSync(join(dossier, 'inventaire.json'), JSON.stringify(inventaire, null, 2));
  console.log('  ✅ inventaire.json\n');
  console.table(inventaire);

  if (!baseOk) {
    console.log('\n⚠️  Sauvegarde incomplète : les fichiers sont là, pas la base.');
    process.exitCode = 1;
  } else {
    console.log('\nPour restaurer :');
    console.log(`  psql "$DATABASE_URL" < "${join(dossier, 'base.sql')}"`);
    console.log(`  puis recopier ${join(dossier, 'uploads')} dans apps/api/uploads`);
  }

  await prisma.$disconnect();
})();
