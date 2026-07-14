-- Theme Builder Phase 3: draft/live isolation (see website_builder_remaining.md).
-- Adds a draft/published status to TenantTheme (mirroring PageStatus/MenuItemStatus)
-- plus a single "last known good" published-snapshot column for one-click revert.
-- No new table: Workstream A's site navigation config is stored as JSON on the
-- existing Tenant.settings column (no per-item ordering/nesting complexity that
-- would justify a dedicated table), so it needs no migration here.

-- CreateEnum
CREATE TYPE "ThemeStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "TenantTheme"
  ADD COLUMN "status" "ThemeStatus" NOT NULL DEFAULT 'published',
  ADD COLUMN "lastPublishedSnapshot" JSONB,
  ADD COLUMN "lastPublishedAt" TIMESTAMP(3);
