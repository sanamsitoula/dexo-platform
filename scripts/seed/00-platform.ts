/**
 * Dexo v5 - 00: Platform admin, plans, global settings
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed00Platform() {
  console.log('  → 00-platform');

  const adminEmail = 'admin@test.com';
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPassword, isPlatformAdmin: true },
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      isPlatformAdmin: true,
      emailVerified: true,
    },
  });

  const plans = [
    { slug: 'FREE',       name: 'Free',       priceCents: 0,     maxUsers: 5,    maxBranches: 1 },
    { slug: 'STARTER',    name: 'Starter',    priceCents: 2900,  maxUsers: 25,   maxBranches: 3 },
    { slug: 'GROWTH',     name: 'Growth',     priceCents: 9900,  maxUsers: 100,  maxBranches: 10 },
    { slug: 'ENTERPRISE', name: 'Enterprise', priceCents: 49900, maxUsers: 1000, maxBranches: 100 },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  const settings = [
    { key: 'platform.name', value: 'Dexo' },
    { key: 'platform.tagline', value: 'Domain-Driven Multi-Tenant SaaS' },
    { key: 'platform.signup_enabled', value: 'true' },
  ];
  for (const s of settings) {
    const existing = await prisma.setting.findFirst({ where: { key: s.key, tenantId: null } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: s.value } });
    } else {
      await prisma.setting.create({ data: { key: s.key, value: s.value } as any });
    }
  }
}

if (require.main === module) {
  seed00Platform()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
