import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaTenantService) {}

  async set(data: { key: string; value: any; tenantId?: string; isPublic?: boolean }) {
    const tenantId = data.tenantId || null;
    // Prisma compound uniques reject null members, so platform-level settings
    // (tenantId = null) can't use upsert on tenantId_key — find + create/update.
    const existing = await this.prisma.setting.findFirst({
      where: { tenantId, key: data.key },
    });
    if (existing) {
      return this.prisma.setting.update({
        where: { id: existing.id },
        data: { value: data.value, ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}) },
      });
    }
    return this.prisma.setting.create({
      data: { tenantId, key: data.key, value: data.value, isPublic: data.isPublic ?? false },
    });
  }

  async get(key: string, tenantId?: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { tenantId: tenantId || null, key },
    });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting.value;
  }

  async getAll(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null, isPublic: true }];
    } else {
      where.tenantId = null;
    }
    const settings = await this.prisma.setting.findMany({ where });
    const result: Record<string, any> = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    return result;
  }

  async remove(key: string, tenantId?: string) {
    const existing = await this.prisma.setting.findFirst({
      where: { tenantId: tenantId || null, key },
    });
    if (!existing) throw new NotFoundException('Setting not found');
    await this.prisma.setting.delete({ where: { id: existing.id } });
    return { message: 'Setting deleted' };
  }

  async getBranding() {
    let branding = await this.prisma.platformBranding.findFirst();
    if (!branding) {
      branding = await this.prisma.platformBranding.create({
        data: {
          platformName: 'Dexo',
          tagline: 'Multi-tenant SaaS Platform',
        },
      });
    }
    return branding;
  }

  async updateBranding(data: any) {
    const existing = await this.prisma.platformBranding.findFirst();
    if (!existing) {
      return this.prisma.platformBranding.create({ data });
    }
    return this.prisma.platformBranding.update({
      where: { id: existing.id },
      data,
    });
  }
}
