import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { GlPostingService } from './gl-posting.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private glPosting: GlPostingService) {}

  async findAllReceived(tenantId: string, params?: { customerId?: string; startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.startDate || params?.endDate) {
      where.paymentDate = {};
      if (params.startDate) where.paymentDate.gte = new Date(params.startDate);
      if (params.endDate) where.paymentDate.lte = new Date(params.endDate);
    }
    return this.prisma.paymentReceived.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: { customer: true, bankAccount: true, allocations: { include: { invoice: true } } },
    });
  }

  async findOneReceived(tenantId: string, id: string) {
    const payment = await this.prisma.paymentReceived.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        bankAccount: true,
        allocations: { include: { invoice: true } },
        journalEntry: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async createReceived(tenantId: string, dto: any, userId: string) {
    const paymentNo = await this.generatePaymentNo(tenantId, 'R');

    const payment = await this.prisma.paymentReceived.create({
      data: {
        tenantId,
        paymentNo,
        paymentDate: new Date(dto.paymentDate || new Date()),
        customerId: dto.customerId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod || 'CASH',
        referenceNo: dto.referenceNo,
        transactionId: dto.transactionId,
        bankAccountId: dto.bankAccountId,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { customer: true },
    });

    if (dto.allocateTo && dto.allocateTo.length > 0) {
      await this.allocatePayment(tenantId, payment.id, dto.allocateTo, userId);
    }

    // Auto-post to the General Ledger (safe no-op if chart of accounts isn't seeded).
    await this.glPosting.postPaymentReceived(tenantId, payment, userId).catch((err) => {
      console.warn(`[GlPosting] payment ${payment.paymentNo} post failed:`, err?.message);
    });

    return payment;
  }

  async allocatePayment(tenantId: string, paymentId: string, allocations: { invoiceId: string; amount: number }[], userId: string) {
    const payment = await this.findOneReceived(tenantId, paymentId);
    let totalAllocated = new Decimal(0);

    for (const alloc of allocations) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: alloc.invoiceId, tenantId },
      });
      if (!invoice) throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);

      const allocAmount = new Decimal(alloc.amount);
      const remaining = invoice.totalAmount.sub(invoice.paidAmount);
      if (allocAmount.greaterThan(remaining)) {
        throw new BadRequestException(`Allocation amount ${allocAmount} exceeds remaining ${remaining} for invoice ${invoice.invoiceNumber}`);
      }

      await this.prisma.paymentAllocation.create({
        data: {
          tenantId,
          paymentId,
          invoiceId: alloc.invoiceId,
          allocatedAmount: allocAmount,
        },
      });

      await this.prisma.invoice.update({
        where: { id: alloc.invoiceId },
        data: {
          paidAmount: invoice.paidAmount.add(allocAmount),
          paymentStatus: invoice.paidAmount.add(allocAmount).gte(invoice.totalAmount) ? 'PAID' : 'PARTIAL',
        },
      });

      totalAllocated = totalAllocated.add(allocAmount);
    }

    if (totalAllocated.greaterThan(payment.amount)) {
      throw new BadRequestException('Total allocation exceeds payment amount');
    }

    return { success: true, totalAllocated };
  }

  async findAllMade(tenantId: string, params?: { payeeType?: string; startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (params?.payeeType) where.payeeType = params.payeeType;
    if (params?.startDate || params?.endDate) {
      where.paymentDate = {};
      if (params.startDate) where.paymentDate.gte = new Date(params.startDate);
      if (params.endDate) where.paymentDate.lte = new Date(params.endDate);
    }
    return this.prisma.paymentMade.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: { bankAccount: true },
    });
  }

  async findOneMade(tenantId: string, id: string) {
    const payment = await this.prisma.paymentMade.findFirst({
      where: { id, tenantId },
      include: { bankAccount: true, journalEntry: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async createMade(tenantId: string, dto: any, userId: string) {
    const paymentNo = await this.generatePaymentNo(tenantId, 'O');
    const amount = new Decimal(dto.amount);
    const tdsAmount = new Decimal(dto.tdsAmount || 0);
    const netAmount = amount.sub(tdsAmount);

    return this.prisma.paymentMade.create({
      data: {
        tenantId,
        paymentNo,
        paymentDate: new Date(dto.paymentDate || new Date()),
        paymentType: dto.paymentType || 'SUPPLIER',
        payeeType: dto.payeeType || 'SUPPLIER',
        payeeId: dto.payeeId,
        amount,
        tdsAmount,
        netAmount,
        paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
        referenceNo: dto.referenceNo,
        bankAccountId: dto.bankAccountId,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  private async generatePaymentNo(tenantId: string, prefix: string): Promise<string> {
    const fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    const fySuffix = fy ? fy.name.replace('/', '') : '208283';
    const count = await this.prisma.paymentReceived.count({ where: { tenantId } });
    const countMade = await this.prisma.paymentMade.count({ where: { tenantId } });
    return `PAY-${prefix}-${fySuffix}-${String(count + countMade + 1).padStart(4, '0')}`;
  }
}
