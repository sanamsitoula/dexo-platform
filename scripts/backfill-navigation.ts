/**
 * One-time backfill: gives every EXISTING tenant (provisioned before Site
 * Navigation existed) a real nav item list on Tenant.settings.navigation.items
 * — About/Services/Contact (if those Pages exist), Blog (only if >=1
 * published post), Shop (only if on an ecommerce domain) and Book — the SAME
 * auto-populate logic SiteNavigationService.buildDefaultItems runs lazily on
 * first API read, run here proactively so nothing depends on a tenant-admin
 * visit to the new Navigation tab to get real content.
 *
 * Idempotent — skips any tenant that already has nav items stored, so it's
 * safe to re-run.
 *
 * Run: npx ts-node --transpile-only scripts/backfill-navigation.ts
 *      npx ts-node --transpile-only scripts/backfill-navigation.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

function isEcommerceDomainCode(domainCode?: string | null): boolean {
  const d = (domainCode || '').toLowerCase();
  return d.includes('ecommerce') || d.includes('e-commerce') || d.includes('retail') || d.includes('shop');
}

function randomId(): string {
  return `nav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function buildDefaultItems(tenantId: string) {
  const [aboutPage, servicesPage, contactPage, publishedPostCount, tenantDomain] = await Promise.all([
    prisma.page.findFirst({ where: { tenantId, slug: 'about' }, select: { id: true } }),
    prisma.page.findFirst({ where: { tenantId, slug: 'services' }, select: { id: true } }),
    prisma.page.findFirst({ where: { tenantId, slug: 'contact' }, select: { id: true } }),
    prisma.blog.count({ where: { tenantId, status: 'published' } }).catch(() => 0),
    prisma.tenantDomain.findFirst({ where: { tenantId }, include: { domain: true } }).catch(() => null),
  ]);
  const domainCode = (tenantDomain as any)?.domain?.code as string | undefined;
  const isEcommerce = isEcommerceDomainCode(domainCode);

  let order = 0;
  const items: any[] = [];
  if (aboutPage) items.push({ id: randomId(), label: 'About', order: order++, kind: 'page', targetValue: 'about', enabled: true });
  if (servicesPage) items.push({ id: randomId(), label: 'Services', order: order++, kind: 'page', targetValue: 'services', enabled: true });
  if (isEcommerce) items.push({ id: randomId(), label: 'Shop', order: order++, kind: 'route', targetValue: '/shop', enabled: true });
  if ((publishedPostCount as number) > 0) items.push({ id: randomId(), label: 'Blog', order: order++, kind: 'route', targetValue: '/blog', enabled: true });
  items.push({ id: randomId(), label: 'Book', order: order++, kind: 'route', targetValue: '/book', enabled: true });
  if (contactPage) items.push({ id: randomId(), label: 'Contact', order: order++, kind: 'page', targetValue: 'contact', enabled: true });
  return items;
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    select: { id: true, subdomain: true, settings: true },
  });
  console.log(`Checking ${tenants.length} active tenant(s)...`);

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const existing = ((tenant.settings as any)?.navigation?.items) || [];
    if (Array.isArray(existing) && existing.length > 0) { skipped++; continue; }

    const items = await buildDefaultItems(tenant.id);
    if (items.length === 0) { skipped++; continue; }

    console.log(`  [nav] ${tenant.subdomain}: seeding ${items.length} nav item(s) — ${items.map((i) => i.label).join(', ')}`);
    created++;
    if (DRY) continue;

    const nextSettings = {
      ...((tenant.settings as any) || {}),
      navigation: { ...(((tenant.settings as any) || {}).navigation || {}), items },
    };
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: nextSettings } });
  }

  console.log(`\nDone. Nav lists created: ${created}, skipped (already had items or nothing to seed): ${skipped}.`);
  if (DRY) console.log('[dry-run] no changes were written.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Backfill failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
