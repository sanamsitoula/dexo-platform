-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceUid" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "deviceUserId" TEXT;

-- CreateTable
CREATE TABLE "AttendanceDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "commKey" TEXT,
    "model" TEXT,
    "forceUdp" BOOLEAN NOT NULL DEFAULT false,
    "timeoutSec" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPullAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePullSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "recordsPulled" INTEGER NOT NULL DEFAULT 0,
    "newInserts" INTEGER NOT NULL DEFAULT 0,
    "errorDetail" TEXT,

    CONSTRAINT "AttendancePullSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceDevice_tenantId_idx" ON "AttendanceDevice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDevice_tenantId_ip_port_key" ON "AttendanceDevice"("tenantId", "ip", "port");

-- CreateIndex
CREATE INDEX "AttendancePullSession_tenantId_idx" ON "AttendancePullSession"("tenantId");

-- CreateIndex
CREATE INDEX "AttendancePullSession_deviceId_idx" ON "AttendancePullSession"("deviceId");

-- CreateIndex
CREATE INDEX "AttendancePullSession_startedAt_idx" ON "AttendancePullSession"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_deviceId_deviceUid_checkInTime_key" ON "Attendance"("deviceId", "deviceUid", "checkInTime");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePullSession" ADD CONSTRAINT "AttendancePullSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePullSession" ADD CONSTRAINT "AttendancePullSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

