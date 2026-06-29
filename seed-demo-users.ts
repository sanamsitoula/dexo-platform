import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function upsertUser(opts: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isPlatformAdmin?: boolean;
  tenantId?: string | null;
}) {
  const passwordHash = await bcrypt.hash(opts.password, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      passwordHash,
      status: 'active',
      emailVerified: true,
      isPlatformAdmin: opts.isPlatformAdmin ?? false,
      tenantId: opts.tenantId ?? null,
      firstName: opts.firstName,
      lastName: opts.lastName,
    },
    create: {
      email: opts.email,
      passwordHash,
      firstName: opts.firstName,
      lastName: opts.lastName,
      status: 'active',
      emailVerified: true,
      isPlatformAdmin: opts.isPlatformAdmin ?? false,
      tenantId: opts.tenantId ?? null,
    },
  });
  return user;
}

async function main() {
  console.log('Seeding Dexo demo users (platform + tenant)...');

  // ---------------------------------------------------------------------------
  // Platform Admin: lives on the platform layer, no tenant scope.
  // Used to log in at http://localhost:3001 (admin console).
  // ---------------------------------------------------------------------------
  const platformAdmin = await upsertUser({
    email: 'admin@test.com',
    password: 'Admin@123',
    firstName: 'Platform',
    lastName: 'Admin',
    isPlatformAdmin: true,
  });
  console.log(`  Platform Admin: ${platformAdmin.email} / Admin@123`);

  // ---------------------------------------------------------------------------
  // Fitness Center tenant (also covers admin@test.com on the tenant layer
  // through the existing fitnessapp seed; we keep both for compatibility with
  // the legacy credentials listed in CREDENTIALS.md / run.bat).
  // ---------------------------------------------------------------------------
  const fitnessTenant = await prisma.tenant.upsert({
    where: { subdomain: 'fitness' },
    update: {},
    create: {
      name: 'Fitness Center Elite',
      subdomain: 'fitness',
      domain: 'fitness.com',
      status: 'active',
      settings: { theme: 'fitness' },
    },
  });
  console.log(`  Tenant: ${fitnessTenant.name} (${fitnessTenant.subdomain})`);

  const tenantAdmin = await upsertUser({
    email: 'admin@fitnesscenter.com',
    password: 'Admin123!',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: fitnessTenant.id,
  });
  console.log(`  Tenant Admin: ${tenantAdmin.email} / Admin123!`);

  const trainer = await upsertUser({
    email: 'trainer1@fitnesscenter.com',
    password: 'Trainer123!',
    firstName: 'Trainer',
    lastName: 'One',
    tenantId: fitnessTenant.id,
  });
  console.log(`  Trainer:      ${trainer.email} / Trainer123!`);

  const member = await upsertUser({
    email: 'member@fitnesscenter.com',
    password: 'Member123!',
    firstName: 'Demo',
    lastName: 'Member',
    tenantId: fitnessTenant.id,
  });
  console.log(`  Member:       ${member.email} / Member123!`);

  // ---------------------------------------------------------------------------
  // Fitnessapp tenant (created by the base prisma/seed.ts) — keep its
  // member@fitnessapp.com in sync so the run.bat "Member" line still works.
  // ---------------------------------------------------------------------------
  const fitnessAppTenant = await prisma.tenant.upsert({
    where: { subdomain: 'fitnessapp' },
    update: {},
    create: {
      name: 'FitnessApp',
      subdomain: 'fitnessapp',
      status: 'active',
      settings: { theme: 'fitness' },
    },
  });
  const memberFitnessApp = await upsertUser({
    email: 'member@fitnessapp.com',
    password: 'Member123!',
    firstName: 'Sarah',
    lastName: 'Williams',
    tenantId: fitnessAppTenant.id,
  });
  console.log(`  Member (fitnessapp): ${memberFitnessApp.email} / Member123!`);

  console.log('\nDone. Use these credentials:');
  console.log('  Platform Admin: admin@test.com / Admin@123              (port 3001)');
  console.log('  Tenant Admin:   admin@fitnesscenter.com / Admin123!     (port 3002)');
  console.log('  Trainer:        trainer1@fitnesscenter.com / Trainer123! (port 3002)');
  console.log('  Member:         member@fitnessapp.com / Member123!      (port 3002)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
