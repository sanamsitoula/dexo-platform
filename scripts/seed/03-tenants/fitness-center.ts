/**
 * Dexo v5 - 03: FITNESS_CENTER tenant seed (vrfitness)
 *
 * Tenant:       VR Fitness Center, subdomain=vrfitness
 * Lifecycle:    status=ACTIVE, sslStatus=ACTIVE
 * Users:        admin@/manager@/trainer1@/trainer2@/member1@/member2@
 * Branches:     HQ-KTM (HQ), BR-LAL, BR-BHA
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { email: 'admin@vrfitness.com',    pw: 'Admin123!',    firstName: 'Admin',    lastName: 'Owner',     role: 'OWNER' },
  { email: 'manager@vrfitness.com',  pw: 'Manager123!',  firstName: 'Manager',  lastName: 'HQ',        role: 'MANAGER' },
  { email: 'trainer1@vrfitness.com', pw: 'Trainer123!', firstName: 'Trainer1', lastName: 'Strength',  role: 'TRAINER' },
  { email: 'trainer2@vrfitness.com', pw: 'Trainer123!', firstName: 'Trainer2', lastName: 'Yoga',      role: 'TRAINER' },
  { email: 'member1@vrfitness.com',  pw: 'Member123!',  firstName: 'Member1',  lastName: 'Smith',     role: 'MEMBER' },
  { email: 'member2@vrfitness.com',  pw: 'Member123!',  firstName: 'Member2',  lastName: 'Jones',     role: 'MEMBER' },
];

const BRANCHES = [
  { code: 'HQ-KTM', name: 'Kathmandu HQ',  city: 'Kathmandu', isHQ: true },
  { code: 'BR-LAL', name: 'Lalitpur',      city: 'Lalitpur',  isHQ: false },
  { code: 'BR-BHA', name: 'Bhaktapur',     city: 'Bhaktapur', isHQ: false },
];

const CLASSES = ['Morning HIIT', 'Evening Yoga', 'Strength Basics', 'Zumba Friday'];

export async function seed03FitnessCenter() {
  console.log('  → 03-tenants/fitness-center (vrfitness)');

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'vrfitness' },
    update: { name: 'VR Fitness Center' },
    create: {
      name: 'VR Fitness Center',
      subdomain: 'vrfitness',
      status: 'active',
    },
  });

  await prisma.tenantLifecycle.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      status: 'ACTIVE',
      subdomainSlug: 'vrfitness',
      sslStatus: 'ACTIVE',
      provisionedAt: new Date(),
    },
  });

  await prisma.tenantOnboarding.upsert({
    where: { tenantId: tenant.id },
    update: { completed: true, profileComplete: true, brandingComplete: true, modulesComplete: true, teamComplete: true, websiteComplete: true, billingComplete: true, completedAt: new Date() },
    create: {
      tenantId: tenant.id,
      step: 6,
      totalSteps: 6,
      completed: true,
      completedAt: new Date(),
      profileComplete: true,
      brandingComplete: true,
      modulesComplete: true,
      teamComplete: true,
      websiteComplete: true,
      billingComplete: true,
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

  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: b.code } } as any,
      update: { name: b.name, city: b.city, isHeadquarters: b.isHQ },
      create: { tenantId: tenant.id, code: b.code, name: b.name, city: b.city, isHeadquarters: b.isHQ, country: 'Nepal' } as any,
    });
  }

  // Ensure a fiscal year exists for this tenant
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

  const hqBranch = await prisma.branch.findFirst({ where: { tenantId: tenant.id, isHeadquarters: true } });
  for (const c of CLASSES) {
    if (!hqBranch) continue;
    const existing = await prisma.branchSchedule.findFirst({ where: { branchId: hqBranch.id, className: c } });
    if (!existing) {
      await prisma.branchSchedule.create({ data: { branchId: hqBranch.id, className: c, startTime: new Date(), endTime: new Date(Date.now() + 3600000), type: 'CLASS' } as any });
    }
  }

  console.log('    done');
}

if (require.main === module) {
  seed03FitnessCenter()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
