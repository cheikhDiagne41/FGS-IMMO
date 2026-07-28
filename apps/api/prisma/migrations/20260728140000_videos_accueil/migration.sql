-- CreateTable
CREATE TABLE "videos_accueil" (
    "id" TEXT NOT NULL,
    "titre" TEXT,
    "videoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_accueil_pkey" PRIMARY KEY ("id")
);

