-- Baseline for TenantTheme. The table was originally created on dev/prod
-- databases via `prisma db push` (never committed as a migration), so the
-- four later migrations that ALTER it (20260714174608_theme_draft_publish,
-- 20260714190000_theme_hero_layout, 20260714200000_theme_footer_config,
-- 20260714230000_theme_card_cta_icon_style) failed on any clean database
-- (CI's migrations check) with `relation "TenantTheme" does not exist`.
--
-- IF NOT EXISTS throughout: on databases where db push already created the
-- table (server, local dev) this migration is a no-op; on clean databases it
-- creates the table exactly as it looked before 20260714174608. The columns
-- those later migrations add (status, lastPublishedSnapshot, heroLayout,
-- footerConfig, cardStyle, ...) are deliberately NOT included here — the
-- later migrations add them, keeping the replay history consistent.

CREATE TABLE IF NOT EXISTS "TenantTheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseTemplateId" TEXT,
    "colorPrimary" TEXT,
    "colorAccent" TEXT,
    "colorBackground" TEXT,
    "colorSurface" TEXT,
    "colorText" TEXT,
    "colorTextSecondary" TEXT,
    "headingFont" TEXT,
    "bodyFont" TEXT,
    "borderRadius" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTheme_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantTheme_tenantId_idx" ON "TenantTheme"("tenantId");

CREATE INDEX IF NOT EXISTS "TenantTheme_tenantId_isActive_idx" ON "TenantTheme"("tenantId", "isActive");

-- AddForeignKey (guarded: ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantTheme_tenantId_fkey'
    ) THEN
        ALTER TABLE "TenantTheme"
            ADD CONSTRAINT "TenantTheme_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
