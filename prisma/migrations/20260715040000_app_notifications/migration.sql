-- In-app notifications for the mobile Notifications tab and tenant-admin
-- alert feed. MEMBER rows target one user; TENANT_ADMIN rows are a shared
-- per-tenant feed (userId null) so we don't fan out per admin user.

-- CreateEnum
CREATE TYPE "AppNotificationAudience" AS ENUM ('MEMBER', 'TENANT_ADMIN');

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "audience" "AppNotificationAudience" NOT NULL DEFAULT 'MEMBER',
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppNotification_tenantId_audience_isRead_idx" ON "AppNotification"("tenantId", "audience", "isRead");

-- CreateIndex
CREATE INDEX "AppNotification_userId_isRead_idx" ON "AppNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "AppNotification_createdAt_idx" ON "AppNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
