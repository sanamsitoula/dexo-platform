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
  /** Industry theme picked in the signup wizard (id from @dexo/shared industryThemes). */
  themeId?: string;
  branding?: {
    colorPrimary?: string;
    colorAccent?: string;
    logo?: string;
    /** Website template picked in the signup wizard (id from @dexo/shared websiteTemplates). */
    templateId?: string;
  };
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
        settings: {
          domainType: input.domainType || null,
          themeId: input.themeId || null,
          branding: input.branding || null,
        },
      },
    });

    await this.slugService.reserveSlug(tenant.id, input.slug);

    // Seed default tenant roles (admin/staff/customer). Mirrors
    // RoleService.seedTenantDefaultRoles in @dexo/role (kept prisma-only here
    // to avoid a cross-package module dependency in provisioning).
    await this.seedDefaultRoles(tenant.id);

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

  private async seedDefaultRoles(tenantId: string): Promise<void> {
    const allModules = [
      'crm', 'blog', 'billing', 'attendance', 'subscriptions',
      'website_builder', 'roles', 'users', 'settings', 'reports',
    ];
    const staffModules = ['crm', 'blog', 'billing', 'attendance', 'website_builder', 'reports'];

    const tenantRoles = [
      {
        name: 'admin',
        description: 'Full access to all modules for this tenant',
        permissions: allModules.map((m) => `${m}:*`),
      },
      {
        name: 'staff',
        description: 'View/create/edit on operational modules (no roles, settings or subscriptions)',
        permissions: [
          ...staffModules.flatMap((m) => [`${m}:view`, `${m}:create`, `${m}:edit`]),
          'users:view',
        ],
      },
      {
        name: 'customer',
        description: 'Minimal member access',
        permissions: ['blog:view', 'attendance:view'],
      },
    ];

    for (const roleData of tenantRoles) {
      const existing = await this.prisma.role.findFirst({
        where: { name: roleData.name, tenantId },
      });
      if (!existing) {
        await this.prisma.role.create({
          data: { ...roleData, isSystem: true, tenantId },
        });
      }
    }
  }
}
