-- CreateTable
CREATE TABLE "partenaires" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "siteWeb" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partenaires_pkey" PRIMARY KEY ("id")
);

