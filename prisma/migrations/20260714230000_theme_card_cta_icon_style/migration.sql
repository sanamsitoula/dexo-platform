-- Workstream B item 4 (website_builder_remaining.md): card/button/icon
-- style tokens on TenantTheme, same recipe as heroLayout/footerConfig.
ALTER TABLE "TenantTheme" ADD COLUMN "cardStyle" TEXT;
ALTER TABLE "TenantTheme" ADD COLUMN "ctaStyle" TEXT;
ALTER TABLE "TenantTheme" ADD COLUMN "iconStyle" TEXT;
