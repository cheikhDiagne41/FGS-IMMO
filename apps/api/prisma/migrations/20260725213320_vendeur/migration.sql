-- CreateTable
CREATE TABLE "vendeur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT 'FGS_IMMO',
    "raisonSociale" TEXT,
    "slogan" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "ninea" TEXT,
    "rccm" TEXT,
    "responsable" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendeur_pkey" PRIMARY KEY ("id")
);
