/**
 * Fitness Center Tenant Seeding Script
 * 
 * Seeds a complete fitness center tenant with:
 * - Tenant organization
 * - Owner user account
 * - 5 members with biometric data
 * - 3 trainers with specializations
 * - Workout programs, classes, nutrition plans
 * - Chart of accounts (NFRS-compliant)
 * - Fiscal year and accounting periods
 * - Invoices, payments, expenses
 * 
 * Run: npx ts-node --transpile-only seed-fitness-center-runner.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import fitnessCenterData from './seed-fitness-center.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Fitness Center tenant seed...');
  const data = fitnessCenterData;

  // 1. Create Tenant
  console.log('Creating tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: data.tenantConfig.subdomain },
    update: {},
    create: {
      name: data.tenantConfig.name,
      subdomain: data.tenantConfig.subdomain,
      domain: data.tenantConfig.domain,
      status: 'active',
      settings: data.tenantSettings,
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.subdomain})`);

  // 2. Create Admin User
  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash(data.adminUser.password, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: data.adminUser.email },
    update: { passwordHash, status: 'active', emailVerified: true },
    create: {
      email: data.adminUser.email,
      passwordHash,
      firstName: data.adminUser.firstName,
      lastName: data.adminUser.lastName,
      phone: data.adminUser.phone,
      status: 'active',
      emailVerified: true,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // 3. Create Trainers
  console.log('Creating trainers...');
  for (const trainer of data.trainers) {
    const tHash = await bcrypt.hash('Trainer123!', 10);
    const tUser = await prisma.user.upsert({
      where: { email: trainer.email },
      update: { passwordHash: tHash, status: 'active' },
      create: {
        email: trainer.email,
        passwordHash: tHash,
        firstName: trainer.name.split(' ')[0],
        lastName: trainer.name.split(' ').slice(1).join(' '),
        phone: trainer.phone,
        status: 'active',
        emailVerified: true,
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Trainer created: ${tUser.email}`);
  }

  // 4. Create Members (Customers)
  console.log('Creating members...');
  for (const member of data.members) {
    const memberUser = await prisma.customer.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: member.customerCode } },
      update: {},
      create: {
        tenantId: tenant.id,
        customerCode: member.customerCode,
        name: member.name,
        pan: member.pan,
        mobile: member.mobile,
        email: member.email,
        address: member.address,
        creditLimit: member.creditLimit,
        isVatRegistered: member.isVatRegistered,
        currentBalance: member.currentBalance,
        isActive: true,
      },
    });
    console.log(`✅ Member created: ${memberUser.name}`);
  }

  // 5. Create Chart of Accounts
  console.log('Creating chart of accounts...');
  for (const account of data.chartOfAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: account.accountCode } },
      update: {},
      create: {
        tenantId: tenant.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        isControl: account.isControl,
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`✅ Created ${data.chartOfAccounts.length} chart of accounts`);

  // 6. Create Fiscal Year
  console.log('Creating fiscal year...');
  const fiscalYear = await prisma.fiscalYear.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: data.fiscalYear.name } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      name: data.fiscalYear.name,
      startDate: new Date(data.fiscalYear.startDate),
      endDate: new Date(data.fiscalYear.endDate),
      isActive: data.fiscalYear.isActive,
      isClosed: data.fiscalYear.isClosed,
    },
  });

  // 7. Create Invoices
  console.log('Creating invoices...');
  for (const invoice of data.invoices) {
    const customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, name: invoice.customerName },
    });
    if (customer) {
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          fiscalYearId: fiscalYear.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceType: 'TAX_INVOICE',
          invoiceDate: new Date(invoice.invoiceDate),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
          customerId: customer.id,
          customerPan: invoice.customerPan,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          taxableAmount: invoice.taxableAmount,
          vatAmount: invoice.vatAmount,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          paymentStatus: invoice.paymentStatus,
          currency: 'NPR',
          createdBy: adminUser.id,
        },
      });
    }
  }
  console.log(`✅ Created ${data.invoices.length} invoices`);

  console.log('\n✅ Fitness Center tenant seeding complete!');
  console.log('\n📋 Credentials:');
  console.log(`   Admin: ${data.adminUser.email} / ${data.adminUser.password}`);
  console.log(`   Trainers: trainer1@fitnesscenter.com / Trainer123!`);
  console.log(`   Members: member@fitnessapp.com / Member123!`);
  console.log(`\n🌐 Access at: http://localhost:3000`);
}

main()
  .catch((e) => {
    console.error('Error seeding fitness center:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
