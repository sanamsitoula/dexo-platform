/*
  Warnings:

  - The `eventTypes` column on the `WebhookEndpoint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `eventType` on the `WebhookDelivery` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "WebhookDelivery" DROP COLUMN "eventType",
ADD COLUMN     "eventType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WebhookEndpoint" DROP COLUMN "eventTypes",
ADD COLUMN     "eventTypes" TEXT[];

-- DropEnum
DROP TYPE "WebhookEventType";
