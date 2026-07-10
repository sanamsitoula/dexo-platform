import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { GlPostingService } from './gl-posting.service';
import { CbmsSyncService } from './cbms-sync.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private glPosting: GlPostingService,
    private cbmsSync: CbmsSyncService,
  ) {}

  async findAll(tenantId: string, params?: { status?: string; startDate?: string; endDate?: string; branchId?: string }) {
    const where: any = { tenantId, isActive: true };
    if (params?.status) where.paymentStatus = params.status;
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.startDate || params?.endDate) {
      where.invoiceDate = {};
      if (params.startDate) where.invoiceDate.gte = new Date(params.startDate);
      if (params.endDate) where.invoiceDate.lte = new Date(params.endDate);
    }
    return this.prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: { customer: true, items: true, masterBills: true, branch: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: { include: { account: true } },
        masterBills: true,
        journalEntry: true,
        reprintLogs: true,
        paymentAllocations: { include: { payment: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(tenantId: string, dto: any, userId: string) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!fiscalYear) throw new BadRequestException('No active fiscal year');

    const invoiceNumber = await this.generateInvoiceNumber(tenantId, dto.invoiceType || 'TAX_INVOICE');
    const items = dto.items || [];

    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalTaxable = new Decimal(0);
    let totalVat = new Decimal(0);

    const processedItems = items.map((item: any, i: number) => {
      const qty = new Decimal(item.quantity || 1);
      const unitPrice = new Decimal(item.unitPrice || 0);
      const discountPct = new Decimal(item.discountPct || 0);

      const lineTotal = qty.mul(unitPrice);
      const discountAmt = lineTotal.mul(discountPct).div(100);
      const taxable = lineTotal.sub(discountAmt);
      const vatRate = new Decimal(item.vatRate || 13);
      const vatAmt = taxable.mul(vatRate).div(100);
      const total = taxable.add(vatAmt);

      subtotal = subtotal.add(lineTotal);
      totalDiscount = totalDiscount.add(discountAmt);
      totalTaxable = totalTaxable.add(taxable);
      totalVat = totalVat.add(vatAmt);

      return {
        itemNo: i + 1,
        description: item.description,
        quantity: qty,
        unitOfMeasure: item.unitOfMeasure || 'N/A',
        unitPrice,
        discountPct,
        discountAmount: discountAmt,
        taxableAmount: taxable,
        vatRate,
        vatAmount: vatAmt,
        totalAmount: total,
        accountId: item.accountId || null,
      };
    });

    const totalAmount = totalTaxable.add(totalVat);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        fiscalYearId: fiscalYear.id,
        invoiceNumber,
        invoiceType: dto.invoiceType || 'TAX_INVOICE',
        invoiceDate: new Date(dto.invoiceDate || new Date()),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        customerId: dto.customerId,
        customerPan: dto.customerPan,
        billingAddress: dto.billingAddress,
        subtotal,
        discountAmount: totalDiscount,
        taxableAmount: totalTaxable,
        vatAmount: totalVat,
        totalAmount,
        currency: dto.currency || 'NPR',
        notes: dto.notes,
        createdBy: userId,
        items: { create: processedItems },
      },
      include: { items: true, customer: true, branch: true },
    });

    if (dto.createMasterBill) {
      await this.createMasterBill(tenantId, invoice.id, userId);
    }

    // Auto-post to the General Ledger (safe no-op if chart of accounts isn't seeded).
    await this.glPosting.postInvoice(tenantId, invoice, userId).catch((err) => {
      // Never let a GL posting failure break invoice creation.
      console.warn(`[GlPosting] invoice ${invoice.invoiceNumber} post failed:`, err?.message);
    });

    return invoice;
  }

  async cancel(tenantId: string, id: string, userId: string, reason: string) {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.paymentStatus === 'CANCELLED') throw new BadRequestException('Invoice already cancelled');
    if (invoice.paidAmount.greaterThan(0)) {
      throw new BadRequestException('Cannot cancel invoice with payments. Issue credit note instead.');
    }

    if (!reason || !reason.trim()) {
      throw new BadRequestException('A cancellation reason is required (IRD audit compliance).');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: 'CANCELLED',
        isActive: false,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: reason,
      },
    });

    // Post a reversal journal entry so the GL is restored (safe no-op if unposted).
    await this.glPosting.reverseInvoice(tenantId, id, userId).catch((err) => {
      console.warn(`[GlPosting] reversal for ${invoice.invoiceNumber} failed:`, err?.message);
    });

    // Deactivate any master bills and transmit the cancellation to IRD CBMS.
    for (const mb of invoice.masterBills ?? []) {
      await this.prisma.masterBill.update({ where: { id: mb.id }, data: { isBillActive: false } }).catch(() => undefined);
      await this.cbmsSync.syncBill(tenantId, mb.id, 'CANCEL', userId).catch((err) => {
        console.warn(`[CBMS] cancel sync for bill ${mb.billNo} failed:`, err?.message);
      });
    }

    // Finance audit trail (IRD §17.2).
    await this.prisma.financeAuditLog
      .create({
        data: {
          tenantId,
          tableName: 'Invoice',
          recordId: id,
          action: 'CANCEL',
          newData: { reason, invoiceNumber: invoice.invoiceNumber } as any,
          actionBy: userId,
        },
      })
      .catch(() => undefined);

    return updated;
  }

  async pay(tenantId: string, invoiceId: string, method: string, userId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.paymentStatus === 'PAID') {
      throw new BadRequestException('Invoice already paid');
    }

    const remaining = invoice.totalAmount.sub(invoice.paidAmount);

    // Create a payment received
    const payment = await this.prisma.paymentReceived.create({
      data: {
        tenantId,
        paymentNo: `RCP-${Date.now()}`,
        paymentDate: new Date(),
        customerId: invoice.customerId,
        amount: remaining,
        paymentMethod: method.toUpperCase() as any,
        notes: `Auto-allocated to invoice ${invoice.invoiceNumber}`,
        createdBy: userId,
      },
    });

    await this.prisma.paymentAllocation.create({
      data: {
        tenantId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        allocatedAmount: remaining,
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: invoice.totalAmount,
        paymentStatus: 'PAID',
      },
    });

    return {
      message: 'Payment processed successfully',
      payment,
      invoiceId,
    };
  }

  async createMasterBill(tenantId: string, invoiceId: string, userId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    const billNo = await this.generateBillNo(tenantId, fy?.name || '2082/83');

    const masterBill = await this.prisma.masterBill.create({
      data: {
        tenantId,
        fiscalYear: fy?.name || '2082/83',
        billNo,
        customerName: invoice.customer?.name,
        customerPan: invoice.customerPan,
        billDate: invoice.invoiceDate,
        amount: invoice.subtotal,
        discount: invoice.discountAmount,
        taxableAmount: invoice.taxableAmount,
        taxAmount: invoice.vatAmount,
        totalAmount: invoice.totalAmount,
        // Not yet synced — CBMS sync below flips this to true on success,
        // or the bill is queued for retry on failure.
        syncWithIrd: false,
        enteredBy: userId,
        invoiceId,
      },
    });

    // Real-time IRD CBMS sync (stub-mode success when no credentials configured).
    await this.cbmsSync.syncBill(tenantId, masterBill.id, 'CREATE', userId).catch((err) => {
      console.warn(`[CBMS] create sync for bill ${masterBill.billNo} failed:`, err?.message);
    });

    return this.prisma.masterBill.findUnique({ where: { id: masterBill.id } });
  }

  /**
   * Records a print/reprint event (ORIGINAL the first time, COPY afterwards)
   * and returns the invoice plus print metadata so the UI can show the
   * "COPY OF ORIGINAL / प्रतिलिपि" watermark on reprints (IRD compliance).
   */
  async recordPrint(tenantId: string, invoiceId: string, userId: string, reason?: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    const priorPrints = await this.prisma.reprintLog.count({ where: { tenantId, invoiceId } });
    const printType = priorPrints === 0 ? 'ORIGINAL' : 'COPY';
    const copyNumber = priorPrints + 1;

    // Use the invoice number as billNo fallback if no MasterBill exists.
    const masterBill = invoice.masterBills?.[0];
    const billNo = masterBill?.billNo || invoice.invoiceNumber;

    await this.prisma.reprintLog.create({
      data: {
        tenantId,
        invoiceId,
        billNo,
        printType,
        copyNumber,
        printedBy: userId,
        reason: reason || (printType === 'COPY' ? 'Reprint requested' : 'Original print'),
      },
    });

    return {
      invoice,
      printType,
      copyNumber,
      isCopy: printType === 'COPY',
      watermark: printType === 'COPY' ? 'COPY OF ORIGINAL / प्रतिलिपि' : null,
    };
  }

  /**
   * Atomically reserves the next number for a (tenant, fiscalYear, billType)
   * series using the BillSequence row as a counter. The unique constraint +
   * `increment` makes this race-safe, unlike a count()+1 read (which two
   * concurrent invoice creates could resolve to the same number). Numbering
   * resets naturally per fiscal year (Shrawan 1) because each fiscal year has
   * its own BillSequence row.
   */
  private async nextSequence(tenantId: string, fiscalYear: string, billType: string): Promise<number> {
    const seq = await this.prisma.billSequence.upsert({
      where: { tenantId_fiscalYear_billType: { tenantId, fiscalYear, billType } },
      create: { tenantId, fiscalYear, billType, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return seq.lastNumber;
  }

  private async generateInvoiceNumber(tenantId: string, type: string): Promise<string> {
    const prefix = type === 'CREDIT_NOTE' ? 'CN' : type === 'DEBIT_NOTE' ? 'DN' : 'INV';
    const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    const fyName = fy?.name || '2082/83';
    const fySuffix = fyName.replace('/', '');
    const next = await this.nextSequence(tenantId, fyName, prefix);
    return `${prefix}-${fySuffix}-${String(next).padStart(4, '0')}`;
  }

  private async generateBillNo(tenantId: string, fyName: string): Promise<string> {
    const next = await this.nextSequence(tenantId, fyName, 'BILL');
    return `BILL-${fyName.replace('/', '')}-${String(next).padStart(4, '0')}`;
  }
}
