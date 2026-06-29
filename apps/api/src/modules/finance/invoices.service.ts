import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

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

    return invoice;
  }

  async cancel(tenantId: string, id: string, userId: string, reason: string) {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.paymentStatus === 'CANCELLED') throw new BadRequestException('Invoice already cancelled');
    if (invoice.paidAmount.greaterThan(0)) {
      throw new BadRequestException('Cannot cancel invoice with payments. Issue credit note instead.');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: reason,
      },
    });
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
        status: 'COMPLETED',
        notes: `Auto-allocated to invoice ${invoice.invoiceNo}`,
        createdBy: userId,
      },
    });

    await this.prisma.paymentAllocation.create({
      data: {
        tenantId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: remaining,
        allocatedAt: new Date(),
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

    return this.prisma.masterBill.create({
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
        syncWithIrd: true,
        enteredBy: userId,
        invoiceId,
      },
    });
  }

  private async generateInvoiceNumber(tenantId: string, type: string): Promise<string> {
    const prefix = type === 'CREDIT_NOTE' ? 'CN' : type === 'DEBIT_NOTE' ? 'DN' : 'INV';
    const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    const fySuffix = fy ? fy.name.replace('/', '') : '208283';
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    return `${prefix}-${fySuffix}-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateBillNo(tenantId: string, fyName: string): Promise<string> {
    const count = await this.prisma.masterBill.count({ where: { tenantId, fiscalYear: fyName } });
    return `BILL-${fyName.replace('/', '')}-${String(count + 1).padStart(4, '0')}`;
  }
}
