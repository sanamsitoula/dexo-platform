import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Purchase bills (AP) and debit notes (purchase returns) — IRD §Bills.
 *
 * GL postings (skipped safely when the chart of accounts isn't seeded,
 * mirroring GlPostingService):
 *   PURCHASE:    DR expense (5040 default) + DR VAT input (2302) / CR AP (2010)
 *   DEBIT_NOTE:  DR AP (2010) / CR expense + CR VAT input — reverses a return
 *                back out of payables.
 */
@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { billType?: string; supplierId?: string; startDate?: string; endDate?: string }) {
    const where: any = { tenantId, isActive: true };
    if (params?.billType) where.billType = params.billType;
    if (params?.supplierId) where.supplierId = params.supplierId;
    if (params?.startDate || params?.endDate) {
      where.billDate = {};
      if (params.startDate) where.billDate.gte = new Date(params.startDate);
      if (params.endDate) where.billDate.lte = new Date(params.endDate);
    }
    return this.prisma.bill.findMany({
      where,
      orderBy: { billDate: 'desc' },
      include: { supplier: true, journalEntry: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, tenantId },
      include: { supplier: true, journalEntry: { include: { lines: true } } },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async createPurchaseBill(tenantId: string, dto: any, userId: string) {
    return this.createBill(tenantId, dto, userId, 'PURCHASE');
  }

  /**
   * Debit note against an existing purchase bill (purchase return). Amounts
   * default to the full remaining value of the source bill; partial returns
   * pass explicit amounts. The debit note is capped at the source bill total.
   */
  async createDebitNote(tenantId: string, sourceBillId: string, dto: any, userId: string) {
    const source = await this.findOne(tenantId, sourceBillId);
    if (source.billType !== 'PURCHASE') {
      throw new BadRequestException('Debit notes can only be raised against PURCHASE bills');
    }

    const subtotal = new Decimal(dto?.subtotal ?? source.subtotal);
    const vatAmount = new Decimal(dto?.vatAmount ?? source.vatAmount);
    const totalAmount = subtotal.plus(vatAmount);
    if (totalAmount.lte(0)) throw new BadRequestException('Debit note amount must be positive');
    if (totalAmount.gt(new Decimal(source.totalAmount))) {
      throw new BadRequestException('Debit note cannot exceed the source bill total');
    }

    return this.createBill(
      tenantId,
      {
        supplierId: source.supplierId,
        supplierPan: source.supplierPan,
        billDate: dto?.billDate || new Date(),
        subtotal,
        discountAmount: new Decimal(0),
        taxableAmount: subtotal,
        vatAmount,
        totalAmount,
        notes: dto?.reason ? `Debit note against ${source.billNumber}: ${dto.reason}` : `Debit note against ${source.billNumber}`,
      },
      userId,
      'DEBIT_NOTE',
    );
  }

  private async createBill(tenantId: string, dto: any, userId: string, billType: 'PURCHASE' | 'DEBIT_NOTE') {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    if (!fiscalYear) throw new BadRequestException('No active fiscal year');

    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const subtotal = new Decimal(dto.subtotal ?? 0);
    const discount = new Decimal(dto.discountAmount ?? 0);
    const taxable = new Decimal(dto.taxableAmount ?? subtotal.minus(discount));
    const vat = new Decimal(dto.vatAmount ?? 0);
    const total = new Decimal(dto.totalAmount ?? taxable.plus(vat));
    if (total.lte(0)) throw new BadRequestException('Bill total must be positive');

    const billNumber = await this.nextBillNumber(tenantId, fiscalYear.name, billType);

    const bill = await this.prisma.bill.create({
      data: {
        tenantId,
        fiscalYearId: fiscalYear.id,
        billNumber,
        billType,
        billDate: new Date(dto.billDate || Date.now()),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        supplierId: supplier.id,
        supplierPan: dto.supplierPan || supplier.pan || null,
        subtotal,
        discountAmount: discount,
        taxableAmount: taxable,
        vatAmount: vat,
        totalAmount: total,
        paymentStatus: billType === 'DEBIT_NOTE' ? 'N/A' : 'UNPAID',
        notes: dto.notes || null,
        createdBy: userId,
      },
      include: { supplier: true },
    });

    const je = await this.postToGl(tenantId, bill, userId, dto.expenseAccountCode);
    return je ? { ...bill, journalEntryId: je.id } : bill;
  }

  private async nextBillNumber(tenantId: string, fyName: string, billType: string): Promise<string> {
    const prefix = billType === 'DEBIT_NOTE' ? 'PDN' : 'PB';
    const seq = await this.prisma.billSequence.upsert({
      where: { tenantId_fiscalYear_billType: { tenantId, fiscalYear: fyName, billType: prefix } },
      create: { tenantId, fiscalYear: fyName, billType: prefix, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `${prefix}-${fyName.replace('/', '')}-${String(seq.lastNumber).padStart(4, '0')}`;
  }

  private async account(tenantId: string, code: string) {
    return this.prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: code, isActive: true },
      select: { id: true },
    });
  }

  private async postToGl(tenantId: string, bill: any, userId: string, expenseAccountCode?: string) {
    const ap = await this.account(tenantId, '2010');
    const expense = await this.account(tenantId, expenseAccountCode || '5040');
    const vatInput = await this.account(tenantId, '2302');
    if (!ap || !expense) {
      this.logger.warn(`Skipping GL post for bill ${bill.billNumber}: AP/expense accounts missing (seed accounting first).`);
      return null;
    }
    const period = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId, isClosed: false, startDate: { lte: bill.billDate }, endDate: { gte: bill.billDate } },
    });
    if (!period) {
      this.logger.warn(`Skipping GL post for bill ${bill.billNumber}: no open accounting period.`);
      return null;
    }

    const zero = new Decimal(0).toString();
    const taxable = new Decimal(bill.taxableAmount).toString();
    const vat = new Decimal(bill.vatAmount);
    const total = new Decimal(bill.totalAmount).toString();
    const isDn = bill.billType === 'DEBIT_NOTE';

    const lines: { accountId: string; debitAmount: string; creditAmount: string; description: string }[] = [];
    if (isDn) {
      lines.push({ accountId: ap.id, debitAmount: total, creditAmount: zero, description: `AP reduced — ${bill.billNumber}` });
      lines.push({ accountId: expense.id, debitAmount: zero, creditAmount: taxable, description: `Purchase return — ${bill.billNumber}` });
      if (vatInput && vat.gt(0)) lines.push({ accountId: vatInput.id, debitAmount: zero, creditAmount: vat.toString(), description: `VAT input reversed — ${bill.billNumber}` });
    } else {
      lines.push({ accountId: expense.id, debitAmount: taxable, creditAmount: zero, description: `Purchase — ${bill.billNumber}` });
      if (vatInput && vat.gt(0)) lines.push({ accountId: vatInput.id, debitAmount: vat.toString(), creditAmount: zero, description: `VAT input — ${bill.billNumber}` });
      lines.push({ accountId: ap.id, debitAmount: zero, creditAmount: total, description: `AP — ${bill.billNumber}` });
    }

    const month = `${bill.billDate.getFullYear()}${String(bill.billDate.getMonth() + 1).padStart(2, '0')}`;
    const prefix = isDn ? 'PDN' : 'PB';
    const count = await this.prisma.journalEntry.count({ where: { tenantId, entryNo: { startsWith: `${prefix}${month}` } } });
    const entryNo = `${prefix}${month}-${String(count + 1).padStart(4, '0')}`;

    const je = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: bill.fiscalYearId,
        periodId: period.id,
        entryNo,
        entryDate: bill.billDate,
        referenceType: isDn ? 'DEBIT_NOTE' : 'BILL',
        referenceId: bill.id,
        description: `Auto-posted ${isDn ? 'debit note' : 'purchase bill'} ${bill.billNumber}`,
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
    await this.prisma.bill.update({ where: { id: bill.id }, data: { journalEntryId: je.id } });
    return je;
  }
}
