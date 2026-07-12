import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService, TenantMailService } from '@dexo/shared';
import { ConfigService } from '@nestjs/config';
import { SlugService } from './slug.service';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { DomainProvisioningService } from '../domain/domain-provisioning.service';

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
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
    private readonly chatwoot: ChatwootService,
    private readonly tenantMail: TenantMailService,
    private readonly configService: ConfigService,
    private readonly domainProvisioning: DomainProvisioningService,
  ) {}

  async provisionTenant(input: CreateTenantInput): Promise<ProvisionResult> {
    const slugValidation = await this.slugService.validateSlug(input.slug);
    if (!slugValidation.available) {
      throw new Error(`Slug not available: ${slugValidation.reason}`);
    }

    const existingOwner = await this.prisma.user.findUnique({ where: { email: input.ownerEmail } });
    if (existingOwner) {
      throw new Error(`An account with email ${input.ownerEmail} already exists`);
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

    // Seed default tenant roles (admin/staff/customer), plus vertical-specific
    // roles for domain types with a dedicated module (e.g. ecommerce). Mirrors
    // RoleService.seedTenantDefaultRoles in @dexo/role (kept prisma-only here
    // to avoid a cross-package module dependency in provisioning).
    await this.seedDefaultRoles(tenant.id, input.domainType);

    if (this.isEcommerceDomain(input.domainType)) {
      await this.seedEcommerceDefaults(tenant.id);
    }

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
    const adminUrl = `http://admin.${input.slug}.${platformDomain}`;

    // Create the tenant owner's login account and grant it the tenant's
    // admin role, so they can log into tenant-admin immediately — tenant
    // provisioning used to only create the tenant/roles/onboarding shell,
    // leaving every new tenant with zero users able to log in.
    const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS') || '10', 10);
    const passwordHash = await bcrypt.hash(input.ownerPassword, saltRounds);
    const owner = await this.prisma.user.create({
      data: {
        email: input.ownerEmail,
        passwordHash,
        firstName: input.ownerFirstName || input.name,
        lastName: input.ownerLastName || '',
        tenantId: tenant.id,
        status: 'active',
      },
    });
    const adminRole = await this.prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'admin' } });
    if (adminRole) {
      await this.prisma.userRoles.create({
        data: { userId: owner.id, roleId: adminRole.id, assignedById: owner.id },
      });
    } else {
      this.logger.warn(`No admin role found for tenant ${input.slug} — owner created without a role`);
    }

    this.tenantMail
      .sendTenantAdminWelcome(tenant.id, owner.email, owner.firstName || 'there', adminUrl)
      .catch((err) => this.logger.warn(`Tenant admin welcome email failed for ${input.slug}: ${err?.message}`));

    // Link the tenant to its business-type Domain record (TenantDomain +
    // TenantEnabledModule rows) and seed domain-specific defaults — for
    // FITNESS_CENTER this creates the HQ branch + starter membership plans
    // that member signup/checkin/mobile onboarding all depend on. Without
    // this, tenants provisioned here had no TenantDomain row at all, silently
    // breaking anything downstream keyed off it (fitness member auto-create,
    // domain-menus). DomainRole/DomainModule seeding inside quickSetup is a
    // no-op today (DomainRole table is empty) — role seeding is still handled
    // by seedDefaultRoles() above, so there's no duplicate-role risk.
    if (input.domainType) {
      await this.domainProvisioning.quickSetup(tenant.id, owner.id, input.domainType);
    }

    // Chatwoot Tier-1 inbox (customer <-> tenant) + Tier-2 contact (tenant
    // owner <-> platform) — best-effort: Chatwoot being unconfigured or
    // unreachable must never fail tenant provisioning. Platform admin can
    // re-provision from tenant-admin's Chat settings later.
    this.chatwoot.provisionTenantInbox(tenant.id).catch((err) => {
      this.logger.warn(`Chatwoot inbox provisioning skipped for ${input.slug}: ${err?.message}`);
    });
    const ownerName = [input.ownerFirstName, input.ownerLastName].filter(Boolean).join(' ') || input.name;
    this.chatwoot.registerTenantOwnerAsContact(tenant.id, ownerName, input.ownerEmail).catch((err) => {
      this.logger.warn(`Chatwoot owner-contact registration skipped for ${input.slug}: ${err?.message}`);
    });

    return {
      tenantId: tenant.id,
      subdomain: input.slug,
      url: `http://${input.slug}.${platformDomain}`,
    };
  }

  private isEcommerceDomain(domainType?: string): boolean {
    const d = (domainType || '').toLowerCase();
    return d.includes('ecommerce') || d.includes('e-commerce') || d.includes('retail') || d.includes('shop');
  }

  private async seedDefaultRoles(tenantId: string, domainType?: string): Promise<void> {
    const allModules = [
      'crm', 'blog', 'billing', 'attendance', 'subscriptions',
      'website_builder', 'roles', 'users', 'settings', 'reports',
    ];
    const staffModules = ['crm', 'blog', 'billing', 'attendance', 'website_builder', 'reports'];

    if (this.isEcommerceDomain(domainType)) {
      allModules.push('ecommerce');
      staffModules.push('ecommerce');
    }

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

    // Ecommerce-vertical roles (Tenant Owner Ecommerce Manager / Sales
    // Manager / Inventory Manager / Warehouse Manager / Finance Manager /
    // Marketing Manager / Customer Support map onto the ecommerce + billing +
    // crm modules that actually exist today). Purchase Manager and a
    // dedicated Logistics Manager are deferred — no Purchase module yet and
    // shipment tracking is currently part of `ecommerce`, not a standalone
    // Logistics module. See docs/ECOMMERCE_MODULE.md "Roadmap".
    if (this.isEcommerceDomain(domainType)) {
      tenantRoles.push(
        {
          name: 'ecommerce_manager',
          description: 'Full catalog, inventory, order and storefront management',
          permissions: ['ecommerce:*', 'website_builder:*', 'reports:view'],
        },
        {
          name: 'sales_manager',
          description: 'Orders, customers, coupons and sales reporting',
          permissions: ['ecommerce:view', 'ecommerce:create', 'ecommerce:edit', 'crm:*', 'reports:view'],
        },
        {
          name: 'inventory_manager',
          description: 'Products, stock levels and warehouse adjustments',
          permissions: ['ecommerce:view', 'ecommerce:create', 'ecommerce:edit'],
        },
        {
          name: 'finance_manager',
          description: 'Billing, invoicing and revenue reporting',
          permissions: ['billing:*', 'reports:*', 'ecommerce:view_financials'],
        },
        {
          name: 'customer_support',
          description: 'CRM inbox and order lookup for customer queries',
          permissions: ['crm:*', 'ecommerce:view'],
        },
        {
          name: 'seo_content_manager',
          description: 'Website pages, blog and product SEO fields',
          permissions: ['website_builder:*', 'blog:*', 'ecommerce:view', 'ecommerce:edit'],
        },
        {
          name: 'picker_packer',
          description: 'Warehouse fulfillment only — no financial or customer data access',
          permissions: ['ecommerce:view', 'ecommerce:pick'],
        },
      );
    }

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

  /**
   * Ecommerce tenant defaults — the minimum needed to start selling with no
   * manual setup: a default warehouse (required before any stock can be
   * tracked) and an "Uncategorized" catalog bucket. Deliberately does NOT
   * seed fake demo products into what will become the tenant's live store.
   */
  private async seedEcommerceDefaults(tenantId: string): Promise<void> {
    await this.prisma.warehouse.create({
      data: { tenantId, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    });
    await this.prisma.productCategory.create({
      data: { tenantId, name: 'Uncategorized', slug: 'uncategorized' },
    });
  }
}
