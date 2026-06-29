import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DomainWidgetService {
  constructor(private prisma: PrismaService) {}

  async getDomainWidgets(domainCode: string, roleCode?: string) {
    const where: any = {
      domain: { code: domainCode },
      isVisible: true,
    };
    if (roleCode) {
      where.role = { code: roleCode };
    }

    return this.prisma.domainWidget.findMany({
      where,
      include: {
        module: true,
        role: true,
      },
      orderBy: [ { category: 'asc' }, { name: 'asc' } ],
    });
  }

  async getWidgetByCode(domainCode: string, widgetCode: string, roleCode?: string) {
    return this.prisma.domainWidget.findFirst({
      where: {
        domain: { code: domainCode },
        code: widgetCode,
        ...(roleCode && { role: { code: roleCode } }),
        isVisible: true,
      },
      include: {
        module: true,
        role: true,
      },
    });
  }

  async getDashboardWidgets(domainCode: string, roleCode?: string) {
    const widgets = await this.getDomainWidgets(domainCode, roleCode);
    return widgets.filter(w => w.category === 'DASHBOARD');
  }

  async getAnalyticsWidgets(domainCode: string, roleCode?: string) {
    const widgets = await this.getDomainWidgets(domainCode, roleCode);
    return widgets.filter(w => w.category === 'ANALYTICS');
  }

  async getReportsWidgets(domainCode: string, roleCode?: string) {
    const widgets = await this.getDomainWidgets(domainCode, roleCode);
    return widgets.filter(w => w.category === 'REPORTS');
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
