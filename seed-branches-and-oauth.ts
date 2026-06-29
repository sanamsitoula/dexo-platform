/**
 * Branch & Social Login Seeding Script
 *
 * Seeds:
 * - 5 branches for the Fitness Center tenant
 * - Branch-user assignments (trainers, managers, receptionists)
 * - Branch expenses for financial tracking
 * - Platform-level OAuth configurations
 * - Tenant-level OAuth configurations
 *
 * Run: npx ts-node --transpile-only seed-branches-and-oauth.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import branchData from './seed-branches.js';

const prisma = new PrismaClient();

async function seedBranchesAndOAuth() {
  console.log('Seeding branches and OAuth configurations...');

  // 1. Get the Fitness Center tenant (assumes already seeded)
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: 'fitness' },
  });

  if (!tenant) {
    console.error('Fitness Center tenant not found. Please run fitness center seed first.');
    return;
  }

  console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create branches
  const branchMap = new Map();
  for (const branchConfig of branchData.branches) {
    const existing = await prisma.branch.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: branchConfig.code } },
    });
    if (existing) {
      console.log(`Branch ${branchConfig.code} already exists, skipping`);
      branchMap.set(branchConfig.code, existing);
      continue;
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: branchConfig.code,
        name: branchConfig.name,
        slug: branchConfig.slug,
        type: branchConfig.type,
        email: branchConfig.email,
        phone: branchConfig.phone,
        address: branchConfig.address,
        city: branchConfig.city,
        state: branchConfig.state,
        country: branchConfig.country,
        postalCode: branchConfig.postalCode,
        latitude: branchConfig.latitude,
        longitude: branchConfig.longitude,
        timezone: branchConfig.timezone,
        currency: branchConfig.currency,
        isHeadquarters: branchConfig.isHeadquarters,
        operatingHours: branchConfig.operatingHours,
        status: 'active',
        openedAt: new Date('2024-01-01'),
      },
    });
    branchMap.set(branchConfig.code, branch);
    console.log(`Created branch: ${branch.name} (${branch.code})`);
  }

  // 3. Create branch users (assign users to branches)
  for (const userBranch of branchData.branchUsers) {
    const branch = branchMap.get(userBranch.branchCode);
    if (!branch) continue;

    const user = await prisma.user.findUnique({
      where: { email: userBranch.email },
    });
    if (!user) {
      console.log(`User ${userBranch.email} not found, skipping`);
      continue;
    }

    const existing = await prisma.branchUser.findFirst({
      where: { branchId: branch.id, userId: user.id, role: userBranch.role },
    });
    if (existing) {
      console.log(`User ${userBranch.email} already assigned to ${userBranch.branchCode}, skipping`);
      continue;
    }

    await prisma.branchUser.create({
      data: {
        branchId: branch.id,
        userId: user.id,
        role: userBranch.role,
        isPrimary: userBranch.isPrimary || false,
        isActive: true,
        startDate: new Date('2024-01-01'),
      },
    });
    console.log(`Assigned ${userBranch.email} to ${userBranch.branchCode} as ${userBranch.role}`);
  }

  // 4. Create branch expenses
  for (const expense of branchData.branchExpenses) {
    const branch = branchMap.get(expense.branchCode);
    if (!branch) continue;

    const existing = await prisma.branchExpense.findFirst({
      where: {
        branchId: branch.id,
        description: expense.description,
        expenseDate: new Date(expense.expenseDate),
      },
    });
    if (existing) continue;

    await prisma.branchExpense.create({
      data: {
        branchId: branch.id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        currency: 'NPR',
        expenseDate: new Date(expense.expenseDate),
        status: 'approved',
        approvedBy: (await prisma.user.findFirst({ where: { email: 'admin@fitnesscenter.com' } }))?.id,
      },
    });
    console.log(`Created expense: ${expense.description} - NPR ${expense.amount}`);
  }

  // 5. Create Platform-level OAuth configurations
  console.log('\nSeeding platform OAuth configurations...');

  const platformOAuthConfigs = [
    {
      provider: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID || 'google-platform-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-platform-secret',
      redirectUri: `${process.env.ADMIN_URL || 'http://localhost:3001'}/auth/social/callback`,
      scope: 'openid email profile',
      isEnabled: true,
    },
    {
      provider: 'github',
      clientId: process.env.GITHUB_CLIENT_ID || 'github-platform-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-platform-secret',
      redirectUri: `${process.env.ADMIN_URL || 'http://localhost:3001'}/auth/social/callback`,
      scope: 'read:user user:email',
      isEnabled: true,
    },
    {
      provider: 'apple',
      clientId: process.env.APPLE_CLIENT_ID || 'apple-platform-client-id',
      clientSecret: process.env.APPLE_CLIENT_SECRET || 'apple-platform-secret',
      redirectUri: `${process.env.ADMIN_URL || 'http://localhost:3001'}/auth/social/callback`,
      scope: 'openid email name',
      isEnabled: true,
    },
  ];

  for (const config of platformOAuthConfigs) {
    await prisma.platformOAuthConfig.upsert({
      where: { provider: config.provider as any },
      create: config as any,
      update: config as any,
    });
    console.log(`Configured platform ${config.provider} OAuth`);
  }

  // 6. Create Tenant-level OAuth configurations
  console.log('\nSeeding tenant OAuth configurations...');

  const tenantOAuthConfigs = [
    {
      provider: 'google',
      clientId: process.env.GOOGLE_TENANT_CLIENT_ID || 'google-tenant-client-id',
      redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/social/callback`,
      scope: 'openid email profile',
      isEnabled: true,
      autoCreateUser: true,
    },
    {
      provider: 'github',
      clientId: process.env.GITHUB_TENANT_CLIENT_ID || 'github-tenant-client-id',
      redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/social/callback`,
      scope: 'read:user user:email',
      isEnabled: true,
      autoCreateUser: true,
    },
    {
      provider: 'apple',
      clientId: process.env.APPLE_TENANT_CLIENT_ID || 'apple-tenant-client-id',
      redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/social/callback`,
      scope: 'openid email name',
      isEnabled: true,
      autoCreateUser: true,
    },
  ];

  for (const config of tenantOAuthConfigs) {
    await prisma.tenantOAuthConfig.upsert({
      where: { tenantId_provider: { tenantId: tenant.id, provider: config.provider as any } },
      create: { ...config, tenantId: tenant.id } as any,
      update: config as any,
    });
    console.log(`Configured tenant ${config.provider} OAuth for ${tenant.name}`);
  }

  console.log('\n✅ Branches and OAuth seeding complete!');
  console.log('\nSummary:');
  console.log(`- Branches: ${branchData.branches.length}`);
  console.log(`- Branch Users: ${branchData.branchUsers.length}`);
  console.log(`- Branch Expenses: ${branchData.branchExpenses.length}`);
  console.log(`- Platform OAuth Providers: ${platformOAuthConfigs.length}`);
  console.log(`- Tenant OAuth Providers: ${tenantOAuthConfigs.length}`);
}

seedBranchesAndOAuth()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
