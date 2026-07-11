import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { SlugService } from './slug.service';

export interface CreateTenantInput {
  slug: string;
  name: string;
  domainType: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName?: string;
  ownerLastName?: string;
}

export interface ProvisionResult {
  tenantId: string;
  subdomain: string;
  url: string;
}

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  async provisionTenant(input: CreateTenantInput): Promise<ProvisionResult> {
    const slugValidation = await this.slugService.validateSlug(input.slug);
    if (!slugValidation.available) {
      throw new Error(`Slug not available: ${slugValidation.reason}`);
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.name,
        subdomain: input.slug,
        status: 'active',
      },
    });

    await this.slugService.reserveSlug(tenant.id, input.slug);

    await this.prisma.tenantOnboarding.create({
      data: {
        tenantId: tenant.id,
        step: 1,
        totalSteps: 6,
        profileComplete: false,
        brandingComplete: false,
        modulesComplete: false,
        teamComplete: false,
        websiteComplete: false,
        billingComplete: false,
      },
    });

    await this.prisma.tenantLifecycle.update({
      where: { tenantId: tenant.id },
      data: { status: 'ACTIVE', provisionedAt: new Date(), sslStatus: 'ACTIVE' },
    });

    const platformDomain = process.env.PLATFORM_DOMAIN || 'onedexo.com';
    return {
      tenantId: tenant.id,
      subdomain: input.slug,
      url: `http://${input.slug}.${platformDomain}`,
    };
  }
}
