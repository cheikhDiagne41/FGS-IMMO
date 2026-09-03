-- AlterTable
ALTER TABLE "cooperatives" ADD COLUMN     "vendeurId" TEXT;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "vendeurId" TEXT;

-- CreateIndex
CREATE INDEX "cooperatives_vendeurId_idx" ON "cooperatives"("vendeurId");

-- CreateIndex
CREATE INDEX "sites_vendeurId_idx" ON "sites"("vendeurId");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "vendeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "vendeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

