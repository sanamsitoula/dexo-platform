/**
 * Dexo v5 - Master Seed Runner
 *
 * Single entrypoint for every seed module in this repo — this is the ONLY
 * seed pipeline that should be run against a real database. It supersedes
 * the old prisma/seed.ts, prisma/seeds/, and root-level seed-*.ts scripts
 * (all retired — see docs/ci_cd.md history / CREDENTIALS.md).
 *
 * Idempotent. Re-running produces the same state (every step upserts or
 * find-then-creates — nothing here does an unconditional deleteMany).
 *
 * Order (each step depends only on tables populated by steps above it):
 *   00-platform     → platform admin user, plans, global settings
 *   01-templates    → BusinessTypeTemplate (all 12 domain types)
 *   02-domains      → Domain, DomainModule, DomainRole, DomainPermission,
 *                     DomainMenu, DomainWidget, DomainTheme
 *   03-tenants      → Tenant + Users: fitness-center (vrfitness), restaurant (spicegarden)
 *   04-demo-data    → per-tenant demo rows, depends on 03-tenants
 *   05-accounting   → ChartOfAccount + AccountingPeriod, depends on 03-tenants having a FiscalYear
 *   06-fitness-full-demo → tops up every fitness table, depends on 03/04
 *   07-billing-demo → Subscription/Invoice demo data, depends on 00 (plans) + 03 (tenants)
 *   08-marketplace  → marketplace demo data
 *   09-ecommerce-demo → demo storefront products for vrfitness + spicegarden,
 *                       depends on 03-tenants existing; opt-in per tenant,
 *                       non-fatal here since it's cosmetic demo data only
 */
import { seed00Platform } from './00-platform';
import { seed01Templates } from './01-domain-templates';
import { seed02Domains } from './02-domains';
import { seed03FitnessCenter } from './03-tenants/fitness-center';
import { seed03Restaurant } from './03-tenants/restaurant';
import { seed04FitnessData } from './04-demo-data/fitness-data';
import { seed04RestaurantData } from './04-demo-data/restaurant-data';
import { seed05Accounting } from './05-accounting';
import { seed06FitnessFullDemo } from './06-fitness-full-demo';
import { seed07BillingDemo } from './07-billing-demo';
import { seed08Marketplace } from './08-marketplace';
import { seed09EcommerceDemo } from './09-ecommerce-demo';

async function main() {
  console.log('🌱 Dexo v5 seed starting...');
  await seed00Platform();
  await seed01Templates();
  await seed02Domains();
  await seed03FitnessCenter();
  await seed03Restaurant();
  await seed04FitnessData();
  await seed04RestaurantData();
  await seed05Accounting();
  await seed06FitnessFullDemo();
  await seed07BillingDemo();
  await seed08Marketplace();

  for (const tenantSubdomain of ['vrfitness', 'spicegarden']) {
    try {
      await seed09EcommerceDemo(tenantSubdomain);
    } catch (e) {
      console.warn(`  ⚠ 09-ecommerce-demo skipped for ${tenantSubdomain}:`, (e as Error).message);
    }
  }

  console.log('✅ Seed complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
