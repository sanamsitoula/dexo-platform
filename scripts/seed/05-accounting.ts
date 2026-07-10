/**
 * Dexo v5 - 05: Accounting setup
 *
 * Seeds a standard Nepal (NFRS-aligned) Chart of Accounts + monthly
 * AccountingPeriods for every tenant that has an active FiscalYear.
 *
 * Idempotent: re-running produces the same state (upserts by account code / period).
 *
 * Account codes used by GL auto-posting (gl-posting.service.ts):
 *   1100 Accounts Receivable · 4010 Sales Revenue · 2301 VAT Payable
 *   1010 Cash in Hand · 1020 Cash at Bank · 2010 Accounts Payable
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AccountSeed = {
  code: string;
  name: string;
  type: string; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS
  parent?: string; // parent code
  isControl?: boolean;
};

// Control accounts act as "ledger heads" — grouping accounts in the hierarchy.
const CHART: AccountSeed[] = [
  // ---------- ASSETS (normal balance DEBIT) ----------
  { code: '1000', name: 'Current Assets', type: 'ASSET', isControl: true },
  { code: '1010', name: 'Cash in Hand', type: 'ASSET', parent: '1000' },
  { code: '1020', name: 'Cash at Bank', type: 'ASSET', parent: '1000' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', parent: '1000', isControl: true },
  { code: '1200', name: 'Inventory', type: 'ASSET', parent: '1000' },
  { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', parent: '1000' },
  { code: '1400', name: 'Tax Recoverable (TDS)', type: 'ASSET', parent: '1000' },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET', isControl: true },
  { code: '1510', name: 'Property, Plant & Equipment', type: 'ASSET', parent: '1500' },
  { code: '1520', name: 'Furniture & Fixtures', type: 'ASSET', parent: '1500' },
  { code: '1530', name: 'Office Equipment', type: 'ASSET', parent: '1500' },
  { code: '1540', name: 'Accumulated Depreciation', type: 'ASSET', parent: '1500' },

  // ---------- LIABILITIES (normal balance CREDIT) ----------
  { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', isControl: true },
  { code: '2010', name: 'Accounts Payable', type: 'LIABILITY', parent: '2000', isControl: true },
  { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', parent: '2000' },
  { code: '2200', name: 'Tax Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2300', name: 'VAT', type: 'LIABILITY', parent: '2000', isControl: true },
  { code: '2301', name: 'VAT Payable (Output)', type: 'LIABILITY', parent: '2300' },
  { code: '2302', name: 'VAT Recoverable (Input)', type: 'LIABILITY', parent: '2300' },
  { code: '2400', name: 'Deferred Revenue', type: 'LIABILITY', parent: '2000' },

  // ---------- EQUITY (normal balance CREDIT) ----------
  { code: '3000', name: "Owner's Equity", type: 'EQUITY', isControl: true },
  { code: '3010', name: 'Share Capital', type: 'EQUITY', parent: '3000' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', parent: '3000' },
  { code: '3030', name: 'Drawings', type: 'EQUITY', parent: '3000' },

  // ---------- REVENUE (normal balance CREDIT) ----------
  { code: '4000', name: 'Operating Revenue', type: 'REVENUE', isControl: true },
  { code: '4010', name: 'Sales Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4020', name: 'Service Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4030', name: 'Membership Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4500', name: 'Other Income', type: 'REVENUE', isControl: true },
  { code: '4510', name: 'Interest Income', type: 'REVENUE', parent: '4500' },
  { code: '4520', name: 'Discount Received', type: 'REVENUE', parent: '4500' },

  // ---------- EXPENSE (normal balance DEBIT) ----------
  { code: '5000', name: 'Operating Expenses', type: 'EXPENSE', isControl: true },
  { code: '5010', name: 'Salaries & Wages', type: 'EXPENSE', parent: '5000' },
  { code: '5020', name: 'Rent Expense', type: 'EXPENSE', parent: '5000' },
  { code: '5030', name: 'Utilities', type: 'EXPENSE', parent: '5000' },
  { code: '5040', name: 'Office Supplies', type: 'EXPENSE', parent: '5000' },
  { code: '5050', name: 'Marketing & Advertising', type: 'EXPENSE', parent: '5000' },
  { code: '5060', name: 'Maintenance', type: 'EXPENSE', parent: '5000' },
  { code: '5070', name: 'Insurance', type: 'EXPENSE', parent: '5000' },
  { code: '5500', name: 'Financial Expenses', type: 'EXPENSE', isControl: true },
  { code: '5510', name: 'Bank Charges', type: 'EXPENSE', parent: '5500' },
  { code: '5520', name: 'Interest Expense', type: 'EXPENSE', parent: '5500' },
  { code: '5530', name: 'Discount Allowed', type: 'EXPENSE', parent: '5500' },

  // ---------- COST OF GOODS SOLD (normal balance DEBIT) ----------
  { code: '6000', name: 'Cost of Goods Sold', type: 'COGS', isControl: true },
  { code: '6010', name: 'Cost of Sales', type: 'COGS', parent: '6000' },
  { code: '6020', name: 'Purchases', type: 'COGS', parent: '6000' },
];

function normalBalanceFor(type: string): string {
  return ['ASSET', 'EXPENSE', 'COGS'].includes(type) ? 'DEBIT' : 'CREDIT';
}

async function seedChartForTenant(tenantId: string, systemUserId: string) {
  // First pass: create accounts without parents (so parent lookups resolve)
  const codeToId = new Map<string, string>();

  for (const acc of CHART) {
    if (acc.parent) continue; // second pass
    const existing = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: acc.code },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (
        await prisma.chartOfAccount.create({
          data: {
            tenantId,
            accountCode: acc.code,
            accountName: acc.name,
            accountType: acc.type,
            parentId: null,
            isControl: acc.isControl ?? false,
            currency: 'NPR',
            normalBalance: normalBalanceFor(acc.type),
            createdBy: systemUserId,
          },
        })
      ).id;
    codeToId.set(acc.code, id);
  }

  // Second pass: children with parents
  for (const acc of CHART) {
    if (!acc.parent) continue;
    const existing = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: acc.code },
      select: { id: true },
    });
    const parentId = codeToId.get(acc.parent);
    const id =
      existing?.id ??
      (
        await prisma.chartOfAccount.create({
          data: {
            tenantId,
            accountCode: acc.code,
            accountName: acc.name,
            accountType: acc.type,
            parentId: parentId ?? null,
            isControl: acc.isControl ?? false,
            currency: 'NPR',
            normalBalance: normalBalanceFor(acc.type),
            createdBy: systemUserId,
          },
        })
      ).id;
    codeToId.set(acc.code, id);
  }
}

async function seedPeriodsForFiscalYear(tenantId: string, fyId: string, fyStart: Date, fyEnd: Date) {
  // Create one monthly AccountingPeriod per month spanned by the fiscal year.
  const cursor = new Date(fyStart.getFullYear(), fyStart.getMonth(), 1);
  const endMonth = new Date(fyEnd.getFullYear(), fyEnd.getMonth(), 1);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  while (cursor <= endMonth) {
    const periodName = `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`;
    const startDate = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const endDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

    const existing = await prisma.accountingPeriod.findFirst({
      where: { tenantId, fiscalYearId: fyId, startDate },
      select: { id: true },
    });
    if (!existing) {
      await prisma.accountingPeriod.create({
        data: { tenantId, fiscalYearId: fyId, periodName, startDate, endDate, isClosed: false },
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
}

export async function seed05Accounting() {
  console.log('  → 05-accounting (chart of accounts + periods + tenant domains)');

  // Use the platform admin as the createdBy for system accounts.
  const systemUser = await prisma.user.findFirst({
    where: { email: 'admin@test.com' },
    select: { id: true },
  });
  const systemUserId = systemUser?.id ?? 'system';

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true } });

  for (const tenant of tenants) {
    // Ensure each demo tenant is linked to its Domain via TenantDomain. The
    // register-time auto-create (Member/Trainer) depends on this link.
    await seedTenantDomain(tenant.id, tenant.subdomain);

    const fy = await prisma.fiscalYear.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { startDate: 'desc' },
    });
    if (!fy) {
      console.log(`    [${tenant.name}] no fiscal year — skipping accounts`);
      continue;
    }

    // Ensure the fiscal year is active (journal entries require an active FY).
    if (!fy.isActive) {
      await prisma.fiscalYear.update({ where: { id: fy.id }, data: { isActive: true } });
    }

    await seedChartForTenant(tenant.id, systemUserId);
    await seedPeriodsForFiscalYear(tenant.id, fy.id, fy.startDate, fy.endDate);

    const accountCount = await prisma.chartOfAccount.count({ where: { tenantId: tenant.id } });
    const periodCount = await prisma.accountingPeriod.count({ where: { tenantId: tenant.id } });
    console.log(`    [${tenant.name}] ${accountCount} accounts, ${periodCount} periods`);
  }
}

// Maps demo tenant subdomains to their DomainType code so register-time
// auto-creation (Member for fitness, etc.) can detect the tenant's industry.
const SUBDOMAIN_TO_DOMAIN: Record<string, string> = {
  vrfitness: 'FITNESS_CENTER',
  spicegarden: 'RESTAURANT_AND_CAFE',
};

async function seedTenantDomain(tenantId: string, subdomain: string | null) {
  const code = subdomain ? SUBDOMAIN_TO_DOMAIN[subdomain] : null;
  if (!code) return;
  const domain = await prisma.domain.findFirst({ where: { code: code as any }, select: { id: true } });
  if (!domain) return;
  const existing = await prisma.tenantDomain.findFirst({ where: { tenantId, domainId: domain.id } });
  if (!existing) {
    await prisma.tenantDomain.create({ data: { tenantId, domainId: domain.id, isActive: true } });
    console.log(`    linked tenant ${subdomain} -> ${code}`);
  }
}

// Allow running standalone: `ts-node --transpile-only scripts/seed/05-accounting.ts`
if (require.main === module) {
  seed05Accounting()
    .then(() => {
      console.log('✅ Accounting seed complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Accounting seed failed:', err);
      process.exit(1);
    });
}
