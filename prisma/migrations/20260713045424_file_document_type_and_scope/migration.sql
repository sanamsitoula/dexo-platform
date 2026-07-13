-- CreateEnum
CREATE TYPE "FileScope" AS ENUM ('PLATFORM', 'TENANT');

-- CreateEnum
CREATE TYPE "FileDocumentType" AS ENUM ('LOGO', 'PROFILE_PIC', 'DOCUMENT', 'INVOICE', 'CONTRACT', 'ID_PROOF', 'OTHER');

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_tenantId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "documentType" "FileDocumentType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "scope" "FileScope" NOT NULL DEFAULT 'TENANT',
ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "File_scope_idx" ON "File"("scope");

-- CreateIndex
CREATE INDEX "File_documentType_idx" ON "File"("documentType");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
