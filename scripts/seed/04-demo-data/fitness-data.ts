/**
 * Dexo v5 - 04: FITNESS demo data
 * Members, classes, invoices, attendance (sample).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed04FitnessData() {
  console.log('  → 04-demo-data/fitness-data');
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'vrfitness' } });
  if (!tenant) return;
  const fy = await prisma.fiscalYear.findFirst({ where: { tenantId: tenant.id } });
  if (!fy) { console.log('    no fiscal year for tenant, skipping'); return; }

  const memberTemplate = (i: number) => ({
    tenantId: tenant.id,
    email: `member${i}@vrfitness.com`,
    firstName: `Member${i}`,
    lastName: 'Demo',
    passwordHash: '$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder',
    emailVerified: true,
  });

  for (let i = 3; i <= 10; i++) {
    await prisma.user.upsert({
      where: { email: `member${i}@vrfitness.com` },
      update: {},
      create: memberTemplate(i),
    });
  }

  // Ensure customer records exist for invoices
  for (let i = 1; i <= 10; i++) {
    const email = `member${i}@vrfitness.com`;
    const existing = await prisma.customer.findFirst({ where: { tenantId: tenant.id, email } });
    if (!existing) {
      await prisma.customer.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          name: `Member${i} Demo`,
          email,
        } as any,
      });
    }
  }
  const memberCustomers = await prisma.customer.findMany({ where: { tenantId: tenant.id, email: { contains: '@vrfitness.com' } } });

  for (let i = 0; i < 15; i++) {
    const amount = 2500 + (i % 5) * 1000;
    const status = i % 3 === 0 ? 'PAID' : i % 3 === 1 ? 'PENDING' : 'OVERDUE';
    const memberIdx = i % Math.max(1, memberCustomers.length);
    const cust = memberCustomers[memberIdx];
    await prisma.invoice.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        invoiceNumber: `INV-${Date.now()}-${i}`,
        invoiceType: 'STANDARD',
        invoiceDate: new Date(Date.now() - i * 86400000 * 7),
        subtotal: amount,
        taxableAmount: amount,
        vatAmount: amount * 0.13,
        totalAmount: amount * 1.13,
        paymentStatus: status as any,
        dueDate: new Date(Date.now() + (15 - i) * 86400000),
        createdBy: 'system',
        fiscalYear: { connect: { id: fy!.id } },
        customer: cust ? { connect: { id: cust.id } } : { create: { tenant: { connect: { id: tenant.id } }, name: `Member${(i % 8) + 1} Demo`, email: `member${(i % 8) + 1}@vrfitness.com` } as any },
      } as any,
    });
  }
  console.log('    done');
}

if (require.main === module) {
  seed04FitnessData()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
