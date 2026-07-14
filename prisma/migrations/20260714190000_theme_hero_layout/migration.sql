-- Workstream B item 1 (see website_builder_remaining.md): hero layout as a
-- Theme Builder-editable choice, instead of permanently locked to whichever
-- of the 60 WebsiteTemplates was picked at signup. Plain nullable text
-- column (not a Postgres enum) matching the same 5 HeroType values used in
-- packages/shared/src/themes/templates.ts (split/fullscreen/floating-cards/
-- editorial/bold-block) — validated at the application layer, same
-- free-text-column style already used for headingFont/bodyFont on this table.

-- AlterTable
ALTER TABLE "TenantTheme"
  ADD COLUMN "heroLayout" TEXT;
