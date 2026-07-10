import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { startDate?: string; endDate?: string; posted?: boolean }) {
    const where: any = { tenantId };
    if (params?.posted !== undefined) where.isPosted = params.posted;
    if (params?.startDate || params?.endDate) {
      where.entryDate = {};
      if (params.startDate) where.entryDate.gte = new Date(params.startDate);
      if (params.endDate) where.entryDate.lte = new Date(params.endDate);
    }
    return this.prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      include: {
        lines: { include: { account: true } },
        period: true,
        fiscalYear: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: { include: { account: true }, orderBy: { lineNo: 'asc' } },
        period: true,
        fiscalYear: true,
      },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async create(tenantId: string, dto: any, userId: string) {
    const { lines, ...entryData } = dto;
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Journal entry requires at least 2 lines');
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const line of lines) {
      totalDebit = totalDebit.add(line.debitAmount || 0);
      totalCredit = totalCredit.add(line.creditAmount || 0);
    }
    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(`Debits (${totalDebit}) must equal credits (${totalCredit})`);
    }

    const entryNo = await this.generateEntryNo(tenantId, entryData.entryDate);

    const activePeriod = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId, isClosed: false, startDate: { lte: new Date(entryData.entryDate) }, endDate: { gte: new Date(entryData.entryDate) } },
    });
    if (!activePeriod) throw new BadRequestException('No open accounting period for this date');

    const activeFiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!activeFiscalYear) throw new BadRequestException('No active fiscal year');

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: activeFiscalYear.id,
        periodId: activePeriod.id,
        entryNo,
        entryDate: new Date(entryData.entryDate),
        referenceType: entryData.referenceType || 'MANUAL',
        referenceId: entryData.referenceId || null,
        description: entryData.description,
        narration: entryData.narration || null,
        isPosted: entryData.autoPost || false,
        postedBy: entryData.autoPost ? userId : null,
        postedAt: entryData.autoPost ? new Date() : null,
        createdBy: userId,
        lines: {
          create: lines.map((line: any, i: number) => ({
            tenantId,
            accountId: line.accountId,
            lineNo: i + 1,
            description: line.description || null,
            debitAmount: line.debitAmount || 0,
            creditAmount: line.creditAmount || 0,
            currency: line.currency || 'NPR',
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async post(tenantId: string, id: string, userId: string) {
    const entry = await this.findOne(tenantId, id);
    if (entry.isPosted) throw new BadRequestException('Entry already posted');
    if (entry.isReversed) throw new BadRequestException('Cannot post a reversed entry');

    return this.prisma.journalEntry.update({
      where: { id },
      data: { isPosted: true, postedBy: userId, postedAt: new Date() },
      include: { lines: { include: { account: true } } },
    });
  }

  async reverse(tenantId: string, id: string, userId: string, reason: string) {
    const original = await this.findOne(tenantId, id);
    if (!original.isPosted) throw new BadRequestException('Can only reverse posted entries');
    if (original.isReversed) throw new BadRequestException('Entry already reversed');

    const reversalEntryNo = await this.generateEntryNo(tenantId, new Date().toISOString());
    const activePeriod = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId, isClosed: false },
    });
    const activeFiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!activeFiscalYear) throw new BadRequestException('No active fiscal year');
    if (!activePeriod) throw new BadRequestException('No active accounting period');

    const reversal = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        fiscalYearId: activeFiscalYear.id,
        periodId: activePeriod.id,
        entryNo: reversalEntryNo,
        entryDate: new Date(),
        referenceType: 'REVERSAL',
        referenceId: id,
        description: `Reversal of ${original.entryNo}: ${reason}`,
        narration: reason,
        isPosted: true,
        postedBy: userId,
        postedAt: new Date(),
        reversalOfId: id,
        createdBy: userId,
        lines: {
          create: original.lines.map((line, i) => ({
            tenantId,
            accountId: line.accountId,
            lineNo: i + 1,
            description: `Reversal: ${line.description || original.entryNo}`,
            debitAmount: line.creditAmount,
            creditAmount: line.debitAmount,
            currency: line.currency,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    await this.prisma.journalEntry.update({
      where: { id },
      data: { isReversed: true },
    });

    return reversal;
  }

  private async generateEntryNo(tenantId: string, dateStr: string): Promise<string> {
    const date = new Date(dateStr);
    const prefix = `JE${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.journalEntry.count({
      where: { tenantId, entryNo: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
