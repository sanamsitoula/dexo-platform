// Finance DTOs - Core Types for Finance Module

// Account Types
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  COGS = 'COGS',
}

// Normal Balance
export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// Journal Entry Status
export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

// Invoice Status
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

// Invoice Type
export enum InvoiceType {
  TAX_INVOICE = 'TAX_INVOICE',
  ABBREVIATED = 'ABBREVIATED',
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
}

// Payment Method
export enum PaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  ESEWA = 'ESEWA',
  KHALTI = 'KHALTI',
  CONNECTIPS = 'CONNECTIPS',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDITOR = 'CREDITOR',
}

// Fiscal Year Status
export enum FiscalYearStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

// Customer/Supplier Types
export enum EntityType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  EMPLOYEE = 'EMPLOYEE',
  CONTRACTOR = 'CONTRACTOR',
}

// Chart of Account DTO
export class CreateChartOfAccountDto {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentId?: string;
  isControl?: boolean;
  currency?: string;
  normalBalance: NormalBalance;
  isActive?: boolean;
}

export class UpdateChartOfAccountDto {
  accountName?: string;
  isActive?: boolean;
}

// Fiscal Year DTOs
export class CreateFiscalYearDto {
  name: string; // e.g., "2081/82"
  startDate: Date;
  endDate: Date;
}

export class UpdateFiscalYearDto {
  isActive?: boolean;
  isClosed?: boolean;
}

// Accounting Period DTOs
export class CreateAccountingPeriodDto {
  fiscalYearId: string;
  periodName: string; // e.g., "Shrawan 2081"
  startDate: Date;
  endDate: Date;
}

// Journal Entry DTOs
export class CreateJournalEntryDto {
  entryDate: Date;
  referenceType?: string;
  referenceId?: string;
  description: string;
  narration?: string;
  lines: JournalEntryLineDto[];
}

export class JournalEntryLineDto {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  currency?: string;
}

export class PostJournalEntryDto {
  postedBy: string;
}

export class ReverseJournalEntryDto {
  reason: string;
  reversedBy: string;
}

// Customer DTOs
export class CreateCustomerDto {
  customerCode?: string;
  name: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  isVatRegistered?: boolean;
}

export class UpdateCustomerDto {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  isActive?: boolean;
}

// Supplier DTOs
export class CreateSupplierDto {
  supplierCode?: string;
  name: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address?: string;
  isVatRegistered?: boolean;
  paymentTermsDays?: number;
}

export class UpdateSupplierDto {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

// Bank Account DTOs
export class CreateBankAccountDto {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName?: string;
  accountType: string; // SAVINGS, CURRENT, etc.
  currency?: string;
  isDefault?: boolean;
}

export class UpdateBankAccountDto {
  accountName?: string;
  isDefault?: boolean;
  isActive?: boolean;
}
