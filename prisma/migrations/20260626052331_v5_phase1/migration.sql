-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETION_SCHEDULED', 'DELETED');

-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BusinessTypeTemplate" (
    "id" TEXT NOT NULL,
    "domainType" "DomainType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "heroImage" TEXT,
    "colorPrimary" TEXT NOT NULL,
    "colorAccent" TEXT NOT NULL,
    "colorBg" TEXT NOT NULL,
    "fontHeading" TEXT NOT NULL DEFAULT 'Inter',
    "fontBody" TEXT NOT NULL DEFAULT 'Inter',
    "websiteSections" JSONB NOT NULL,
    "onboardingSteps" JSONB NOT NULL,
    "dashboardLayout" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTypeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOnboarding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantOnboarding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 6,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "brandingComplete" BOOLEAN NOT NULL DEFAULT false,
    "modulesComplete" BOOLEAN NOT NULL DEFAULT false,
    "teamComplete" BOOLEAN NOT NULL DEFAULT false,
    "websiteComplete" BOOLEAN NOT NULL DEFAULT false,
    "billingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLifecycle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "LifecycleStatus" NOT NULL DEFAULT 'PROVISIONING',
    "subdomainSlug" TEXT NOT NULL,
    "customDomain" TEXT,
    "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "dnsToken" TEXT,
    "sslStatus" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "suspendReason" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionScheduledAt" TIMESTAMP(3),
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTypeTemplate_domainType_key" ON "BusinessTypeTemplate"("domainType");

-- CreateIndex
CREATE INDEX "CustomerOnboarding_tenantId_idx" ON "CustomerOnboarding"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerOnboarding_email_idx" ON "CustomerOnboarding"("email");

-- CreateIndex
CREATE INDEX "CustomerOnboarding_completed_idx" ON "CustomerOnboarding"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "TenantOnboarding_tenantId_key" ON "TenantOnboarding"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLifecycle_tenantId_key" ON "TenantLifecycle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLifecycle_subdomainSlug_key" ON "TenantLifecycle"("subdomainSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLifecycle_customDomain_key" ON "TenantLifecycle"("customDomain");

-- CreateIndex
CREATE INDEX "TenantLifecycle_status_idx" ON "TenantLifecycle"("status");

-- CreateIndex
CREATE INDEX "TenantLifecycle_subdomainSlug_idx" ON "TenantLifecycle"("subdomainSlug");

-- CreateIndex
CREATE INDEX "TenantLifecycle_customDomain_idx" ON "TenantLifecycle"("customDomain");

-- AddForeignKey
ALTER TABLE "CustomerOnboarding" ADD CONSTRAINT "CustomerOnboarding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOnboarding" ADD CONSTRAINT "CustomerOnboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboarding" ADD CONSTRAINT "TenantOnboarding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLifecycle" ADD CONSTRAINT "TenantLifecycle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
