import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

/**
 * Read-only, unauthenticated data for a fitness tenant's public marketing
 * website (tenant-website app): branding/landing info + active membership
 * plans. Everything is resolved by subdomain so no JWT is required.
 */
@Injectable()
export class FitnessPublicService {
  constructor(private prisma: PrismaService) {}

  private async resolveTenant(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, name: true, subdomain: true, status: true, settings: true },
    });
    if (!tenant) throw new NotFoundException(`No tenant found for "${subdomain}"`);
    return tenant;
  }

  /** Landing-page info: name, branding (from settings JSON), and headquarters contact. */
  async getInfo(subdomain: string) {
    const tenant = await this.resolveTenant(subdomain);
    const settings = (tenant.settings as Record<string, any>) || {};

    const hq = await this.prisma.branch.findFirst({
      where: { tenantId: tenant.id, status: 'active' },
      orderBy: { isHeadquarters: 'desc' },
      select: { name: true, address: true, city: true, phone: true, email: true },
    });

    const branchCount = await this.prisma.branch.count({
      where: { tenantId: tenant.id, status: 'active' },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      tagline: settings.tagline || 'Transform your body. Transform your life.',
      description:
        settings.description ||
        `Join ${tenant.name} — modern gym & fitness management with workout plans, diet tracking, classes and more.`,
      logoUrl: settings.logoUrl || null,
      colorPrimary: settings.colorPrimary || settings.primaryColor || '#E85D24',
      colorAccent: settings.colorAccent || settings.accentColor || '#F2A623',
      branchCount,
      contact: hq
        ? { branch: hq.name, address: hq.address, city: hq.city, phone: hq.phone, email: hq.email }
        : null,
    };
  }

  /** Active membership plans for the tenant, cheapest first. */
  async getPlans(subdomain: string) {
    const tenant = await this.resolveTenant(subdomain);
    const plans = await this.prisma.membershipPlan.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceNpr: 'asc' }],
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      durationDays: p.durationDays,
      priceNpr: Number(p.priceNpr),
      totalWithVat: Number(p.totalWithVat),
      includesTrainer: p.includesTrainer,
      includesClasses: p.includesClasses,
      includesDietPlan: p.includesDietPlan,
      includesLocker: p.includesLocker,
      accessHours: p.accessHours,
      branchAccess: p.branchAccess,
    }));
  }
}
