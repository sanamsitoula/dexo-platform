import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantOnboarding(tenantId: string) {
    const o = await this.prisma.tenantOnboarding.findUnique({ where: { tenantId } });
    if (!o) throw new NotFoundException('Onboarding not started for this tenant');
    return o;
  }

  async saveTenantStep(tenantId: string, step: number, data: Record<string, unknown>) {
    if (step < 1 || step > 6) throw new BadRequestException('Step must be 1..6');
    const existing = await this.prisma.tenantOnboarding.findUnique({ where: { tenantId } });
    const flags = this.computeFlags(step, data);
    if (!existing) {
      return this.prisma.tenantOnboarding.create({
        data: { tenantId, step, totalSteps: 6, ...flags },
      });
    }
    return this.prisma.tenantOnboarding.update({
      where: { tenantId },
      data: { step, ...flags },
    });
  }

  private computeFlags(step: number, _data: Record<string, unknown>) {
    return {
      profileComplete: step >= 1,
      brandingComplete: step >= 4,
      modulesComplete: step >= 3,
      teamComplete: step >= 5,
      websiteComplete: step >= 6,
      billingComplete: step >= 6,
    };
  }

  async completeTenantOnboarding(tenantId: string) {
    return this.prisma.tenantOnboarding.update({
      where: { tenantId },
      data: {
        completed: true,
        completedAt: new Date(),
        step: 6,
        profileComplete: true,
        brandingComplete: true,
        modulesComplete: true,
        teamComplete: true,
        websiteComplete: true,
        billingComplete: true,
      },
    });
  }

  async startCustomerOnboarding(tenantId: string, email: string, source: string, totalSteps = 4) {
    return this.prisma.customerOnboarding.create({
      data: { tenantId, email, source, step: 1, totalSteps, data: {} },
    });
  }

  async getCustomerOnboarding(id: string) {
    const o = await this.prisma.customerOnboarding.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Customer onboarding not found');
    return o;
  }

  async saveCustomerStep(id: string, step: number, data: Record<string, unknown>) {
    const existing = await this.prisma.customerOnboarding.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer onboarding not found');
    return this.prisma.customerOnboarding.update({
      where: { id },
      data: {
        step,
        data: { ...(existing.data as object), ...data } as any,
      },
    });
  }

  async completeCustomerOnboarding(id: string, userId?: string) {
    return this.prisma.customerOnboarding.update({
      where: { id },
      data: { completed: true, completedAt: new Date(), userId },
    });
  }
}
