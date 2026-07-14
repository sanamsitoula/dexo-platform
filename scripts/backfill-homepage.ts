/**
 * One-time backfill: gives every EXISTING tenant (provisioned before the
 * Home-page-seeding feature existed) a real, editable "Home" Page +
 * PageSections generated from their chosen website template — the same
 * seeding logic that now runs automatically at signup
 * (apps/api/src/modules/tenant-lifecycle/provisioning.service.ts).
 *
 * Idempotent — skips any tenant that already has a Page with isHomepage:true,
 * so it's safe to re-run (e.g. after adding more tenants) without creating
 * duplicates.
 *
 * Also backfills a real, active TenantTheme for any tenant missing one, so
 * "the color that's live" and "the thing Theme Builder lets you edit" are
 * never disconnected, matching what provisioning now does automatically.
 *
 * Run: npx ts-node --transpile-only scripts/backfill-homepage.ts
 *      npx ts-node --transpile-only scripts/backfill-homepage.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';
import { getTemplate } from '../packages/shared/src/themes';
import { getComponentDef, mapTemplateSectionToComponent } from '../packages/shared/src/page-builder';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    select: { id: true, subdomain: true, settings: true },
  });
  console.log(`Checking ${tenants.length} active tenant(s)...`);

  let homeCreated = 0;
  let themeCreated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const branding = ((tenant.settings as any) || {}).branding || {};
    const templateId: string | undefined = branding.templateId;
    const tpl = templateId ? getTemplate(templateId) : undefined;
    if (!tpl) { skipped++; continue; } // nothing chosen yet — nothing to seed from

    const [existingHome, existingThemeCount] = await Promise.all([
      prisma.page.findFirst({ where: { tenantId: tenant.id, isHomepage: true } }),
      prisma.tenantTheme.count({ where: { tenantId: tenant.id } }),
    ]);

    if (existingThemeCount === 0) {
      console.log(`  [theme] ${tenant.subdomain}: seeding "${tpl.templateName} (from backfill)"`);
      themeCreated++;
      if (!DRY) {
        await prisma.tenantTheme.create({
          data: {
            tenantId: tenant.id,
            name: `${tpl.templateName} (from backfill)`,
            baseTemplateId: templateId,
            colorPrimary: branding.colorPrimary || tpl.palette.primary,
            colorAccent: branding.colorAccent || tpl.palette.accent,
            colorBackground: tpl.palette.background,
            colorSurface: tpl.palette.surface,
            colorText: tpl.palette.text,
            colorTextSecondary: tpl.palette.textSecondary,
            borderRadius: Math.min(tpl.borderRadius, 14),
            isActive: true,
          },
        });
      }
    }

    if (existingHome) { continue; }

    console.log(`  [home] ${tenant.subdomain}: seeding Home page (${tpl.sections.length} template sections)`);
    homeCreated++;
    if (DRY) continue;

    const homePage = await prisma.page.create({
      data: { tenantId: tenant.id, name: 'Home', slug: 'home', template: 'default', status: 'published', isHomepage: true },
    });
    let sortOrder = 0;
    for (const keyword of tpl.sections) {
      const componentType = mapTemplateSectionToComponent(keyword);
      // Skip "hero" — the outer TemplateHome/EcommerceHome shell already
      // renders its own hero from tpl.hero; adding a "hero" PageSection too
      // duplicates it. See the matching comment in provisioning.service.ts.
      if (!componentType || componentType === 'hero') continue;
      const def = getComponentDef(componentType);
      let content: Record<string, any> = def?.defaultContent || {};
      if (componentType === 'cta') content = { ...content, ctaLabel: tpl.hero.cta };
      await prisma.pageSection.create({
        data: { tenantId: tenant.id, pageId: homePage.id, componentType, content, sortOrder: sortOrder++, status: 'published' },
      });
    }
  }

  console.log(`\nDone. Homes created: ${homeCreated}, Themes created: ${themeCreated}, skipped (no template chosen): ${skipped}.`);
  if (DRY) console.log('[dry-run] no changes were written.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Backfill failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
