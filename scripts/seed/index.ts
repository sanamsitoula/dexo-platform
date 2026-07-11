/**
 * Dexo v5 - Master Seed Runner
 *
 * Idempotent. Re-running produces the same state.
 *
 * Order:
 *   00-platform   → platform admin user, plans, global settings
 *   01-templates  → BusinessTypeTemplate (all 12 domain types)
 *   02-domains    → Domain, DomainModule, DomainRole, DomainPermission,
 *                   DomainMenu, DomainWidget, DomainTheme
 *   03-tenants    → fitness-center, restaurant
 *   04-demo-data  → fitness-data, restaurant-data
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
  console.log('✅ Seed complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
