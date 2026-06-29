/**
 * Plan Seeding Script
 *
 * Seeds the 3 default Dexo plans: Free, Pro, Whitelabel
 * Run: npx ts-node --transpile-only seed-plans.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Perfect for trying Dexo. Free for 1 month, up to 5 customers per tenant.',
    priceCents: 0,
    pricePerCustomerCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 5,
    maxUsers: 2,
    maxBranches: 1,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: false,
      whiteLabel: false,
      advancedReports: false,
      prioritySupport: false,
      apiAccess: false,
    },
    limits: { customers: 5, users: 2, branches: 1, storage: 1 },
    isActive: true,
    isFeatured: false,
    trialDays: 30,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing businesses. $9.99/month per tenant with unlimited customers.',
    priceCents: 999,
    pricePerCustomerCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 9999,
    maxUsers: 50,
    maxBranches: 10,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: true,
      whiteLabel: false,
      advancedReports: true,
      prioritySupport: true,
      apiAccess: true,
    },
    limits: { customers: 9999, users: 50, branches: 10, storage: 50 },
    isActive: true,
    isFeatured: true,
    trialDays: 30,
  },
  {
    name: 'Whitelabel',
    slug: 'whitelabel',
    description: 'Run Dexo under your own brand. $1 per customer/month + base platform fee.',
    priceCents: 0,
    pricePerCustomerCents: 100,
    currency: 'USD',
    billingInterval: 'monthly',
    maxCustomers: 99999,
    maxUsers: 9999,
    maxBranches: 9999,
    features: {
      coreModules: true,
      basicReports: true,
      emailSupport: true,
      customBranding: true,
      whiteLabel: true,
      advancedReports: true,
      prioritySupport: true,
      apiAccess: true,
      customDomain: true,
      removeDexoBranding: true,
    },
    limits: { customers: 99999, users: 9999, branches: 9999, storage: 500 },
    isActive: true,
    isFeatured: false,
    trialDays: 30,
  },
];

async function main() {
  console.log('🌱 Seeding default plans...\n');

  for (const plan of PLANS) {
    try {
      const result = await prisma.plan.upsert({
        where: { slug: plan.slug },
        update: plan,
        create: plan,
      });
      console.log(`✅ Plan upserted: ${result.name} (${result.slug})`);
      console.log(`   Price: $${(result.priceCents / 100).toFixed(2)}/month`);
      if (result.pricePerCustomerCents > 0) {
        console.log(`   Per-customer: $${(result.pricePerCustomerCents / 100).toFixed(2)}/customer/month`);
      }
      console.log(`   Max customers: ${result.maxCustomers === 99999 || result.maxCustomers === 9999 ? 'unlimited' : result.maxCustomers}`);
      console.log(`   Trial: ${result.trialDays} days\n`);
    } catch (err) {
      console.error(`❌ Failed to seed plan ${plan.slug}:`, err);
    }
  }

  console.log('✅ Plan seeding complete!\n');
  console.log('📊 Summary:');
  console.log('   - Free:        $0/month, 5 customers, 30-day trial');
  console.log('   - Pro:         $9.99/month, unlimited customers, 30-day trial');
  console.log('   - Whitelabel:  $1/customer/month, full white-label');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
