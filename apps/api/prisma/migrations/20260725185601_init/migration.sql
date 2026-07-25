-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTIONNAIRE', 'COMPTABLE', 'CLIENT');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('DISPONIBLE', 'EN_COMMERCIALISATION', 'CLOTURE');

-- CreateEnum
CREATE TYPE "CooperativeStatus" AS ENUM ('ACTIVE', 'COMPLETE', 'SUSPENDUE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "TerrainType" AS ENUM ('HABITATION', 'COMMERCIAL', 'AGRICOLE', 'MIXTE');

-- CreateEnum
CREATE TYPE "TerrainStatus" AS ENUM ('DISPONIBLE', 'RESERVE', 'VENDU');

-- CreateEnum
CREATE TYPE "AdhesionStatus" AS ENUM ('EN_COURS', 'COMPLETE', 'ATTRIBUE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "EcheanceType" AS ENUM ('ADHESION', 'ACOMPTE', 'COTISATION');

-- CreateEnum
CREATE TYPE "EcheanceStatus" AS ENUM ('EN_ATTENTE', 'PARTIELLE', 'PAYEE', 'EN_RETARD');

-- CreateEnum
CREATE TYPE "PaiementMethode" AS ENUM ('WAVE', 'ORANGE_MONEY', 'ESPECES', 'VIREMENT', 'CHEQUE');

-- CreateEnum
CREATE TYPE "PaiementStatut" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANNULE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "FactureStatut" AS ENUM ('EMISE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNI', 'PASSEPORT', 'JUSTIFICATIF_DOMICILE', 'PHOTO', 'CONTRAT', 'CERTIFICAT_ATTRIBUTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RAPPEL_ECHEANCE', 'CONFIRMATION_PAIEMENT', 'FACTURE', 'RETARD_PAIEMENT', 'ATTRIBUTION_TERRAIN', 'SYSTEME');

-- CreateEnum
CREATE TYPE "NotificationCanal" AS ENUM ('EMAIL', 'SMS', 'APP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "sexe" "Sexe",
    "dateNaissance" TIMESTAMP(3),
    "cin" TEXT,
    "passeport" TEXT,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT,
    "profession" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "region" TEXT,
    "departement" TEXT,
    "commune" TEXT,
    "adresse" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "superficie" DECIMAL(14,2),
    "nbParcelles" INTEGER NOT NULL DEFAULT 0,
    "prixReference" DECIMAL(14,2),
    "description" TEXT,
    "planUrl" TEXT,
    "statut" "SiteStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_photos" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legende" TEXT,

    CONSTRAINT "site_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperatives" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nbMaxAdherents" INTEGER NOT NULL,
    "fraisAdhesion" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montantAcompte" DECIMAL(14,2) NOT NULL,
    "cotisationMensuelle" DECIMAL(14,2) NOT NULL,
    "nbMensualites" INTEGER NOT NULL,
    "dureeRemboursement" INTEGER,
    "description" TEXT,
    "responsable" TEXT,
    "statut" "CooperativeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terrains" (
    "id" TEXT NOT NULL,
    "numeroParcelle" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "superficie" DECIMAL(14,2) NOT NULL,
    "prix" DECIMAL(14,2),
    "type" "TerrainType" NOT NULL DEFAULT 'HABITATION',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "planUrl" TEXT,
    "statut" "TerrainStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "clientId" TEXT,
    "adhesionId" TEXT,
    "dateAttribution" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terrains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terrain_images" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "terrain_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adhesions" (
    "id" TEXT NOT NULL,
    "numeroDossier" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "dateAdhesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantTotal" DECIMAL(14,2) NOT NULL,
    "montantPaye" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "soldeRestant" DECIMAL(14,2) NOT NULL,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "statut" "AdhesionStatus" NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adhesions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "echeances" (
    "id" TEXT NOT NULL,
    "adhesionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "type" "EcheanceType" NOT NULL DEFAULT 'COTISATION',
    "libelle" TEXT NOT NULL,
    "montantDu" DECIMAL(14,2) NOT NULL,
    "montantPaye" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "statut" "EcheanceStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echeances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "adhesionId" TEXT NOT NULL,
    "echeanceId" TEXT,
    "montant" DECIMAL(14,2) NOT NULL,
    "methode" "PaiementMethode" NOT NULL,
    "refTransaction" TEXT,
    "statut" "PaiementStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saisiParId" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(14,2) NOT NULL,
    "soldeRestant" DECIMAL(14,2) NOT NULL,
    "qrCodeData" TEXT,
    "signatureHash" TEXT,
    "pdfUrl" TEXT,
    "statut" "FactureStatut" NOT NULL DEFAULT 'EMISE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "canal" "NotificationCanal" NOT NULL DEFAULT 'APP',
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "envoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT,
    "entiteId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cin_key" ON "clients"("cin");

-- CreateIndex
CREATE UNIQUE INDEX "clients_passeport_key" ON "clients"("passeport");

-- CreateIndex
CREATE INDEX "clients_nom_prenom_idx" ON "clients"("nom", "prenom");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cooperatives_numero_key" ON "cooperatives"("numero");

-- CreateIndex
CREATE INDEX "cooperatives_siteId_idx" ON "cooperatives"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "terrains_adhesionId_key" ON "terrains"("adhesionId");

-- CreateIndex
CREATE INDEX "terrains_statut_idx" ON "terrains"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "terrains_siteId_numeroParcelle_key" ON "terrains"("siteId", "numeroParcelle");

-- CreateIndex
CREATE UNIQUE INDEX "adhesions_numeroDossier_key" ON "adhesions"("numeroDossier");

-- CreateIndex
CREATE INDEX "adhesions_statut_idx" ON "adhesions"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "adhesions_clientId_cooperativeId_key" ON "adhesions"("clientId", "cooperativeId");

-- CreateIndex
CREATE INDEX "echeances_adhesionId_statut_idx" ON "echeances"("adhesionId", "statut");

-- CreateIndex
CREATE INDEX "echeances_dateEcheance_idx" ON "echeances"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_reference_key" ON "paiements"("reference");

-- CreateIndex
CREATE INDEX "paiements_adhesionId_idx" ON "paiements"("adhesionId");

-- CreateIndex
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");

-- CreateIndex
CREATE INDEX "paiements_datePaiement_idx" ON "paiements"("datePaiement");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numero_key" ON "factures"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "factures_paiementId_key" ON "factures"("paiementId");

-- CreateIndex
CREATE INDEX "factures_dateEmission_idx" ON "factures"("dateEmission");

-- CreateIndex
CREATE INDEX "notifications_userId_lu_idx" ON "notifications"("userId", "lu");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_photos" ADD CONSTRAINT "site_photos_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_adhesionId_fkey" FOREIGN KEY ("adhesionId") REFERENCES "adhesions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrain_images" ADD CONSTRAINT "terrain_images_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adhesions" ADD CONSTRAINT "adhesions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adhesions" ADD CONSTRAINT "adhesions_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echeances" ADD CONSTRAINT "echeances_adhesionId_fkey" FOREIGN KEY ("adhesionId") REFERENCES "adhesions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_adhesionId_fkey" FOREIGN KEY ("adhesionId") REFERENCES "adhesions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "echeances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
