/**
 * Dexo v5 - Clean script
 *
 * Deletes all seed data in the correct order to avoid FK constraint errors.
 * Each delete is wrapped in try/catch and logs the count deleted.
 *
 * Run: npm run db:seed:clean
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Model = keyof typeof prisma & string;

const models: Model[] = [
  'customerOnboarding',
  'tenantOnboarding',
  'tenantLifecycle',
  'contactMessage',
  'branchUser',
  'branchSchedule',
  'attendance',
  'branchExpense',
  'branchReport',
  'oAuthAccount',
  'tenantOAuthConfig',
  'tenantEnabledModule',
  'tenantDomain',
  'branch',
  'invoice',
  'payment',
  'journalEntry',
  'user',
  'tenant',
  'businessTypeTemplate',
  'domainPermission',
  'domainMenu',
  'domainWidget',
  'domainTheme',
  'domainRole',
  'domainModule',
  'domain',
  'plan',
  'platformOAuthConfig',
  'setting',
];

async function safeDelete(model: Model): Promise<number> {
  try {
    const delegate = prisma[model] as unknown as {
      deleteMany: (args?: unknown) => Promise<{ count: number }>;
    };
    const result = await delegate.deleteMany();
    console.log(`  ✓ ${model}: ${result.count}`);
    return result.count;
  } catch (e: any) {
    console.log(`  - ${model}: skipped (${e.code || e.message})`);
    return 0;
  }
}

async function main() {
  console.log('🧹 Cleaning seed data...');
  for (const m of models) {
    await safeDelete(m);
  }
  console.log('✅ Clean complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Clean failed:', err);
    process.exit(1);
  });
