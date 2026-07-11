-- CreateTable
CREATE TABLE "TenantModuleOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "setBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantModuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantModuleOverride_tenantId_idx" ON "TenantModuleOverride"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantModuleOverride_tenantId_moduleKey_key" ON "TenantModuleOverride"("tenantId", "moduleKey");

-- AddForeignKey
ALTER TABLE "TenantModuleOverride" ADD CONSTRAINT "TenantModuleOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
