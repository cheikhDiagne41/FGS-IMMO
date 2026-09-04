-- CreateEnum
CREATE TYPE "TypeParametre" AS ENUM ('TEXTE', 'NOMBRE', 'BOOLEEN', 'LISTE');

-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" "TypeParametre" NOT NULL DEFAULT 'TEXTE',
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "groupe" TEXT NOT NULL DEFAULT 'Général',
    "public" BOOLEAN NOT NULL DEFAULT false,
    "systeme" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parametres_cle_key" ON "parametres"("cle");

-- CreateIndex
CREATE INDEX "parametres_groupe_idx" ON "parametres"("groupe");

