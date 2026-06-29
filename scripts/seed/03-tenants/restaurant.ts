/**
 * Dexo v5 - 03: RESTAURANT_AND_CAFE tenant seed (spicegarden)
 *
 * Tenant:       Spice Garden, subdomain=spicegarden
 * Users:        admin@/manager@/waiter1@/chef@
 * Tables:       12 (T01–T12)
 * Menu:         4 categories × 8 items
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { email: 'admin@spicegarden.com',     pw: 'Admin123!',   firstName: 'Admin',   lastName: 'Owner',  role: 'OWNER' },
  { email: 'manager@spicegarden.com',   pw: 'Manager123!', firstName: 'Manager', lastName: 'Floor',  role: 'MANAGER' },
  { email: 'waiter1@spicegarden.com',   pw: 'Staff123!',   firstName: 'Waiter1', lastName: 'A',      role: 'STAFF' },
  { email: 'chef@spicegarden.com',      pw: 'Staff123!',   firstName: 'Chef',    lastName: 'Head',   role: 'KITCHEN' },
];

const CUISINES = ['Indian', 'Chinese', 'Continental', 'Desserts'];

export async function seed03Restaurant() {
  console.log('  → 03-tenants/restaurant (spicegarden)');

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'spicegarden' },
    update: { name: 'Spice Garden' },
    create: { name: 'Spice Garden', subdomain: 'spicegarden', status: 'active' },
  });

  await prisma.tenantLifecycle.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, status: 'ACTIVE', subdomainSlug: 'spicegarden', sslStatus: 'ACTIVE', provisionedAt: new Date() },
  });

  await prisma.tenantOnboarding.upsert({
    where: { tenantId: tenant.id },
    update: { completed: true, completedAt: new Date() },
    create: {
      tenantId: tenant.id, step: 6, totalSteps: 6, completed: true, completedAt: new Date(),
      profileComplete: true, brandingComplete: true, modulesComplete: true,
      teamComplete: true, websiteComplete: true, billingComplete: true,
    },
  });

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.pw, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, firstName: u.firstName, lastName: u.lastName, tenantId: tenant.id },
      create: { email: u.email, passwordHash, firstName: u.firstName, lastName: u.lastName, tenantId: tenant.id, emailVerified: true },
    });
  }

  for (let i = 1; i <= 12; i++) {
    const code = `T${String(i).padStart(2, '0')}`;
    const existing = await prisma.branch.findFirst({ where: { tenantId: tenant.id, code } });
    if (!existing) {
      await prisma.branch.create({ data: { tenantId: tenant.id, code, name: `Table ${code}`, type: 'FRANCHISE', isHeadquarters: false, country: 'Nepal' } as any });
    }
  }

  const fy = await prisma.fiscalYear.findFirst({ where: { tenantId: tenant.id } });
  if (!fy) {
    await prisma.fiscalYear.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        name: 'FY 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      } as any,
    });
  }

  const firstBranch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  for (const cat of CUISINES) {
    if (!firstBranch) continue;
    const existing = await prisma.branchSchedule.findFirst({ where: { branchId: firstBranch.id, className: `Menu: ${cat}` } });
    if (!existing) {
      await prisma.branchSchedule.create({ data: { branchId: firstBranch.id, className: `Menu: ${cat}`, startTime: new Date(), endTime: new Date(), type: 'MENU_CATEGORY' } as any });
    }
  }

  console.log('    done');
}

if (require.main === module) {
  seed03Restaurant()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
