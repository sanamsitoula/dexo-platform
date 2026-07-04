import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Posts double-entry JournalEntry rows from operational transactions
 * (invoices, payments) so that GL reports (trial balance, balance sheet,
 * income statement) reflect real activity.
 *
 * All postings are SAFE: if the tenant's chart of accounts isn't seeded or a
 * required control account is missing, the posting is skipped (with a warning)
 * rather than failing the parent operation. This keeps invoice/payment creation
 * resilient even when accounting isn't fully configured.
 *
 * Standard Nepal (NFRS) account codes (see scripts/seed/05-accounting.ts):
 *   1100 Accounts Receivable · 4010 Sales Revenue · 2301 VAT Payable
 *   1010 Cash in Hand · 1020 Cash at Bank · 2010 Accounts Payable · 2200 Tax Payable
 */
@Injectable()
export class GlPostingService {
  private readonly logger = new Logger('GlPosting');

  constructor(private prisma: PrismaService) {}

  private async getAccountByCode(tenantId: string, code: string) {
    return this.prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: code, isActive: true },
      select: { id: true, accountCode: true, accountName: true },
    });
  }

  private async resolvePeriod(tenantId: string, fyId: string, date: Date) {
    return this.prisma.accountingPeriod.findFirst({
      where: { tenantId, isClosed: false, startDate: { lte: date }, endDate: { gte: date } },
      select: { id: true },
    });
  }

  private async generateEntryNo(tenantId: string, date: Date, prefix: string) {
    const month = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.journalEntry.count({
      where: { tenantId, entryNo: { startsWith: `${prefix}${month}` } },
    });
    return `${prefix}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  /** DR Accounts Receivable (1100) / CR Sales Revenue (4010) / CR VAT Payable (2301) */
  async postInvoice(tenantId: string, invoice: { id: string; invoiceNumber: string; invoiceDate: Date; fiscalYearId: string; subtotal: Decimal; vatAmount: Decimal; totalAmount: Decimal; discountAmount?: Decimal }, userId: string) {
    const ar = await this.getAccountByCode(tenantId, '1100');
    const sales = await this.getAccountByCode(tenantId, '4010');
    const vat = await this.getAccountByCode(tenantId, '2301');
    if (!ar || !sales) {
      this.logger.warn(`Skipping GL post for invoice ${invoice.invoiceNumber}: AR/Sales accounts missing (seed accounting first).`);
      return null;
    }

    const period = await this.resolvePeriod(tenantId, invoice.fiscalYearId, invoice.invoiceDate);
    if (!period) {
      this.logger.warn(`Skipping GL post for invoice ${invoice.invoiceNumber}: no open accounting period for ${invoice.invoiceDate.toISOString().slice(0, 10)}.`);
      return null;
    }

    const lines: { accountId: string; debitAmount: string; creditAmount: string; description: string }[] = [];
    const zero = new Decimal(0);
    const subtotal = new Decimal(invoice.subtotal ?? 0);
    const vatAmount = new Decimal(invoice.vatAmount ?? 0);

    // DR Accounts Receivable (total)
    lines.push({ accountId: ar.id, debitAmount: invoice.totalAmount.toString(), creditAmount: zero.toString(), description: `AR — ${invoice.invoiceNumber}` });
    // CR Sales Revenue (subtotal)
    if (subtotal.gt(0)) lines.push({ accountId: sales.id, debitAmount: zero.toString(), creditAmount: subtotal.toString(), description: `Sales — ${invoice.invoiceNumber}` });
    // CR VAT Payable (output VAT)
    if (vat && vatAmount.gt(0)) lines.push({ accountId: vat.id, debitAmount: zero.toString(), creditAmount: vatAmount.toString(), description: `VAT output — ${invoice.invoiceNumber}` });

    const entryNo = await this.generateEntryNo(tenantId, invoice.invoiceDate, 'INV');
    const je = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: invoice.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: invoice.invoiceDate,
        referenceType: 'INVOICE',
        referenceId: invoice.id,
        description: `Auto-posted invoice ${invoice.invoiceNumber}`,
        isPosted: true,
        postedBy: userId,
        postedAt: new Date(),
        createdBy: userId,
        lines: {
          create: lines.map((line, i) => ({
            tenantId,
            accountId: line.accountId,
            lineNo: i + 1,
            description: line.description,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            currency: 'NPR',
          })),
        },
      },
    });

    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { journalEntryId: je.id } });
    return je;
  }

  /**
   * Reverses a posted invoice's journal entry by creating a mirror entry with
   * debit/credit swapped (referenceType REVERSAL), linking it to the original
   * via reversalOfId and flagging the original isReversed. Used on invoice
   * cancellation so the GL is restored (NFRS + IRD audit compliance).
   * Safe no-op if the invoice was never GL-posted.
   */
  async reverseInvoice(tenantId: string, invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true, invoiceNumber: true, journalEntryId: true, fiscalYearId: true },
    });
    if (!invoice?.journalEntryId) {
      this.logger.warn(`No GL entry to reverse for invoice ${invoice?.invoiceNumber ?? invoiceId}.`);
      return null;
    }

    const original = await this.prisma.journalEntry.findUnique({
      where: { id: invoice.journalEntryId },
      include: { lines: true },
    });
    if (!original || original.isReversed) {
      this.logger.warn(`Invoice ${invoice.invoiceNumber} JE missing or already reversed.`);
      return null;
    }

    const now = new Date();
    const period = await this.resolvePeriod(tenantId, original.fiscalYearId, now);
    if (!period) {
      this.logger.warn(`Cannot reverse invoice ${invoice.invoiceNumber}: no open accounting period for ${now.toISOString().slice(0, 10)}.`);
      return null;
    }

    const entryNo = await this.generateEntryNo(tenantId, now, 'REV');
    const reversal = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: original.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: now,
        referenceType: 'REVERSAL',
        referenceId: invoice.id,
        description: `Reversal of ${original.entryNo} (cancelled invoice ${invoice.invoiceNumber})`,
        isPosted: true,
        postedBy: userId,
        postedAt: now,
        createdBy: userId,
        reversalOfId: original.id,
        lines: {
          create: original.lines.map((line, i) => ({
            tenantId,
            accountId: line.accountId,
            lineNo: i + 1,
            description: `Reversal — ${line.description ?? ''}`.trim(),
            debitAmount: line.creditAmount.toString(),
            creditAmount: line.debitAmount.toString(),
            currency: line.currency,
          })),
        },
      },
    });

    await this.prisma.journalEntry.update({ where: { id: original.id }, data: { isReversed: true } });
    return reversal;
  }

  /** DR Cash (1010) or Bank (1020) / CR Accounts Receivable (1100) */
  async postPaymentReceived(tenantId: string, payment: { id: string; paymentNo: string; paymentDate: Date; amount: Decimal; paymentMethod: string; bankAccountId?: string | null; fiscalYearId?: string }, userId: string) {
    const ar = await this.getAccountByCode(tenantId, '1100');
    if (!ar) {
      this.logger.warn(`Skipping GL post for payment ${payment.paymentNo}: AR account missing.`);
      return null;
    }
    const isBank = ['BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE'].includes((payment.paymentMethod || '').toUpperCase());
    const cashAccount = await this.getAccountByCode(tenantId, isBank ? '1020' : '1010');
    if (!cashAccount) {
      this.logger.warn(`Skipping GL post for payment ${payment.paymentNo}: cash/bank account missing.`);
      return null;
    }

    const fy = payment.fiscalYearId
      ? { id: payment.fiscalYearId }
      : await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true }, select: { id: true } });
    if (!fy) {
      this.logger.warn(`Skipping GL post for payment ${payment.paymentNo}: no active fiscal year.`);
      return null;
    }

    const period = await this.resolvePeriod(tenantId, fy.id, payment.paymentDate);
    if (!period) {
      this.logger.warn(`Skipping GL post for payment ${payment.paymentNo}: no open accounting period.`);
      return null;
    }

    const zero = new Decimal(0);
    const entryNo = await this.generateEntryNo(tenantId, payment.paymentDate, 'PAY');
    const je = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: fy.id,
        periodId: period.id,
        entryNo,
        entryDate: payment.paymentDate,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        description: `Auto-posted payment ${payment.paymentNo}`,
        isPosted: true,
        postedBy: userId,
        postedAt: new Date(),
        createdBy: userId,
        lines: {
          create: [
            { tenantId, accountId: cashAccount.id, lineNo: 1, description: `Cash received — ${payment.paymentNo}`, debitAmount: payment.amount.toString(), creditAmount: zero.toString(), currency: 'NPR' },
            { tenantId, accountId: ar.id, lineNo: 2, description: `AR settled — ${payment.paymentNo}`, debitAmount: zero.toString(), creditAmount: payment.amount.toString(), currency: 'NPR' },
          ],
        },
      },
    });

    await this.prisma.paymentReceived.update({ where: { id: payment.id }, data: { journalEntryId: je.id } }).catch(() => {});
    return je;
  }
}
