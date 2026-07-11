-- CreateTable
CREATE TABLE "TenantWhatsAppConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT,
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "webhookVerifyToken" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "templates" JSONB,
    "optOutList" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantWhatsAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantWhatsAppConfig_tenantId_idx" ON "TenantWhatsAppConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TenantWhatsAppConfig_phoneNumber_idx" ON "TenantWhatsAppConfig"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TenantWhatsAppConfig_tenantId_key" ON "TenantWhatsAppConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantWhatsAppConfig" ADD CONSTRAINT "TenantWhatsAppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
