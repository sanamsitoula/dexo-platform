import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BranchReportsService {
  constructor(private prisma: PrismaService) {}

  async getBranchOverview(tenantId: string, branchId: string, period?: { startDate?: string; endDate?: string }) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const startDate = period?.startDate ? new Date(period.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = period?.endDate ? new Date(period.endDate) : new Date();

    const [revenue, expenses, customerCount, attendance, scheduleCount] = await Promise.all([
      this.getBranchRevenue(tenantId, branchId, startDate, endDate),
      this.getBranchExpenses(tenantId, branchId, startDate, endDate),
      this.getCustomerCount(tenantId, branchId),
      this.getAttendanceStats(tenantId, branchId, startDate, endDate),
      this.getScheduleCount(tenantId, branchId, startDate, endDate),
    ]);

    return {
      branch: {
        id: branch.id,
        code: branch.code,
        name: branch.name,
        type: branch.type,
        city: branch.city,
        isHeadquarters: branch.isHeadquarters,
      },
      period: { startDate, endDate },
      revenue,
      expenses,
      profit: revenue.totalRevenue.sub(expenses.totalAmount),
      metrics: {
        customers: customerCount,
        attendance: attendance,
        schedules: scheduleCount,
      },
    };
  }

  async getBranchRevenue(
    tenantId: string,
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRevenue: Decimal;
    totalInvoiced: Decimal;
    totalCollected: Decimal;
    invoiceCount: number;
    paymentCount: number;
  }> {
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          branchId,
          invoiceDate: { gte: startDate, lte: endDate },
          isActive: true,
        },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
      }),
      this.prisma.paymentReceived.aggregate({
        where: {
          tenantId,
          branchId,
          paymentDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalInvoiced: invoices._sum.totalAmount || new Decimal(0),
      totalCollected: payments._sum.amount || new Decimal(0),
      totalRevenue: invoices._sum.paidAmount || new Decimal(0),
      invoiceCount: invoices._count,
      paymentCount: payments._count,
    };
  }

  async getBranchExpenses(tenantId: string, branchId: string, startDate: Date, endDate: Date) {
    const expenses = await this.prisma.branchExpense.aggregate({
      where: {
        branch: { tenantId },
        branchId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const byCategory = await this.prisma.branchExpense.groupBy({
      by: ['category'],
      where: {
        branch: { tenantId },
        branchId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return {
      totalAmount: expenses._sum.amount || new Decimal(0),
      expenseCount: expenses._count,
      byCategory: byCategory.map(c => ({ category: c.category, amount: c._sum.amount })),
    };
  }

  async getCustomerCount(tenantId: string, branchId: string) {
    return this.prisma.customer.count({
      where: { tenantId, branchId, isActive: true },
    });
  }

  async getAttendanceStats(tenantId: string, branchId: string, startDate: Date, endDate: Date) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        branch: { tenantId },
        branchId,
        checkInTime: { gte: startDate, lte: endDate },
      },
    });

    const totalCheckins = attendances.length;
    const uniqueVisitors = new Set(attendances.map(a => a.customerId || a.userId)).size;
    const totalDuration = attendances.reduce((sum, a) => sum + (a.duration || 0), 0);

    return {
      totalCheckins,
      uniqueVisitors,
      averageDuration: totalCheckins > 0 ? Math.round(totalDuration / totalCheckins) : 0,
    };
  }

  async getScheduleCount(tenantId: string, branchId: string, startDate: Date, endDate: Date) {
    return this.prisma.branchSchedule.count({
      where: {
        branch: { tenantId },
        branchId,
        startTime: { gte: startDate, lte: endDate },
      },
    });
  }

  // ===================== COMPARATIVE REPORTS =====================

  async getAllBranchesReport(tenantId: string, period?: { startDate?: string; endDate?: string }) {
    const startDate = period?.startDate ? new Date(period.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = period?.endDate ? new Date(period.endDate) : new Date();

    const branches = await this.prisma.branch.findMany({
      where: { tenantId, status: 'active' },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    });

    const branchReports = await Promise.all(
      branches.map(async (branch) => {
        const overview = await this.getBranchOverview(tenantId, branch.id, { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
        return overview;
      }),
    );

    // Aggregate totals
    const totalRevenue = branchReports.reduce((sum, r) => sum.add(r.revenue.totalRevenue), new Decimal(0));
    const totalExpenses = branchReports.reduce((sum, r) => sum.add(r.expenses.totalAmount), new Decimal(0));
    const totalProfit = totalRevenue.sub(totalExpenses);
    const totalCustomers = branchReports.reduce((sum, r) => sum + r.metrics.customers, 0);

    return {
      period: { startDate, endDate },
      summary: {
        totalBranches: branches.length,
        totalRevenue,
        totalExpenses,
        totalProfit,
        totalCustomers,
        averageRevenuePerBranch: branches.length > 0 ? totalRevenue.div(branches.length) : new Decimal(0),
      },
      branches: branchReports,
      topPerformer: branchReports.length > 0
        ? branchReports.reduce((top, b) => (b.profit.greaterThan(top.profit) ? b : top))
        : null,
    };
  }

  async getStaffPerformanceReport(tenantId: string, branchId: string, period?: { startDate?: string; endDate?: string }) {
    const startDate = period?.startDate ? new Date(period.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = period?.endDate ? new Date(period.endDate) : new Date();

    const branchUsers = await this.prisma.branchUser.findMany({
      where: { branchId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
    });

    const staffReports = await Promise.all(
      branchUsers.map(async (bu) => {
        const attendances = await this.prisma.attendance.count({
          where: { userId: bu.userId, branchId, checkInTime: { gte: startDate, lte: endDate } },
        });
        const schedules = await this.prisma.branchSchedule.count({
          where: { userId: bu.userId, branchId, startTime: { gte: startDate, lte: endDate } },
        });
        return {
          staff: bu.user,
          role: bu.role,
          attendances,
          schedules,
          attendanceRate: schedules > 0 ? Math.round((attendances / schedules) * 100) : 0,
        };
      }),
    );

    return {
      period: { startDate, endDate },
      staff: staffReports.sort((a, b) => b.attendanceRate - a.attendanceRate),
    };
  }

  // ===================== REPORT PERSISTENCE =====================

  async saveReport(tenantId: string, branchId: string, reportType: string, period: string, data: any, userId?: string) {
    return this.prisma.branchReport.upsert({
      where: {
        branchId_reportType_period: {
          branchId,
          reportType,
          period,
        },
      },
      create: {
        branchId,
        reportType,
        period,
        data,
        generatedBy: userId,
      },
      update: {
        data,
        generatedAt: new Date(),
        generatedBy: userId,
      },
    });
  }

  async getSavedReports(tenantId: string, branchId: string, params?: { reportType?: string; period?: string }) {
    const where: any = { branch: { tenantId }, branchId };
    if (params?.reportType) where.reportType = params.reportType;
    if (params?.period) where.period = params.period;
    return this.prisma.branchReport.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
    });
  }
}
