-- CreateTable
CREATE TABLE "membres_gouvernance" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "biographie" TEXT,
    "photoUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membres_gouvernance_pkey" PRIMARY KEY ("id")
);

