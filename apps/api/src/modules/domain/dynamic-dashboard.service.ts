import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DynamicDashboardService {
  constructor(private prisma: PrismaService) {}

  async generateDashboardForDomain(domainCode: string, tenantId: string, roleCode: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
      include: {
        domainWidgets: {
          include: {
            module: true,
            role: true,
          },
        },
        domainThemes: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    } as any) as any;

    if (!domain) throw new NotFoundException('Domain not found');

    const widgets = await this.getRoleSpecificWidgets(domain.domainWidgets, roleCode);
    const currentTheme = domain.domainThemes[0];
    const tenantInfo = await this.getTenantDashboardData(tenantId, domainCode);

    return {
      domain: {
        id: domain.id,
        name: domain.name,
        code: domain.code,
      },
      tenantId,
      roleCode,
      theme: currentTheme ? {
        id: currentTheme.id,
        name: currentTheme.name,
        code: currentTheme.code,
        primaryColor: currentTheme.primaryColor,
        secondaryColor: currentTheme.secondaryColor,
        backgroundColor: currentTheme.backgroundColor,
        textColor: currentTheme.textColor,
        logoUrl: currentTheme.logoUrl,
      } : null,
      widgets: widgets.map(widget => ({
        id: widget.id,
        code: widget.code,
        name: widget.name,
        description: widget.description,
        category: widget.category,
        icon: widget.icon,
        component: widget.component,
        config: widget.config,
        refreshInterval: widget.refreshInterval,
        position: widget.config?.position || { x: 0, y: 0, w: 6, h: 4 },
      })),
      data: tenantInfo,
      generatedAt: new Date(),
    };
  }

  private async getRoleSpecificWidgets(domainWidgets: any[], roleCode: string) {
    const userWidgets = domainWidgets.filter(widget => 
      !widget.role || widget.role.code === roleCode || widget.role.code === null
    );

    return userWidgets;
  }

  private async getTenantDashboardData(tenantId: string, domainCode: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { code: domainCode as any },
    });

    if (!domain) throw new NotFoundException('Domain not found');

    const dashboardData = {
      tenantInfo: {
        tenantId,
        domainType: domain.code,
        name: tenantId, // Placeholder
      },
    };

    switch (domain.code) {
      case 'FITNESS_CENTER':
        return {
          ...dashboardData,
          metrics: await this.getFitnessCenterDashboardData(tenantId),
        };
      case 'SALON_AND_SPA':
        return {
          ...dashboardData,
          metrics: await this.getSalonSpaDashboardData(tenantId),
        };
      case 'SCHOOL_AND_EDUCATION':
        return {
          ...dashboardData,
          metrics: await this.getSchoolDashboardData(tenantId),
        };
      case 'RESTAURANT_AND_CAFE':
        return {
          ...dashboardData,
          metrics: await this.getRestaurantDashboardData(tenantId),
        };
      case 'HOTEL_AND_HOSPITALITY':
        return {
          ...dashboardData,
          metrics: await this.getHotelDashboardData(tenantId),
        };
      case 'ECOMMERCE':
        return {
          ...dashboardData,
          metrics: await this.getEcommerceDashboardData(tenantId),
        };
      default:
        return dashboardData;
    }
  }

  private async getFitnessCenterDashboardData(tenantId: string) {
    const [members, trainers, classes, revenue, attendanceRate] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.domainRole.count({ where: { domain: { code: 'FITNESS_CENTER' }, code: 'trainer' } }),
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, paidAmount: { gt: 0 } },
        _count: true,
        _sum: { paidAmount: true },
      }),
    ]);

    const totalInvoices = await this.prisma.invoice.count({ where: { tenantId } });
    const paidInvoices = await this.prisma.invoice.count({ where: { tenantId, paidAmount: { gt: 0 } } });
    const attendancePercentage = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return {
      members: members || 0,
      trainers: trainers || 0,
      classes: classes || 0,
      revenue: revenue._sum.amount?.toNumber() || 0,
      attendanceRate: attendancePercentage.toFixed(2),
    };
  }

  private async getSalonSpaDashboardData(tenantId: string) {
    const [appointments, customers, revenue, stockValue] = await Promise.all([
      this.prisma.paymentReceived.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      this.prisma.supplier.aggregate({
        where: { tenantId },
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      appointments: appointments || 0,
      customers: customers || 0,
      revenue: revenue._sum.amount?.toNumber() || 0,
      inventoryValue: stockValue._sum.currentBalance?.toNumber() || 0,
    };
  }

  private async getSchoolDashboardData(tenantId: string) {
    const [students, teachers, examResults, collections] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.supplier.count({ where: { tenantId } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, invoiceType: 'TAX_INVOICE' },
        _avg: { totalAmount: true },
      }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
    ]);

    return {
      students: students || 0,
      teachers: teachers || 0,
      averageScore: examResults._avg.totalAmount?.toNumber() || 0,
      collections: collections._sum.amount?.toNumber() || 0,
    };
  }

  private async getRestaurantDashboardData(tenantId: string) {
    const [orders, customers, revenue] = await Promise.all([
      this.prisma.paymentReceived.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
    ]);

    return {
      orders: orders || 0,
      customers: customers || 0,
      revenue: revenue._sum.amount?.toNumber() || 0,
    };
  }

  private async getHotelDashboardData(tenantId: string) {
    const [guests, reservations, revenue, occupancyRate] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId },
        _count: true,
      }),
    ]);

    const totalReservations = await this.prisma.invoice.count({ where: { tenantId } });
    const paidReservations = await this.prisma.invoice.count({ where: { tenantId, paidAmount: { gt: 0 } } });
    const occupancyPercentage = totalReservations > 0 ? (paidReservations / totalReservations) * 100 : 0;

    return {
      guests: guests || 0,
      reservations: reservations || 0,
      revenue: revenue._sum.amount?.toNumber() || 0,
      occupancyRate: occupancyPercentage.toFixed(2),
    };
  }

  private async getEcommerceDashboardData(tenantId: string) {
    const [orders, customers, products, totalRevenue] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.chartOfAccount.count({ where: { tenantId, accountType: 'ASSET' } }),
      this.prisma.paymentReceived.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
    ]);

    return {
      orders: orders || 0,
      customers: customers || 0,
      products: products || 0,
      revenue: totalRevenue._sum.amount?.toNumber() || 0,
    };
  }

  async getWidgetByCode(domainCode: string, widgetCode: string, roleCode?: string) {
    const widget = await this.prisma.domainWidget.findFirst({
      where: {
        domain: { code: domainCode as any },
        code: widgetCode,
        ...(roleCode && { role: { code: roleCode } }),
        isVisible: true,
      },
      include: {
        module: true,
        role: true,
      },
    });

    if (!widget) throw new NotFoundException('Widget not found');

    return widget;
  }

  async createDomainWidget(dto: any) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: dto.domainId },
    });

    if (!domain) throw new Error('Domain not found');

    const module = await this.prisma.domainModule.findUnique({
      where: { id: dto.moduleId },
    });

    if (!module) throw new Error('Module not found');

    if (dto.roleId) {
      const role = await this.prisma.domainRole.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new Error('Role not found');
    }

    return this.prisma.domainWidget.create({
      data: {
        domain: { connect: { id: dto.domainId } },
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'DASHBOARD',
        icon: dto.icon,
        component: dto.component,
        config: dto.config || {},
        module: { connect: { id: dto.moduleId } },
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
        isVisible: dto.isVisible !== false,
        refreshInterval: dto.refreshInterval,
      },
    });
  }

  async updateDomainWidget(id: string, dto: any) {
    return this.prisma.domainWidget.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        component: dto.component,
        config: dto.config,
        module: dto.moduleId ? { connect: { id: dto.moduleId } } : undefined,
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
        isVisible: dto.isVisible,
        refreshInterval: dto.refreshInterval,
      },
    });
  }

  async deleteDomainWidget(id: string) {
    return this.prisma.domainWidget.delete({
      where: { id },
    });
  }
}
