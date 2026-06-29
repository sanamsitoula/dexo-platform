/**
 * Dexo v5 - 04: RESTAURANT demo data
 * Orders, reservations, invoices (sample).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed04RestaurantData() {
  console.log('  → 04-demo-data/restaurant-data');
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'spicegarden' } });
  if (!tenant) return;
  const fy = await prisma.fiscalYear.findFirst({ where: { tenantId: tenant.id } });
  if (!fy) { console.log('    no fiscal year for tenant, skipping'); return; }

  const firstBranch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (firstBranch) {
    for (let i = 0; i < 8; i++) {
      await prisma.branchSchedule.create({
        data: {
          branchId: firstBranch.id,
          className: `Order #${1000 + i}`,
          startTime: new Date(Date.now() - i * 3600000),
          endTime: new Date(Date.now() - i * 3600000 + 1800000),
          type: 'ORDER',
        } as any,
      });
    }

    for (let i = 0; i < 5; i++) {
      await prisma.branchSchedule.create({
        data: {
          branchId: firstBranch.id,
          className: `Reservation #${2000 + i}`,
          startTime: new Date(Date.now() + i * 86400000),
          endTime: new Date(Date.now() + i * 86400000 + 7200000),
          type: 'RESERVATION',
        } as any,
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    const amount = 1500 + (i % 4) * 500;
    await prisma.invoice.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        invoiceNumber: `SG-${Date.now()}-${i}`,
        invoiceType: 'STANDARD',
        invoiceDate: new Date(Date.now() - i * 86400000 * 3),
        subtotal: amount,
        taxableAmount: amount,
        vatAmount: amount * 0.13,
        totalAmount: amount * 1.13,
        paymentStatus: 'PAID' as any,
        dueDate: new Date(),
        createdBy: 'system',
        fiscalYear: { connect: { id: fy!.id } },
        customer: { create: { tenant: { connect: { id: tenant.id } }, name: `Guest ${i + 1}`, email: `guest${i}@example.com` } as any },
      } as any,
    });
  }
  console.log('    done');
}

if (require.main === module) {
  seed04RestaurantData()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
