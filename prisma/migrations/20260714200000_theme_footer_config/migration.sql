-- Workstream B item 3 (website_builder_remaining.md): footer structure as
-- data, same treatment as the heroLayout token added in migration
-- 20260714190000_theme_hero_layout.
ALTER TABLE "TenantTheme" ADD COLUMN "footerConfig" JSONB;
