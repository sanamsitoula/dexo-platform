-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WebhookDeliveryStatus" ADD VALUE 'RETRYING';
ALTER TYPE "WebhookDeliveryStatus" ADD VALUE 'DEAD';

-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "nextRetryAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformChatwootConfig" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiAccessToken" TEXT,
    "platformAccountId" INTEGER,
    "platformInboxId" INTEGER,
    "platformWebsiteToken" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformChatwootConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantChatwootConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inboxId" INTEGER,
    "websiteToken" TEXT,
    "contactEmail" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantChatwootConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantChatwootConfig_tenantId_key" ON "TenantChatwootConfig"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_nextRetryAt_idx" ON "WebhookDelivery"("nextRetryAt");

-- AddForeignKey
ALTER TABLE "TenantChatwootConfig" ADD CONSTRAINT "TenantChatwootConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
