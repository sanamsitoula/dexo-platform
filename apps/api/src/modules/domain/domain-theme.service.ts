import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DomainThemeService {
  constructor(private prisma: PrismaService) {}

  async getDomainThemes(domainCode: string) {
    return this.prisma.domainTheme.findMany({
      where: {
        domain: { code: domainCode as any },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getDomainTheme(domainCode: string, themeCode?: string) {
    const where: any = {
      domain: { code: domainCode },
      isActive: true,
    };

    if (themeCode) {
      where.code = themeCode;
    }

    return this.prisma.domainTheme.findFirst({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createDomainTheme(dto: any) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: dto.domainId },
    });

    if (!domain) throw new Error('Domain not found');

    if (dto.code) {
      const existing = await this.prisma.domainTheme.findUnique({
        where: { code: dto.code },
      });
      if (existing) throw new Error('Theme code already exists');
    }

    return this.prisma.domainTheme.create({
      data: {
        domain: { connect: { id: dto.domainId } },
        name: dto.name,
        code: dto.code,
        primaryColor: dto.primaryColor || '#2563eb',
        secondaryColor: dto.secondaryColor || '#10b981',
        backgroundColor: dto.backgroundColor || '#f9fafb',
        textColor: dto.textColor || '#1f2937',
        logoUrl: dto.logoUrl,
        primaryFont: dto.primaryFont || 'Inter, system-ui, sans-serif',
        dashboardTemplate: dto.dashboardTemplate || {},
        websiteTemplate: dto.websiteTemplate || {},
        isActive: dto.isActive !== false,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateDomainTheme(id: string, dto: any) {
    return this.prisma.domainTheme.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        backgroundColor: dto.backgroundColor,
        textColor: dto.textColor,
        logoUrl: dto.logoUrl,
        primaryFont: dto.primaryFont,
        dashboardTemplate: dto.dashboardTemplate,
        websiteTemplate: dto.websiteTemplate,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteDomainTheme(id: string) {
    return this.prisma.domainTheme.delete({
      where: { id },
    });
  }

  async activateTheme(domainId: string, themeId: string) {
    await this.prisma.domainTheme.updateMany({
      where: { domainId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.domainTheme.update({
      where: { id: themeId },
      data: { isActive: true },
    });
  }

  async getCurrentTheme(domainCode: string) {
    const theme = await this.prisma.domainTheme.findFirst({
      where: {
        domain: { code: domainCode as any },
        isActive: true,
      },
      include: {
        domain: true,
      },
    });

    return theme;
  }
}
