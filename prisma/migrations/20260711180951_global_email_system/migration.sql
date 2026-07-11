-- CreateTable
CREATE TABLE "PlatformEmailConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT,
    "pass" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "replyTo" TEXT,
    "dailyLimit" INTEGER,
    "monthlyLimit" INTEGER,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformEmailLog_tenantId_idx" ON "PlatformEmailLog"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformEmailLog_status_idx" ON "PlatformEmailLog"("status");

-- CreateIndex
CREATE INDEX "PlatformEmailLog_createdAt_idx" ON "PlatformEmailLog"("createdAt");
