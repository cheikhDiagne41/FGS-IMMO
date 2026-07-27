-- CreateEnum
CREATE TYPE "MessageEmetteur" AS ENUM ('PROSPECT', 'VENDEUR', 'ADMIN');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VENDEUR';

-- AlterTable
ALTER TABLE "terrains" ADD COLUMN     "vendeurId" TEXT;

-- AlterTable
ALTER TABLE "vendeur" ADD COLUMN     "suspendu" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "terrainId" TEXT,
    "prospectNom" TEXT NOT NULL,
    "prospectTelephone" TEXT,
    "prospectEmail" TEXT,
    "clientId" TEXT,
    "sujet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "emetteur" "MessageEmetteur" NOT NULL,
    "contenu" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_vendeurId_idx" ON "conversations"("vendeurId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "vendeur_userId_key" ON "vendeur"("userId");

-- AddForeignKey
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "vendeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendeur" ADD CONSTRAINT "vendeur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "vendeur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

