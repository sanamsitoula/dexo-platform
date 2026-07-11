-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE "BlogCategory" ADD COLUMN     "thumbnail" TEXT;

-- AlterTable
ALTER TABLE "BlogTag" ADD COLUMN     "tenantId" TEXT;

-- CreateTable
CREATE TABLE "ChannelConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookSecret" TEXT,
    "credentials" JSONB,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelConfig_tenantId_idx" ON "ChannelConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConfig_tenantId_channel_key" ON "ChannelConfig"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "BlogTag_tenantId_idx" ON "BlogTag"("tenantId");
