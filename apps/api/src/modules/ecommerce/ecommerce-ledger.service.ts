import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

/**
 * EcommerceLedgerService — bridges ecommerce SalesOrder/checkout into the
 * double-entry general ledger and creates the linked Invoice/InvoiceItems
 * record, mirroring the pattern GymLedgerService established for the
 * fitness module (see apps/api/src/modules/fitness/members/gym-ledger.service.ts).
 *
 * Design notes (same as GymLedgerService):
 *  - Best-effort: a missing chart-of-accounts / fiscal year must NEVER break
 *    checkout. We log and skip GL posting; the Invoice row is still created
 *    (or left as-is) so the admin can post manually later.
 *  - Idempotent: keyed on (referenceType, referenceId) so retries (e.g. a
 *    payment-gateway callback firing twice) never double-post.
 *  - Entries are created already POSTED (isPosted = true).
 *
 * Account codes used (from apps/api/src/modules/finance/default-chart.ts):
 *   1010 Cash in Hand · 1020 Cash at Bank · 1100 Accounts Receivable ·
 *   1200 Inventory · 2301 VAT Payable (Output) · 4010 Sales Revenue ·
 *   6010 Cost of Sales (COGS)
 */
@Injectable()
export class EcommerceLedgerService {
  private readonly logger = new Logger(EcommerceLedgerService.name);

  constructor(private prisma: PrismaService) {}

  // -----------------------------------------------------------------
  // Invoice (always attempted — independent of whether GL posting
  // succeeds, since chart-of-accounts setup shouldn't block invoicing).
  // -----------------------------------------------------------------

  /**
   * Creates an Invoice + InvoiceItems linked to the SalesOrder (via
   * SalesOrder.invoiceId, which already exists on the schema — no
   * migration needed for this relation). No-ops if the order already has
   * an invoice (idempotent on retry).
   */
  async createInvoiceForOrder(
    tenantId: string,
    order: {
      id: string;
      orderNumber: string;
      customerId: string | null;
      subtotal: any;
      discountTotal: any;
      taxTotal: any;
      grandTotal: any;
      currency: string;
      paymentMethod: 'COD' | 'PREPAID';
      items: { productId: string; quantity: number; unitPrice: any; taxAmount: any; total: any }[];
    },
    actorUserId?: string,
  ): Promise<string | null> {
    try {
      if (!order.customerId) {
        this.logger.warn(`[${tenantId}] order ${order.id}: no customerId, cannot create Invoice (guest checkout not supported by Invoice model)`);
        return null;
      }

      const existing = await this.prisma.salesOrder.findUnique({ where: { id: order.id }, select: { invoiceId: true } });
      if (existing?.invoiceId) return existing.invoiceId;

      const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true }, orderBy: { startDate: 'desc' } });
      if (!fy) {
        this.logger.warn(`[${tenantId}] order ${order.id}: no active fiscal year — skipping Invoice creation`);
        return null;
      }

      const products = await this.prisma.product.findMany({
        where: { id: { in: order.items.map((i) => i.productId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(products.map((p) => [p.id, p.name]));

      const count = await this.prisma.invoice.count({ where: { tenantId, fiscalYearId: fy.id } });
      const invoiceNumber = `INV-${fy.name}-${String(count + 1).padStart(6, '0')}`;
      const subtotal = Number(order.subtotal);
      const discountAmount = Number(order.discountTotal);
      const vatAmount = Number(order.taxTotal);
      const totalAmount = Number(order.grandTotal);
      const taxableAmount = Math.max(subtotal - discountAmount, 0);

      const invoice = await this.prisma.$transaction(async (trx) => {
        const inv = await trx.invoice.create({
          data: {
            tenantId,
            fiscalYearId: fy.id,
            invoiceNumber,
            invoiceType: 'INVOICE',
            invoiceDate: new Date(),
            customerId: order.customerId!,
            subtotal,
            discountAmount,
            taxableAmount,
            vatAmount,
            totalAmount,
            paidAmount: 0,
            paymentStatus: 'UNPAID',
            currency: order.currency || 'NPR',
            notes: `Auto-generated from ecommerce order ${order.orderNumber}`,
            createdBy: actorUserId || tenantId,
            items: {
              create: order.items.map((item, idx) => ({
                tenantId,
                itemNo: idx + 1,
                description: nameById.get(item.productId) || 'Product',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: 0,
                taxableAmount: Number(item.total),
                vatRate: Number(item.total) > 0 ? (Number(item.taxAmount) / Number(item.total)) * 100 : 0,
                vatAmount: item.taxAmount,
                totalAmount: Number(item.total) + Number(item.taxAmount),
              })),
            },
          },
        });
        await trx.salesOrder.update({ where: { id: order.id }, data: { invoiceId: inv.id } });
        return inv;
      });

      return invoice.id;
    } catch (e: any) {
      this.logger.error(`[${tenantId}] failed to create Invoice for order ${order.id}: ${e?.message}`);
      return null;
    }
  }

  /** Marks the linked Invoice PAID (called once payment is confirmed, COD-collected or gateway-verified). */
  async markInvoicePaid(tenantId: string, orderId: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id: orderId, tenantId }, select: { invoiceId: true, grandTotal: true } });
    if (!order?.invoiceId) return;
    await this.prisma.invoice.update({
      where: { id: order.invoiceId },
      data: { paymentStatus: 'PAID', paidAmount: order.grandTotal },
    });
  }

  // -----------------------------------------------------------------
  // GL posting
  // -----------------------------------------------------------------

  /**
   * DR Cash/Bank/AR (depending on paymentMethod + isPaid) · CR Sales Revenue
   * · CR VAT Payable (if any). Adds a COGS leg (DR COGS · CR Inventory) when
   * every sold item has a positive Product.costPrice on record.
   *
   * `isPaid`: true for COD-at-checkout (revenue is recognized even though
   * cash isn't collected yet — hence AR, not Cash) is passed as false; when
   * a PREPAID order's gateway payment is verified this is called again with
   * isPaid=true so cash/bank is debited instead of AR. Idempotent per
   * referenceId, so calling it once at checkout (COD) or once at payment
   * verification (PREPAID) is safe — it will not double-post if called
   * more than once for the same order.
   */
  async postSaleRevenue(
    tenantId: string,
    order: {
      id: string;
      orderNumber: string;
      subtotal: any;
      discountTotal: any;
      taxTotal: any;
      grandTotal: any;
      paymentMethod: 'COD' | 'PREPAID';
      items: { productId: string; quantity: number; total: any }[];
    },
    opts: { cashCollected: boolean; bank?: boolean },
    actorUserId?: string,
  ): Promise<void> {
    try {
      if (await this.alreadyPosted(tenantId, 'ECOMMERCE_SALE', order.id)) return;

      const grandTotal = Number(order.grandTotal);
      if (!(grandTotal > 0)) return;

      const netRevenue = Number(order.subtotal) - Number(order.discountTotal);
      const vat = Math.max(0, +(Number(order.taxTotal)).toFixed(2));

      const debitCode = opts.cashCollected ? (opts.bank ? '1020' : '1010') : '1100';
      const codes = [debitCode, '4010', ...(vat > 0 ? ['2301'] : [])];
      const acc = await this.resolveAccounts(tenantId, codes);
      if (!acc[debitCode] || !acc['4010']) {
        this.logger.warn(`[${tenantId}] order ${order.id}: chart of accounts not set up — skipping GL post`);
        return;
      }

      const lines = [
        { accountId: acc[debitCode], debitAmount: grandTotal, creditAmount: 0, description: `Sale — ${order.orderNumber}` },
        { accountId: acc['4010'], debitAmount: 0, creditAmount: netRevenue, description: 'Sales revenue' },
        ...(vat > 0 ? [{ accountId: acc['2301'], debitAmount: 0, creditAmount: vat, description: 'Output VAT' }] : []),
      ];

      // COGS leg — only when every line item's product has a recorded cost.
      const cogsLines = await this.buildCogsLines(tenantId, order.items, acc);
      if (cogsLines) lines.push(...cogsLines);

      await this.postEntry(tenantId, {
        entryDate: new Date(),
        referenceType: 'ECOMMERCE_SALE',
        referenceId: order.id,
        description: `Ecommerce sale — ${order.orderNumber}`,
        narration: `Auto-posted from ecommerce checkout, order ${order.id}`,
        lines,
        actorUserId,
      });
      this.logger.log(`[${tenantId}] posted sale revenue for order ${order.id} (${grandTotal})`);
    } catch (e: any) {
      // Never fail checkout because of accounting.
      this.logger.error(`[${tenantId}] failed to post sale revenue for order ${order.id}: ${e?.message}`);
    }
  }

  /** Reversing entry for a cancelled/refunded order — mirrors the original lines with debit/credit swapped. */
  async reverseSaleRevenue(tenantId: string, orderId: string, orderNumber: string, actorUserId?: string): Promise<void> {
    try {
      const original = await this.prisma.journalEntry.findFirst({
        where: { tenantId, referenceType: 'ECOMMERCE_SALE', referenceId: orderId },
        include: { lines: true },
      });
      if (!original) return; // nothing was posted (e.g. no chart of accounts) — nothing to reverse
      if (await this.alreadyPosted(tenantId, 'ECOMMERCE_SALE_REVERSAL', orderId)) return;

      const lines = original.lines.map((l) => ({
        accountId: l.accountId,
        debitAmount: Number(l.creditAmount),
        creditAmount: Number(l.debitAmount),
        description: `Reversal — ${l.description || ''}`.trim(),
      }));

      const entry = await this.postEntry(tenantId, {
        entryDate: new Date(),
        referenceType: 'ECOMMERCE_SALE_REVERSAL',
        referenceId: orderId,
        description: `Ecommerce sale reversal — ${orderNumber}`,
        narration: `Reversal of ${original.entryNo} (order cancelled/refunded)`,
        lines,
        actorUserId,
      });

      await this.prisma.journalEntry.update({ where: { id: original.id }, data: { isReversed: true } }).catch(() => undefined);
      await this.prisma.journalEntry.update({ where: { id: entry.id }, data: { reversalOfId: original.id } }).catch(() => undefined);

      this.logger.log(`[${tenantId}] posted reversal for order ${orderId}`);
    } catch (e: any) {
      this.logger.error(`[${tenantId}] failed to reverse sale revenue for order ${orderId}: ${e?.message}`);
    }
  }

  // -----------------------------------------------------------------
  // internals (mirrors GymLedgerService)
  // -----------------------------------------------------------------

  private async buildCogsLines(
    tenantId: string,
    items: { productId: string; quantity: number }[],
    acc: Record<string, string>,
  ): Promise<{ accountId: string; debitAmount: number; creditAmount: number; description: string }[] | null> {
    if (!items.length) return null;
    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, costPrice: true, trackInventory: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalCogs = 0;
    for (const item of items) {
      const p = byId.get(item.productId);
      if (!p || !p.trackInventory || !(Number(p.costPrice) > 0)) return null; // incomplete cost data — skip COGS entirely rather than post a partial/wrong figure
      totalCogs += Number(p.costPrice) * item.quantity;
    }
    if (!(totalCogs > 0)) return null;

    const cogsAcc = await this.resolveAccounts(tenantId, ['6010', '1200']);
    if (!cogsAcc['6010'] || !cogsAcc['1200']) return null;

    return [
      { accountId: cogsAcc['6010'], debitAmount: +totalCogs.toFixed(2), creditAmount: 0, description: 'Cost of goods sold' },
      { accountId: cogsAcc['1200'], debitAmount: 0, creditAmount: +totalCogs.toFixed(2), description: 'Inventory reduction' },
    ];
  }

  private async alreadyPosted(tenantId: string, referenceType: string, referenceId: string) {
    const existing = await this.prisma.journalEntry.findFirst({ where: { tenantId, referenceType, referenceId } });
    return !!existing;
  }

  private async resolveAccounts(tenantId: string, codes: string[]): Promise<Record<string, string>> {
    const rows = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, accountCode: { in: codes } },
      select: { id: true, accountCode: true },
    });
    return rows.reduce((m, r) => { m[r.accountCode] = r.id; return m; }, {} as Record<string, string>);
  }

  private async postEntry(
    tenantId: string,
    e: {
      entryDate: Date;
      referenceType: string;
      referenceId?: string;
      description: string;
      narration?: string;
      lines: { accountId: string; debitAmount: number; creditAmount: number; description?: string }[];
      actorUserId?: string;
    },
  ) {
    const debit = e.lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
    const credit = e.lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);
    if (Math.abs(debit - credit) > 0.01) {
      throw new Error(`Unbalanced entry: DR ${debit} ≠ CR ${credit}`);
    }

    const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true }, orderBy: { startDate: 'desc' } });
    if (!fy) throw new Error('No active fiscal year. Set up accounting first.');

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId, fiscalYearId: fy.id, startDate: { lte: e.entryDate }, endDate: { gte: e.entryDate } },
    });
    if (!period) throw new Error('No open accounting period for this date.');

    const count = await this.prisma.journalEntry.count({ where: { tenantId, fiscalYearId: fy.id } });
    const entryNo = `JE-${fy.name}-${String(count + 1).padStart(6, '0')}`;
    const createdBy = e.actorUserId || tenantId;

    return this.prisma.$transaction(async (trx) => {
      const entry = await trx.journalEntry.create({
        data: {
          tenantId,
          fiscalYearId: fy.id,
          periodId: period.id,
          entryNo,
          entryDate: e.entryDate,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          description: e.description,
          narration: e.narration,
          isPosted: true,
          postedBy: createdBy,
          postedAt: new Date(),
          createdBy,
        },
      });
      let lineNo = 1;
      for (const l of e.lines) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            tenantId,
            accountId: l.accountId,
            lineNo: lineNo++,
            description: l.description,
            debitAmount: l.debitAmount || 0,
            creditAmount: l.creditAmount || 0,
            currency: 'NPR',
          },
        });
      }
      return entry;
    });
  }
}
