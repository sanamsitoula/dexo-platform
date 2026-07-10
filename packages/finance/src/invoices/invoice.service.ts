import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { InvoiceStatus, InvoiceType, PaymentMethod } from '../finance/dto';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  ApproveInvoiceDto,
  IssueInvoiceDto,
  CancelInvoiceDto,
  ReceivePaymentDto,
  MakePaymentDto,
  CreateBillDto,
} from './dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private prisma: PrismaService) {}

  // ========== Invoices (AR - Sales Invoices) ==========

  async createInvoice(tenantId: string, dto: CreateInvoiceDto) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify fiscal year exists and is active
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: dto.fiscalYearId, tenantId, isActive: true },
    });

    if (!fiscalYear) {
      throw new BadRequestException('No active fiscal year found');
    }

    // Calculate invoice totals
    let subtotal = 0;
    let totalVat = 0;

    const items = dto.items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = (lineTotal * (item.discountPct || 0)) / 100;
      const taxableAmount = lineTotal - discount;
      const vatAmount = (taxableAmount * (item.vatRate || 13)) / 100;
      const totalAmount = taxableAmount + vatAmount;

      subtotal += taxableAmount;
      totalVat += vatAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct || 0,
        discountAmount: discount,
        taxableAmount,
        vatRate: item.vatRate || 13,
        vatAmount,
        totalAmount,
        accountId: item.accountId,
        productId: item.productId,
      };
    });

    const discountAmount = dto.discountAmount || 0;
    const taxableAmount = subtotal - discountAmount;
    const vatAmount = totalVat;
    const totalAmount = taxableAmount + vatAmount;

    // Generate invoice number (will be reassigned on issue)
    const invoiceNumber = `DRAFT-${Date.now()}`;

    // Create invoice in draft status
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        fiscalYearId: dto.fiscalYearId,
        invoiceNumber,
        invoiceType: dto.invoiceType,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        customerId: dto.customerId,
        customerPan: dto.customerPan,
        billingAddress: dto.billingAddress,
        subtotal,
        discountAmount,
        taxableAmount,
        vatAmount,
        totalAmount,
        paidAmount: 0,
        paymentStatus: 'UNPAID' as any,
        currency: dto.currency || 'NPR',
        notes: dto.notes,
        isActive: true,
        createdBy: tenantId, // TODO: Get from JWT
        items: {
          create: items.map((item, index) => ({
            ...item,
            tenantId,
            itemNo: index + 1,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    this.logger.log(`Created draft invoice ${invoice.invoiceNumber} for tenant ${tenantId}`);

    return invoice;
  }

  async getInvoices(tenantId: string, customerId?: string, status?: InvoiceStatus) {
    const where: any = { tenantId };

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.paymentStatus = status;
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        customer: true,
        fiscalYear: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async updateInvoice(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, paymentStatus: InvoiceStatus.DRAFT },
    });

    if (!invoice) {
      throw new NotFoundException('Draft invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: dto,
    });
  }

  async approveInvoice(tenantId: string, id: string, dto: ApproveInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, paymentStatus: InvoiceStatus.DRAFT },
    });

    if (!invoice) {
      throw new NotFoundException('Draft invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: InvoiceStatus.APPROVED,
      },
    });
  }

  async issueInvoice(tenantId: string, id: string, dto: IssueInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { fiscalYear: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.paymentStatus !== InvoiceStatus.APPROVED && invoice.paymentStatus !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Invoice must be in draft or approved status');
    }

    // Generate bill number
    const billNumber = await this.generateBillNumber(tenantId, invoice.fiscalYear.name, 'INV');

    // Update invoice with bill number and create journal entry
    const updatedInvoice = await this.prisma.$transaction(async (trx) => {
      // Update invoice
      const updated = await trx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: billNumber,
          paymentStatus: InvoiceStatus.ISSUED,
        },
      });

      // Create master bill record (IRD compliance)
      await trx.masterBill.create({
        data: {
          tenantId,
          fiscalYear: invoice.fiscalYear.name,
          billNo: billNumber,
          customerName: (invoice as any).customer?.name || '',
          customerPan: invoice.customerPan,
          billDate: new Date(),
          amount: Number(invoice.subtotal) + Number(invoice.discountAmount),
          discount: invoice.discountAmount,
          taxableAmount: invoice.taxableAmount,
          taxAmount: invoice.vatAmount,
          totalAmount: invoice.totalAmount,
          syncWithIrd: false,
          isBillPrinted: false,
          isBillActive: true,
          isRealtime: true,
          enteredBy: dto.issuedBy,
        },
      });

      // Create journal entry
      const journalEntry = await this.createSalesJournalEntry(tenantId, invoice, trx);

      // Link journal entry to invoice
      await trx.invoice.update({
        where: { id },
        data: { journalEntryId: journalEntry.id },
      });

      return updated;
    });

    this.logger.log(`Issued invoice ${billNumber} for tenant ${tenantId}`);

    return updatedInvoice;
  }

  async cancelInvoice(tenantId: string, id: string, dto: CancelInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { fiscalYear: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.paymentStatus === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice is already cancelled');
    }

    return this.prisma.$transaction(async (trx) => {
      // Update invoice
      await trx.invoice.update({
        where: { id },
        data: {
          isActive: false,
          paymentStatus: InvoiceStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: dto.cancelledBy,
          cancelReason: dto.reason,
        },
      });

      // Update master bill
      await trx.masterBill.updateMany({
        where: { invoiceId: id },
        data: { isBillActive: false },
      });

      // Create reversal journal entry if posted
      if (invoice.journalEntryId) {
        await this.createReversalJournalEntry(tenantId, invoice.journalEntryId, dto.reason, trx);
      }

      // Log audit
      await trx.financeAuditLog.create({
        data: {
          tenantId,
          tableName: 'invoices',
          recordId: id,
          action: 'CANCEL',
          newData: { reason: dto.reason },
          actionBy: dto.cancelledBy,
        },
      });

      return { message: 'Invoice cancelled successfully' };
    });
  }

  // ========== Payments Received ==========

  async receivePayment(tenantId: string, dto: ReceivePaymentDto) {
    // Verify customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Generate payment number
    const paymentNo = await this.generatePaymentNumber(tenantId);

    // Create payment and journal entry
    const payment = await this.prisma.$transaction(async (trx) => {
      const newPayment = await trx.paymentReceived.create({
        data: {
          tenantId,
          paymentNo,
          paymentDate: new Date(),
          customerId: dto.customerId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          referenceNo: dto.referenceNo,
          transactionId: dto.transactionId,
          bankAccountId: dto.bankAccountId,
          notes: dto.notes,
          vatRefundAmount: dto.vatRefundAmount,
          createdBy: tenantId, // TODO: Get from JWT
        },
      });

      // Create journal entry for payment received
      await this.createPaymentReceivedJournalEntry(tenantId, newPayment, trx);

      return newPayment;
    });

    this.logger.log(`Received payment ${paymentNo} of ${dto.amount} for tenant ${tenantId}`);

    return payment;
  }

  async allocatePayment(tenantId: string, paymentId: string, invoiceId: string, amount: number) {
    const payment = await this.prisma.paymentReceived.findFirst({
      where: { id: paymentId, tenantId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check available amount
    const existingAllocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentId },
    });

    const totalAllocated = existingAllocations.reduce((sum, alloc) => sum + Number(alloc.allocatedAmount), 0);
    const availableAmount = Number(payment.amount) - totalAllocated;

    if (amount > availableAmount) {
      throw new BadRequestException(`Insufficient funds. Available: ${availableAmount}`);
    }

    // Create allocation
    await this.prisma.paymentAllocation.create({
      data: {
        tenantId,
        paymentId,
        invoiceId,
        allocatedAmount: amount,
      },
    });

    // Update invoice paid amount
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: Number(invoice.paidAmount) + amount,
        paymentStatus: Number(invoice.paidAmount) + amount >= Number(invoice.totalAmount)
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL,
      },
    });

    return { message: 'Payment allocated successfully' };
  }

  // ========== Bills (AP - Purchase Invoices) ==========

  async createBill(tenantId: string, dto: CreateBillDto) {
    // Verify supplier
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Verify fiscal year
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: dto.fiscalYearId, tenantId, isActive: true },
    });

    if (!fiscalYear) {
      throw new BadRequestException('No active fiscal year found');
    }

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    const items = dto.items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const vatAmount = (lineTotal * (item.vatRate || 13)) / 100;
      const totalAmount = lineTotal + vatAmount;

      subtotal += lineTotal;
      totalVat += vatAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 13,
        vatAmount,
        totalAmount,
      };
    });

    const discountAmount = dto.discountAmount || 0;
    const taxableAmount = subtotal - discountAmount;
    const vatAmount = totalVat;
    const totalAmount = taxableAmount + vatAmount;

    // Generate bill number
    const billNumber = await this.generateBillNumber(tenantId, fiscalYear.name, 'BILL');

    // Create bill and journal entry
    const bill = await this.prisma.$transaction(async (trx) => {
      const newBill = await trx.bill.create({
        data: {
          tenantId,
          fiscalYearId: dto.fiscalYearId,
          billNumber,
          billType: 'PURCHASE',
          billDate: dto.billDate,
          dueDate: dto.dueDate,
          supplierId: dto.supplierId,
          supplierPan: dto.supplierPan,
          subtotal,
          discountAmount,
          taxableAmount,
          vatAmount,
          totalAmount,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
          currency: dto.currency || 'NPR',
          notes: dto.notes,
          isActive: true,
          createdBy: tenantId,
        },
      });

      // Create journal entry for purchase
      await this.createPurchaseJournalEntry(tenantId, newBill, trx);

      return newBill;
    });

    this.logger.log(`Created bill ${billNumber} for tenant ${tenantId}`);

    return bill;
  }

  // ========== Payments Made ==========

  async makePayment(tenantId: string, dto: MakePaymentDto) {
    const paymentNo = await this.generatePaymentNumber(tenantId);

    const payment = await this.prisma.$transaction(async (trx) => {
      const newPayment = await trx.paymentMade.create({
        data: {
          tenantId,
          paymentNo,
          paymentDate: new Date(),
          paymentType: dto.paymentType,
          payeeType: dto.payeeType,
          payeeId: dto.payeeId,
          amount: dto.amount,
          tdsAmount: dto.tdsAmount || 0,
          netAmount: dto.amount - (dto.tdsAmount || 0),
          paymentMethod: dto.paymentMethod,
          referenceNo: dto.referenceNo,
          bankAccountId: dto.bankAccountId,
          notes: dto.notes,
          createdBy: tenantId,
        },
      });

      // Create journal entry for payment made
      await this.createPaymentMadeJournalEntry(tenantId, newPayment, trx);

      return newPayment;
    });

    this.logger.log(`Made payment ${paymentNo} of ${dto.amount} for tenant ${tenantId}`);

    return payment;
  }

  // ========== Helper Methods ==========

  private async generateBillNumber(tenantId: string, fiscalYear: string, type: 'INV' | 'BILL' | 'CN' | 'DN'): Promise<string> {
    const prefix = `${type}-${fiscalYear}`;

    // Atomic sequence increment
    const result = await this.prisma.$executeRaw`
      UPDATE bill_sequences
      SET last_number = last_number + 1
      WHERE tenant_id = ${tenantId}
        AND fiscal_year = ${fiscalYear}
        AND bill_type = ${type}
      RETURNING last_number
    `;

    let sequence: number;
    if (result && (result as any).length > 0) {
      sequence = (result as any)[0].last_number;
    } else {
      // Create sequence if not exists
      await this.prisma.$executeRaw`
        INSERT INTO bill_sequences (tenant_id, fiscal_year, bill_type, last_number)
        VALUES (${tenantId}, ${fiscalYear}, ${type}, 1)
        ON CONFLICT (tenant_id, fiscal_year, bill_type)
        DO UPDATE SET last_number = bill_sequences.last_number + 1
      `;
      sequence = 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const prefix = `PAY`;

    const lastPayment = await this.prisma.paymentReceived.findFirst({
      where: { tenantId },
      orderBy: { paymentNo: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSeq = parseInt(lastPayment.paymentNo.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `${prefix}-${Date.now()}-${String(sequence).padStart(4, '0')}`;
  }

  private async createSalesJournalEntry(tenantId: string, invoice: any, trx: any) {
    // Get fiscal year and period
    const fiscalYear = await trx.fiscalYear.findFirst({
      where: { id: invoice.fiscalYearId },
    });

    const period = await trx.accountingPeriod.findFirst({
      where: {
        tenantId,
        fiscalYearId: invoice.fiscalYearId,
        startDate: { lte: invoice.invoiceDate },
        endDate: { gte: invoice.invoiceDate },
      },
    });

    const entryNo = await this.generateBillNumber(tenantId, fiscalYear.name, 'JE' as any);

    // Create journal entry
    const journalEntry = await trx.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: invoice.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: invoice.invoiceDate,
        referenceType: 'INVOICE',
        referenceId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || ''}`,
        narration: invoice.notes,
        isPosted: true,
        createdBy: tenantId,
        postedBy: tenantId,
        postedAt: new Date(),
      },
    });

    // Get AR account
    const arAccount = await trx.chartOfAccount.findFirst({
      where: { tenantId, accountCode: '1121' },
    });

    // Create journal entry lines
    await trx.journalEntryLine.create({
      data: {
        journalEntryId: journalEntry.id,
        tenantId,
        accountId: arAccount.id,
        lineNo: 1,
        description: 'Accounts Receivable',
        debitAmount: invoice.totalAmount,
        creditAmount: 0,
        currency: invoice.currency,
      },
    });

    // Revenue and VAT lines for each invoice item
    let lineNo = 2;
    for (const item of invoice.items) {
      const revenueAccount = await trx.chartOfAccount.findFirst({
        where: { id: item.accountId },
      });

      if (revenueAccount) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: journalEntry.id,
            tenantId,
            accountId: revenueAccount.id,
            lineNo,
            description: item.description,
            debitAmount: 0,
            creditAmount: item.taxableAmount,
            currency: invoice.currency,
          },
        });
        lineNo++;
      }

      // VAT line
      const vatAccount = await trx.chartOfAccount.findFirst({
        where: { tenantId, accountCode: '2141' },
      });

      if (vatAccount && item.vatAmount > 0) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: journalEntry.id,
            tenantId,
            accountId: vatAccount.id,
            lineNo,
            description: 'VAT Payable',
            debitAmount: 0,
            creditAmount: item.vatAmount,
            currency: invoice.currency,
          },
        });
        lineNo++;
      }
    }

    return journalEntry;
  }

  private async createPaymentReceivedJournalEntry(tenantId: string, payment: any, trx: any) {
    // Get current fiscal year and period
    const fiscalYear = await trx.fiscalYear.findFirst({
      where: { tenantId, isActive: true },
    });

    const period = await trx.accountingPeriod.findFirst({
      where: { tenantId, fiscalYearId: fiscalYear.id, isClosed: false },
    });

    const entryNo = await this.generateBillNumber(tenantId, fiscalYear.name, 'JE' as any);

    const journalEntry = await trx.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: fiscalYear.id,
        periodId: period.id,
        entryNo,
        entryDate: payment.paymentDate,
        referenceType: 'PAYMENT_RECEIVED',
        referenceId: payment.id,
        description: `Payment received ${payment.paymentNo}`,
        narration: payment.notes,
        isPosted: true,
        createdBy: tenantId,
        postedBy: tenantId,
        postedAt: new Date(),
      },
    });

    // Debit: Bank/Cash
    const bankAccount = await trx.chartOfAccount.findFirst({
      where: { tenantId, accountCode: { in: ['1112', '1114', '1111'] } },
    });

    // Credit: AR
    const arAccount = await trx.chartOfAccount.findFirst({
      where: { tenantId, accountCode: '1121' },
    });

    if (bankAccount && arAccount) {
      await trx.journalEntryLine.createMany({
        data: [
          {
            journalEntryId: journalEntry.id,
            tenantId,
            accountId: bankAccount.id,
            lineNo: 1,
            description: 'Cash/Bank',
            debitAmount: payment.amount,
            creditAmount: 0,
            currency: 'NPR',
          },
          {
            journalEntryId: journalEntry.id,
            tenantId,
            accountId: arAccount.id,
            lineNo: 2,
            description: 'Accounts Receivable',
            debitAmount: 0,
            creditAmount: payment.amount,
            currency: 'NPR',
          },
        ],
      });
    }

    return journalEntry;
  }

  private async createPurchaseJournalEntry(tenantId: string, bill: any, trx: any) {
    // Similar to sales JE but for purchases
    // Debit: Expense/Asset, VAT Receivable
    // Credit: Accounts Payable

    const fiscalYear = await trx.fiscalYear.findFirst({
      where: { id: bill.fiscalYearId },
    });

    const period = await trx.accountingPeriod.findFirst({
      where: {
        tenantId,
        fiscalYearId: bill.fiscalYearId,
        startDate: { lte: bill.billDate },
        endDate: { gte: bill.billDate },
      },
    });

    const entryNo = await this.generateBillNumber(tenantId, fiscalYear.name, 'JE' as any);

    const journalEntry = await trx.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: bill.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: bill.billDate,
        referenceType: 'BILL',
        referenceId: bill.id,
        description: `Bill ${bill.billNumber} - ${bill.supplierId}`,
        narration: bill.notes,
        isPosted: true,
        createdBy: tenantId,
        postedBy: tenantId,
        postedAt: new Date(),
      },
    });

    // Get accounts
    const apAccount = await trx.chartOfAccount.findFirst({
      where: { tenantId, accountCode: '2110' },
    });

    const vatAccount = await trx.chartOfAccount.findFirst({
      where: { tenantId, accountCode: '1123' },
    });

    if (apAccount) {
      await trx.journalEntryLine.create({
        data: {
          journalEntryId: journalEntry.id,
          tenantId,
          accountId: apAccount.id,
          lineNo: 1,
          description: 'Accounts Payable',
          debitAmount: 0,
          creditAmount: bill.totalAmount,
          currency: bill.currency,
        },
      });
    }

    // Debit lines for expense/asset and VAT

    return journalEntry;
  }

  private async createPaymentMadeJournalEntry(tenantId: string, payment: any, trx: any) {
    // Debit: Accounts Payable
    // Credit: Bank/Cash, TDS Payable

    return null;
  }

  private async createReversalJournalEntry(tenantId: string, originalJournalEntryId: string, reason: string, trx: any) {
    const original = await trx.journalEntry.findUnique({
      where: { id: originalJournalEntryId },
      include: { lines: true },
    });

    if (!original) return null;

    const fiscalYear = await trx.fiscalYear.findFirst({
      where: { id: original.fiscalYearId, isActive: true },
    });

    const period = await trx.accountingPeriod.findFirst({
      where: {
        tenantId,
        fiscalYearId: original.fiscalYearId,
        isClosed: false,
      },
    });

    const entryNo = await this.generateBillNumber(tenantId, fiscalYear.name, 'JE' as any);

    const reversal = await trx.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: original.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: new Date(),
        referenceType: 'REVERSAL',
        referenceId: originalJournalEntryId,
        description: `REVERSAL: ${original.description}`,
        narration: reason,
        isPosted: true,
        isReversed: false,
        reversalOfId: originalJournalEntryId,
        createdBy: tenantId,
        postedBy: tenantId,
        postedAt: new Date(),
      },
    });

    // Create reversal lines (swap debits and credits)
    let lineNo = 1;
    for (const line of original.lines) {
      await trx.journalEntryLine.create({
        data: {
          journalEntryId: reversal.id,
          tenantId,
          accountId: line.accountId,
          lineNo,
          description: `REVERSAL: ${line.description}`,
          debitAmount: line.creditAmount,
          creditAmount: line.debitAmount,
          currency: line.currency,
        },
      });
      lineNo++;
    }

    // Mark original as reversed
    await trx.journalEntry.update({
      where: { id: originalJournalEntryId },
      data: { isReversed: true },
    });

    return reversal;
  }
}
