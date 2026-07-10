/**
 * Platform-defined default Chart of Accounts (Nepal NFRS-aligned).
 *
 * This is the baseline every tenant starts from so their books are never empty
 * and Trial Balance / Balance Sheet work out of the box. A tenant admin can add,
 * rename or deactivate accounts afterwards (accounts.service create/update).
 *
 * Editing this array changes the platform default for NEW tenants.
 */
export type DefaultAccount = { code: string; name: string; type: string; parent?: string; isControl?: boolean };

export const DEFAULT_CHART: DefaultAccount[] = [
  // ASSETS
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
  { code: '1530', name: 'Gym Equipment', type: 'ASSET', parent: '1500' },
  { code: '1540', name: 'Accumulated Depreciation', type: 'ASSET', parent: '1500' },
  // LIABILITIES
  { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', isControl: true },
  { code: '2010', name: 'Accounts Payable', type: 'LIABILITY', parent: '2000', isControl: true },
  { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', parent: '2000' },
  { code: '2200', name: 'Tax Payable', type: 'LIABILITY', parent: '2000' },
  { code: '2300', name: 'VAT', type: 'LIABILITY', parent: '2000', isControl: true },
  { code: '2301', name: 'VAT Payable (Output)', type: 'LIABILITY', parent: '2300' },
  { code: '2302', name: 'VAT Recoverable (Input)', type: 'LIABILITY', parent: '2300' },
  { code: '2400', name: 'Deferred Revenue', type: 'LIABILITY', parent: '2000' },
  // EQUITY
  { code: '3000', name: "Owner's Equity", type: 'EQUITY', isControl: true },
  { code: '3010', name: 'Share Capital', type: 'EQUITY', parent: '3000' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', parent: '3000' },
  { code: '3030', name: 'Drawings', type: 'EQUITY', parent: '3000' },
  // REVENUE
  { code: '4000', name: 'Operating Revenue', type: 'REVENUE', isControl: true },
  { code: '4010', name: 'Sales Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4020', name: 'Service Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4030', name: 'Membership Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4040', name: 'Personal Training Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4050', name: 'Class Revenue', type: 'REVENUE', parent: '4000' },
  { code: '4500', name: 'Other Income', type: 'REVENUE', isControl: true },
  { code: '4510', name: 'Interest Income', type: 'REVENUE', parent: '4500' },
  // EXPENSES
  { code: '5000', name: 'Operating Expenses', type: 'EXPENSE', isControl: true },
  { code: '5010', name: 'Salaries & Wages', type: 'EXPENSE', parent: '5000' },
  { code: '5020', name: 'Rent Expense', type: 'EXPENSE', parent: '5000' },
  { code: '5030', name: 'Utilities', type: 'EXPENSE', parent: '5000' },
  { code: '5040', name: 'Office Supplies', type: 'EXPENSE', parent: '5000' },
  { code: '5050', name: 'Marketing & Advertising', type: 'EXPENSE', parent: '5000' },
  { code: '5060', name: 'Equipment Maintenance', type: 'EXPENSE', parent: '5000' },
  { code: '5070', name: 'Insurance', type: 'EXPENSE', parent: '5000' },
  { code: '5500', name: 'Financial Expenses', type: 'EXPENSE', isControl: true },
  { code: '5510', name: 'Bank Charges', type: 'EXPENSE', parent: '5500' },
  { code: '5520', name: 'Payment Gateway Fees', type: 'EXPENSE', parent: '5500' },
  // COGS
  { code: '6000', name: 'Cost of Goods Sold', type: 'COGS', isControl: true },
  { code: '6010', name: 'Cost of Sales', type: 'COGS', parent: '6000' },
];

export function normalBalanceFor(type: string): 'DEBIT' | 'CREDIT' {
  return ['ASSET', 'EXPENSE', 'COGS'].includes(type) ? 'DEBIT' : 'CREDIT';
}
