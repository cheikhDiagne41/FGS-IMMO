/**
 * Exporte le contenu « vitrine » du site vers un fichier JSON, afin de le
 * rejouer sur l'hébergement de démonstration.
 *
 * Ce qui est exporté : société, sites, coopératives, terrains et leurs
 * photos, trophées, gouvernance, partenaires, actualités, vidéos d'accueil.
 *
 * Ce qui ne l'est PAS, volontairement : clients, adhésions, paiements,
 * factures et pièces d'identité — des données personnelles qui n'ont pas à
 * quitter le poste ni à se retrouver sur une démonstration publique.
 *
 * Utilisation :  npx ts-node prisma/exporter-vitrine.ts
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const donnees = {
    exporteLe: new Date().toISOString(),
    societe: await prisma.vendeur.findFirst({ orderBy: { createdAt: 'asc' } }),
    sites: await prisma.site.findMany({ include: { photos: true } }),
    cooperatives: await prisma.cooperative.findMany(),
    terrains: await prisma.terrain.findMany({ include: { images: true } }),
    trophees: await prisma.trophee.findMany(),
    gouvernance: await prisma.membreGouvernance.findMany(),
    partenaires: await prisma.partenaire.findMany(),
    actualites: await prisma.actualite.findMany({ include: { medias: true } }),
    videosAccueil: await prisma.videoAccueil.findMany(),
  };

  const chemin = join(process.cwd(), 'prisma', 'vitrine.json');
  writeFileSync(chemin, JSON.stringify(donnees, null, 2));

  console.log('Contenu vitrine exporté vers', chemin);
  console.log('  sites         :', donnees.sites.length);
  console.log('  terrains      :', donnees.terrains.length);
  console.log('  coopératives  :', donnees.cooperatives.length);
  console.log('  actualités    :', donnees.actualites.length);
  console.log('  trophées      :', donnees.trophees.length);
  console.log('  gouvernance   :', donnees.gouvernance.length);
  console.log('  partenaires   :', donnees.partenaires.length);
  console.log('  vidéos accueil:', donnees.videosAccueil.length);
}

main()
  .catch((e) => {
    console.error('Échec de l\'export :', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
