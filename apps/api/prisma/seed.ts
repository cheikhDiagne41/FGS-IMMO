import { PrismaClient, Role, SiteStatus, TerrainStatus, TerrainType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed FGS_IMMO...');

  // --- Comptes de démonstration (un par rôle) ---
  const password = await bcrypt.hash('Password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fgsimmo.sn' },
    update: {},
    create: { email: 'admin@fgsimmo.sn', passwordHash: password, role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'gestionnaire@fgsimmo.sn' },
    update: {},
    create: { email: 'gestionnaire@fgsimmo.sn', passwordHash: password, role: Role.GESTIONNAIRE },
  });

  await prisma.user.upsert({
    where: { email: 'comptable@fgsimmo.sn' },
    update: {},
    create: { email: 'comptable@fgsimmo.sn', passwordHash: password, role: Role.COMPTABLE },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@fgsimmo.sn' },
    update: {},
    create: {
      email: 'client@fgsimmo.sn',
      passwordHash: password,
      role: Role.CLIENT,
      client: {
        create: {
          nom: 'Diagne',
          prenom: 'Cheikh',
          telephone: '+221770000000',
          profession: 'Ingénieur',
        },
      },
    },
    include: { client: true },
  });

  // --- Site de démonstration ---
  const site = await prisma.site.upsert({
    where: { code: 'DKR-001' },
    update: {},
    create: {
      code: 'DKR-001',
      nom: 'Cité FGS Diamniadio',
      region: 'Dakar',
      departement: 'Rufisque',
      commune: 'Diamniadio',
      adresse: 'Pôle urbain de Diamniadio',
      latitude: 14.7167,
      longitude: -17.1833,
      superficie: 15000,
      nbParcelles: 50,
      prixReference: 15000000,
      description: 'Site résidentiel viabilisé à proximité de la nouvelle ville.',
      statut: SiteStatus.EN_COMMERCIALISATION,
      gerantNom: 'Fatou Sow',
      gerantTelephone: '+221 77 000 00 06',
      gerantEmail: 'f.sow@fgsimmo.sn',
    },
  });

  // Photos du site (URLs externes, indépendantes du stockage local)
  if ((await prisma.sitePhoto.count({ where: { siteId: site.id } })) === 0) {
    await prisma.sitePhoto.createMany({
      data: [
        { siteId: site.id, url: 'https://picsum.photos/seed/fgs-site1/900/600' },
        { siteId: site.id, url: 'https://picsum.photos/seed/fgs-site2/900/600' },
      ],
    });
  }

  // --- Coopérative rattachée au site ---
  const coop = await prisma.cooperative.upsert({
    where: { numero: 'COOP-001' },
    update: {},
    create: {
      numero: 'COOP-001',
      nom: 'Coopérative Espoir Diamniadio',
      siteId: site.id,
      nbMaxAdherents: 120,
      fraisAdhesion: 25000,
      montantAcompte: 2000000,
      cotisationMensuelle: 250000,
      nbMensualites: 48,
      dureeRemboursement: 48,
      responsable: 'M. Fall',
    },
  });

  // --- Parcelles numérotées 1..N (toutes disponibles au départ) ---
  const existingTerrains = await prisma.terrain.count({ where: { siteId: site.id } });
  if (existingTerrains === 0) {
    const titres = [
      'Grand terrain à Diamniadio',
      'Parcelle viabilisée pôle urbain',
      'Terrain résidentiel proche TER',
      'Belle parcelle d\'angle',
    ];
    for (let k = 1; k <= site.nbParcelles; k++) {
      const withMedia = k <= 12; // les 12 premières illustrées pour la démo
      await prisma.terrain.create({
        data: {
          numeroParcelle: String(k),
          siteId: site.id,
          superficie: 300,
          prix: 15000000,
          type: TerrainType.HABITATION,
          statut: TerrainStatus.DISPONIBLE,
          enVedette: k <= 4,
          titre: k <= 4 ? titres[(k - 1) % titres.length] : undefined,
          document: k <= 12 ? 'Délibération' : undefined,
          description:
            k <= 12
              ? 'Terrain stratégique dans le pôle urbain de Diamniadio, à proximité de la gare TER et de la nouvelle ville.'
              : undefined,
          latitude: 14.7167 + (Math.random() - 0.5) * 0.01,
          longitude: -17.1833 + (Math.random() - 0.5) * 0.01,
          images: withMedia
            ? {
                create: [
                  { url: `https://picsum.photos/seed/fgs-t${k}a/900/600` },
                  { url: `https://picsum.photos/seed/fgs-t${k}b/900/600` },
                ],
              }
            : undefined,
        },
      });
    }
  }

  console.log('✅ Seed terminé.');
  console.log('   Admin        : admin@fgsimmo.sn / Password123');
  console.log('   Gestionnaire : gestionnaire@fgsimmo.sn / Password123');
  console.log('   Comptable    : comptable@fgsimmo.sn / Password123');
  console.log('   Client       : client@fgsimmo.sn / Password123');
  console.log(`   Site: ${site.nom} — Coop: ${coop.nom} — Admin id: ${admin.id} — Client: ${clientUser.client?.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
