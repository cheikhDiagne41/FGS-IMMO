-- AlterTable
ALTER TABLE "terrains" ADD COLUMN     "description" TEXT,
ADD COLUMN     "document" TEXT,
ADD COLUMN     "enVedette" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "titre" TEXT,
ADD COLUMN     "vendeurNom" TEXT,
ADD COLUMN     "vendeurTelephone" TEXT;

-- CreateTable
CREATE TABLE "favoris" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favoris_clientId_terrainId_key" ON "favoris"("clientId", "terrainId");

-- CreateIndex
CREATE UNIQUE INDEX "terrains_reference_key" ON "terrains"("reference");

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

