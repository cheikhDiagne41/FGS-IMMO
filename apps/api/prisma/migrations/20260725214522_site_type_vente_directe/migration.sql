-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('COOPERATIVE', 'VENTE_DIRECTE');

-- DropForeignKey
ALTER TABLE "paiements" DROP CONSTRAINT "paiements_adhesionId_fkey";

-- AlterTable
ALTER TABLE "paiements" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "terrainId" TEXT,
ALTER COLUMN "adhesionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "type" "SiteType" NOT NULL DEFAULT 'COOPERATIVE';

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_adhesionId_fkey" FOREIGN KEY ("adhesionId") REFERENCES "adhesions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
