-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'WEBSITE',
ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE INDEX "ContactMessage_channel_idx" ON "ContactMessage"("channel");
