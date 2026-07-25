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
    },
  });

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
    await prisma.terrain.createMany({
      data: Array.from({ length: site.nbParcelles }, (_, k) => ({
        numeroParcelle: String(k + 1),
        siteId: site.id,
        superficie: 300,
        prix: 15000000,
        type: TerrainType.HABITATION,
        statut: TerrainStatus.DISPONIBLE,
      })),
    });
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
