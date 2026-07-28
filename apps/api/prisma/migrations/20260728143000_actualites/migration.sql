-- CreateTable
CREATE TABLE "actualites" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actualites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actualite_medias" (
    "id" TEXT NOT NULL,
    "actualiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actualite_medias_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "actualite_medias" ADD CONSTRAINT "actualite_medias_actualiteId_fkey" FOREIGN KEY ("actualiteId") REFERENCES "actualites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

