/**
 * Dexo v5 - 07: BILLING demo data (idempotent)
 *
 * Two money flows so every finance screen has data:
 *  1. tenant → platform: Plans (module packages) + active Subscriptions
 *     for the demo tenants (feeds :3002/subscriptions & platform billing).
 *  2. customer → tenant: PaymentReceived rows against existing vrfitness
 *     invoices (feeds NFRS reports — cash flow, AR aging, payments received).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 86400000;

// Plans double as MODULE PACKAGES: features.modules lists what the package
// unlocks — the platform-admin Subscriptions screen edits these toggles.
const PLAN_DEFS = [
  {
    slug: 'free', name: 'Free', priceCents: 0, trialDays: 0, maxUsers: 3, maxBranches: 1,
    features: {
      modules: { crm: true, blog: false, billing_invoice: false, invoice_print: false, attendance: false, website_builder: true, payments_online: false, reports_nfrs: false, announcements: false },
      support: 'community',
    },
  },
  {
    slug: 'starter', name: 'Starter', priceCents: 290000, trialDays: 14, maxUsers: 10, maxBranches: 2,
    features: {
      modules: { crm: true, blog: true, billing_invoice: true, invoice_print: true, attendance: false, website_builder: true, payments_online: true, reports_nfrs: false, announcements: true },
      support: 'email',
    },
  },
  {
    slug: 'pro', name: 'Pro', priceCents: 790000, trialDays: 14, maxUsers: 50, maxBranches: 10, isFeatured: true,
    features: {
      modules: { crm: true, blog: true, billing_invoice: true, invoice_print: true, attendance: true, website_builder: true, payments_online: true, reports_nfrs: true, announcements: true },
      support: 'priority',
    },
  },
];

export async function seed07BillingDemo() {
  console.log('  → 07-billing-demo');

  // ---- 1) Platform plans (module packages) ----
  const plans: Record<string, any> = {};
  for (const d of PLAN_DEFS) {
    plans[d.slug] = await prisma.plan.upsert({
      where: { slug: d.slug },
      update: { features: d.features as any },
      create: {
        slug: d.slug, name: d.name, description: `${d.name} package`,
        priceCents: d.priceCents, currency: 'NPR', billingInterval: 'monthly',
        maxUsers: d.maxUsers, maxBranches: d.maxBranches, trialDays: d.trialDays,
        isFeatured: (d as any).isFeatured ?? false, features: d.features as any,
      },
    });
  }

  // ---- tenant → platform subscriptions ----
  const subMap: Array<[string, string]> = [['vrfitness', 'pro'], ['spicegarden', 'starter'], ['bishnufit', 'free']];
  for (const [sub, planSlug] of subMap) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: sub } });
    if (!tenant) continue;
    const existing = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id, planId: plans[planSlug].id, status: 'active',
          currentPeriodStart: new Date(Date.now() - 10 * DAY),
          currentPeriodEnd: new Date(Date.now() + 20 * DAY),
        },
      });
    }
    await prisma.tenant.update({ where: { id: tenant.id }, data: { planId: plans[planSlug].id } });
  }
  console.log('    plans + subscriptions ready');

  // ---- 2) customer → tenant sales invoices + payments + GL (vrfitness) ----
  // Feeds tenant-admin NFRS/finance reports: income statement, VAT return,
  // AR aging, payments received, balance sheet (via posted journal entries).
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'vrfitness' } });
  if (!tenant) return;
  await seedTenantFinanceDemo(tenant.id);
  console.log('    done');
}

// ---------------------------------------------------------------------------
// vrfitness finance demo (idempotent — keyed on INV-DEMO-* / RCPT-DEMO-* / JE-DEMO-*)
// ---------------------------------------------------------------------------

type DemoInvoice = {
  no: string;                 // invoiceNumber (unique per tenant)
  daysAgo: number;            // invoiceDate = now - daysAgo
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  items: Array<{ description: string; qty: number; unitPrice: number }>;
  paidPct?: number;           // for PARTIAL
  method?: string;
};

const DEMO_INVOICES: DemoInvoice[] = [
  { no: 'INV-DEMO-001', daysAgo: 88, status: 'PAID',    method: 'CASH',          items: [{ description: 'Monthly Membership — Gold', qty: 1, unitPrice: 4500 }] },
  { no: 'INV-DEMO-002', daysAgo: 84, status: 'PAID',    method: 'ESEWA',         items: [{ description: 'Monthly Membership — Silver', qty: 1, unitPrice: 3000 }, { description: 'Locker Rental', qty: 1, unitPrice: 500 }] },
  { no: 'INV-DEMO-003', daysAgo: 80, status: 'OVERDUE',                          items: [{ description: 'Quarterly Membership — Gold', qty: 1, unitPrice: 12000 }] },
  { no: 'INV-DEMO-004', daysAgo: 72, status: 'PAID',    method: 'KHALTI',        items: [{ description: 'Personal Training (8 sessions)', qty: 8, unitPrice: 1200 }] },
  { no: 'INV-DEMO-005', daysAgo: 65, status: 'PARTIAL', paidPct: 0.5, method: 'BANK_TRANSFER', items: [{ description: 'Annual Membership — Platinum', qty: 1, unitPrice: 42000 }] },
  { no: 'INV-DEMO-006', daysAgo: 58, status: 'PAID',    method: 'CASH',          items: [{ description: 'Monthly Membership — Silver', qty: 1, unitPrice: 3000 }, { description: 'Whey Protein 2lb', qty: 1, unitPrice: 4800 }] },
  { no: 'INV-DEMO-007', daysAgo: 52, status: 'OVERDUE',                          items: [{ description: 'Monthly Membership — Gold', qty: 1, unitPrice: 4500 }, { description: 'Group Classes Add-on', qty: 1, unitPrice: 1500 }] },
  { no: 'INV-DEMO-008', daysAgo: 45, status: 'PAID',    method: 'ESEWA',         items: [{ description: 'Day Passes (10-pack)', qty: 10, unitPrice: 350 }] },
  { no: 'INV-DEMO-009', daysAgo: 38, status: 'PAID',    method: 'CARD',          items: [{ description: 'Monthly Membership — Gold', qty: 1, unitPrice: 4500 }] },
  { no: 'INV-DEMO-010', daysAgo: 30, status: 'PARTIAL', paidPct: 0.6, method: 'KHALTI', items: [{ description: 'Personal Training (12 sessions)', qty: 12, unitPrice: 1200 }] },
  { no: 'INV-DEMO-011', daysAgo: 22, status: 'PAID',    method: 'CASH',          items: [{ description: 'Monthly Membership — Silver', qty: 1, unitPrice: 3000 }] },
  { no: 'INV-DEMO-012', daysAgo: 15, status: 'UNPAID',                           items: [{ description: 'Quarterly Membership — Silver', qty: 1, unitPrice: 8500 }, { description: 'Locker Rental (3 months)', qty: 3, unitPrice: 500 }] },
  { no: 'INV-DEMO-013', daysAgo: 9,  status: 'PAID',    method: 'ESEWA',         items: [{ description: 'Monthly Membership — Gold', qty: 1, unitPrice: 4500 }, { description: 'Shaker Bottle', qty: 1, unitPrice: 650 }] },
  { no: 'INV-DEMO-014', daysAgo: 4,  status: 'UNPAID',                           items: [{ description: 'Monthly Membership — Silver', qty: 1, unitPrice: 3000 }] },
  { no: 'INV-DEMO-015', daysAgo: 1,  status: 'PAID',    method: 'CONNECTIPS',    items: [{ description: 'Personal Training (4 sessions)', qty: 4, unitPrice: 1200 }] },
];

const VAT_RATE = 0.13;
const r2 = (n: number) => Math.round(n * 100) / 100;

async function seedTenantFinanceDemo(tenantId: string) {
  // -- Fiscal year (ensure one covering today exists and is active) --
  const now = new Date();
  let fy = await prisma.fiscalYear.findFirst({
    where: { tenantId, startDate: { lte: now }, endDate: { gte: now } },
  });
  if (!fy) {
    fy = await prisma.fiscalYear.create({
      data: {
        tenantId, name: `FY ${now.getFullYear()}`, isActive: true,
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
      },
    });
  } else if (!fy.isActive) {
    await prisma.fiscalYear.update({ where: { id: fy.id }, data: { isActive: true } });
  }

  // -- Minimal chart of accounts needed for GL posting (05-accounting seeds the
  //    full chart; this only backfills if 05 was skipped) --
  const ensureAccount = async (code: string, name: string, type: string) => {
    const found = await prisma.chartOfAccount.findFirst({ where: { tenantId, accountCode: code } });
    if (found) return found;
    return prisma.chartOfAccount.create({
      data: {
        tenantId, accountCode: code, accountName: name, accountType: type,
        normalBalance: ['ASSET', 'EXPENSE', 'COGS'].includes(type) ? 'DEBIT' : 'CREDIT',
        currency: 'NPR', createdBy: 'seed',
      },
    });
  };
  const accAR = await ensureAccount('1100', 'Accounts Receivable', 'ASSET');
  const accSales = await ensureAccount('4010', 'Sales Revenue', 'REVENUE');
  const accVat = await ensureAccount('2301', 'VAT Payable (Output)', 'LIABILITY');
  const accCash = await ensureAccount('1010', 'Cash in Hand', 'ASSET');

  // -- Accounting period lookup (create month period on demand) --
  const periodFor = async (date: Date) => {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const existing = await prisma.accountingPeriod.findFirst({
      where: { tenantId, fiscalYearId: fy!.id, startDate },
    });
    if (existing) return existing;
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    return prisma.accountingPeriod.create({
      data: {
        tenantId, fiscalYearId: fy!.id,
        periodName: `${monthName} ${date.getFullYear()}`,
        startDate,
        endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
      },
    });
  };

  // -- Customers (reuse existing; create a couple if the tenant has none) --
  let customers = await prisma.customer.findMany({ where: { tenantId, isActive: true }, take: 10 });
  if (customers.length === 0) {
    for (const name of ['Ramesh Shrestha', 'Sita Adhikari', 'Bikash Gurung']) {
      customers.push(await prisma.customer.create({
        data: { tenantId, name, mobile: '98000000' + customers.length, isActive: true },
      }));
    }
  }

  let jeSeq = 0;
  const postJournal = async (opts: {
    key: string; date: Date; description: string; referenceType: string; referenceId: string;
    lines: Array<{ accountId: string; debit?: number; credit?: number; description?: string }>;
  }) => {
    const entryNo = `JE-DEMO-${opts.key}`;
    const existing = await prisma.journalEntry.findFirst({ where: { tenantId, entryNo } });
    if (existing) return existing;
    const period = await periodFor(opts.date);
    jeSeq++;
    return prisma.journalEntry.create({
      data: {
        tenantId, fiscalYearId: fy!.id, periodId: period.id,
        entryNo, entryDate: opts.date,
        referenceType: opts.referenceType, referenceId: opts.referenceId,
        description: opts.description,
        isPosted: true, postedBy: 'seed', postedAt: opts.date,
        createdBy: 'seed',
        lines: {
          create: opts.lines.map((l, i) => ({
            tenantId, accountId: l.accountId, lineNo: i + 1,
            description: l.description ?? opts.description,
            debitAmount: r2(l.debit ?? 0), creditAmount: r2(l.credit ?? 0),
          })),
        },
      },
    });
  };

  // -- Invoices + payments + GL --
  let createdInv = 0, createdPay = 0, createdJe = 0;
  for (let idx = 0; idx < DEMO_INVOICES.length; idx++) {
    const d = DEMO_INVOICES[idx];
    const customer = customers[idx % customers.length];
    const invoiceDate = new Date(now.getTime() - d.daysAgo * DAY);
    const dueDate = new Date(invoiceDate.getTime() + 15 * DAY);

    const subtotal = r2(d.items.reduce((s, it) => s + it.qty * it.unitPrice, 0));
    const vatAmount = r2(subtotal * VAT_RATE);
    const totalAmount = r2(subtotal + vatAmount);
    const paidAmount =
      d.status === 'PAID' ? totalAmount :
      d.status === 'PARTIAL' ? r2(totalAmount * (d.paidPct ?? 0.5)) : 0;

    let invoice = await prisma.invoice.findUnique({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: d.no } },
    });
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          tenantId, fiscalYearId: fy.id,
          invoiceNumber: d.no, invoiceType: 'TAX_INVOICE',
          invoiceDate, dueDate,
          customerId: customer.id,
          subtotal, taxableAmount: subtotal, vatAmount, totalAmount,
          paidAmount, paymentStatus: d.status,
          currency: 'NPR', createdBy: 'seed',
          notes: 'Demo sales invoice (seed 07)',
          items: {
            create: d.items.map((it, i) => {
              const line = r2(it.qty * it.unitPrice);
              const lineVat = r2(line * VAT_RATE);
              return {
                tenantId, itemNo: i + 1, description: it.description,
                quantity: it.qty, unitPrice: it.unitPrice,
                taxableAmount: line, vatRate: 13, vatAmount: lineVat,
                totalAmount: r2(line + lineVat), accountId: accSales.id,
              };
            }),
          },
        },
      });
      createdInv++;
    }

    // GL: DR Accounts Receivable / CR Sales Revenue + VAT Payable
    const invJe = await postJournal({
      key: `INV-${String(idx + 1).padStart(3, '0')}`,
      date: invoiceDate,
      description: `Sales invoice ${d.no}`,
      referenceType: 'INVOICE', referenceId: invoice.id,
      lines: [
        { accountId: accAR.id, debit: totalAmount },
        { accountId: accSales.id, credit: subtotal },
        { accountId: accVat.id, credit: vatAmount },
      ],
    });
    if (!invoice.journalEntryId) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { journalEntryId: invJe.id } });
      createdJe++;
    }

    // Payment received + allocation + GL for PAID / PARTIAL
    if (paidAmount > 0) {
      const paymentNo = `RCPT-DEMO-${String(idx + 1).padStart(3, '0')}`;
      let payment = await prisma.paymentReceived.findUnique({
        where: { tenantId_paymentNo: { tenantId, paymentNo } },
      });
      if (!payment) {
        const paymentDate = new Date(invoiceDate.getTime() + 2 * DAY);
        payment = await prisma.paymentReceived.create({
          data: {
            tenantId, paymentNo, paymentDate,
            customerId: customer.id, amount: paidAmount,
            paymentMethod: d.method ?? 'CASH',
            referenceNo: `TXN-DEMO-${1000 + idx}`,
            createdBy: 'seed',
            allocations: { create: [{ tenantId, invoiceId: invoice.id, allocatedAmount: paidAmount }] },
          },
        });
        createdPay++;
        // GL: DR Cash / CR Accounts Receivable
        const payJe = await postJournal({
          key: `PAY-${String(idx + 1).padStart(3, '0')}`,
          date: paymentDate,
          description: `Payment received ${paymentNo} against ${d.no}`,
          referenceType: 'PAYMENT', referenceId: payment.id,
          lines: [
            { accountId: accCash.id, debit: paidAmount },
            { accountId: accAR.id, credit: paidAmount },
          ],
        });
        await prisma.paymentReceived.update({ where: { id: payment.id }, data: { journalEntryId: payJe.id } });
      }
    }
  }
  console.log(`    finance demo: +${createdInv} invoices, +${createdPay} payments, +${createdJe} invoice JEs (idempotent)`);

  // Totals for verification
  const [invTotal, payTotal, jeTotal] = await Promise.all([
    prisma.invoice.count({ where: { tenantId, invoiceNumber: { startsWith: 'INV-DEMO-' } } }),
    prisma.paymentReceived.count({ where: { tenantId, paymentNo: { startsWith: 'RCPT-DEMO-' } } }),
    prisma.journalEntry.count({ where: { tenantId, entryNo: { startsWith: 'JE-DEMO-' } } }),
  ]);
  console.log(`    finance demo totals: ${invTotal} demo invoices, ${payTotal} payments, ${jeTotal} journal entries`);
}

if (require.main === module) {
  seed07BillingDemo()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
