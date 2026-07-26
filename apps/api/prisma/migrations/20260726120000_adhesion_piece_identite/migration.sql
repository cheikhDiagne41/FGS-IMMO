-- CreateEnum
CREATE TYPE "PieceType" AS ENUM ('CNI', 'PASSEPORT', 'EXTRAIT');

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('CNI_RECTO', 'CNI_VERSO', 'PASSEPORT', 'EXTRAIT', 'JUSTIFICATIF_DOMICILE', 'PHOTO', 'CONTRAT', 'CERTIFICAT_ATTRIBUTION', 'AUTRE');
ALTER TABLE "documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "adhesions" ADD COLUMN     "pieceNumero" TEXT,
ADD COLUMN     "pieceType" "PieceType";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "adhesionId" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_adhesionId_fkey" FOREIGN KEY ("adhesionId") REFERENCES "adhesions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

