/**
 * One-off reset: deletes ALL tenants and their scoped data (users, branches,
 * invoices, etc.), but keeps platform-level reference data intact: platform
 * admin user(s), plans, settings, languages, currencies, system
 * roles/permissions, domain/business type templates.
 *
 * Uses session_replication_role='replica' to bypass FK constraint checks
 * during the delete (dev-only reset, not something to run in production) —
 * many join tables (UserRoles, blog authorship, task assignment, etc.)
 * reference User without an ON DELETE rule, which blocks a plain deleteMany.
 *
 * Run: npx ts-node --transpile-only scripts/seed/reset-tenants-keep-platform.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, subdomain: true } });
  console.log(`Found ${tenants.length} tenant(s): ${tenants.map((t) => t.subdomain).join(', ') || '(none)'}`);

  const nonAdminIds = (await prisma.user.findMany({ where: { isPlatformAdmin: false }, select: { id: true } })).map((u) => u.id);
  console.log(`Non-platform-admin users to remove: ${nonAdminIds.length}`);

  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  try {
    const deletedTenants = await prisma.tenant.deleteMany({});
    console.log(`  ✓ tenants deleted: ${deletedTenants.count}`);

    if (nonAdminIds.length) {
      const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: nonAdminIds } } });
      console.log(`  ✓ non-platform-admin users deleted: ${deletedUsers.count}`);
    }
  } finally {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
  }

  const remainingAdmins = await prisma.user.findMany({ where: { isPlatformAdmin: true }, select: { email: true } });
  console.log(`Platform admin(s) kept: ${remainingAdmins.map((u) => u.email).join(', ') || '(none — check 00-platform seed ran)'}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Reset failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
