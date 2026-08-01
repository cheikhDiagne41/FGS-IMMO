-- CreateIndex
CREATE INDEX "sites_statut_idx" ON "sites"("statut");

-- CreateIndex
CREATE INDEX "sites_region_idx" ON "sites"("region");

-- CreateIndex
CREATE INDEX "terrains_enVedette_createdAt_idx" ON "terrains"("enVedette", "createdAt");

-- CreateIndex
CREATE INDEX "terrains_clientId_idx" ON "terrains"("clientId");

