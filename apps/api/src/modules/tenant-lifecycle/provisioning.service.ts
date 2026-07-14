import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService, TenantMailService } from '@dexo/shared';
import { ConfigService } from '@nestjs/config';
import { SlugService } from './slug.service';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { DomainProvisioningService } from '../domain/domain-provisioning.service';
import { getTemplate } from '@dexo/shared/src/themes';
import { getComponentDef, mapTemplateSectionToComponent } from '@dexo/shared/src/page-builder';

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
      throw new ConflictException(`Slug not available: ${slugValidation.reason}`);
    }

    const existingOwner = await this.prisma.user.findUnique({ where: { email: input.ownerEmail } });
    if (existingOwner) {
      throw new ConflictException(`An account with email ${input.ownerEmail} already exists`);
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

    // Seed a real, editable, ACTIVE TenantTheme from whatever template/colors
    // were chosen at signup — so brand color is connected from day one
    // instead of only lazily backfilled the first time someone opens Theme
    // Builder (see ThemeBuilderService.ensureSeedTheme for that fallback,
    // which now never has anything to do for tenants provisioned after this
    // change, since one already exists). Without this, "the color I picked
    // at signup" and "the color Theme Builder lets me edit" were two
    // different, disconnected things until first Theme Builder visit.
    if (input.branding?.templateId) {
      const tpl = getTemplate(input.branding.templateId);
      if (tpl) {
        await this.prisma.tenantTheme.create({
          data: {
            tenantId: tenant.id,
            name: `${tpl.templateName} (from signup)`,
            baseTemplateId: input.branding.templateId,
            colorPrimary: input.branding.colorPrimary || tpl.palette.primary,
            colorAccent: input.branding.colorAccent || tpl.palette.accent,
            colorBackground: tpl.palette.background,
            colorSurface: tpl.palette.surface,
            colorText: tpl.palette.text,
            colorTextSecondary: tpl.palette.textSecondary,
            borderRadius: Math.min(tpl.borderRadius, 14),
            isActive: true,
          },
        });

        // Seed a real, editable Home page from the template's recommended
        // section "journey" — previously the homepage's Trainers/About Us/
        // How It Works/etc. sections were hardcoded placeholder copy baked
        // into TemplateHome.tsx ("Explore trainers at {name}."), completely
        // invisible to and unmanageable from Pages/Homepage Sections/Forms/
        // Media in tenant-admin. This creates the same content as an actual
        // Page + PageSections so it shows up and is editable immediately.
        // NOTE: the homepage still renders via the legacy TemplateHome path
        // today — wiring page.tsx to prefer this real Page when one exists
        // is the next, higher-risk step (it's the production homepage
        // renderer for every existing template-based tenant), scoped
        // separately rather than changed inline here.
        const homePage = await this.prisma.page.create({
          data: {
            tenantId: tenant.id,
            name: 'Home',
            slug: 'home',
            template: 'default',
            status: 'published',
            isHomepage: true,
          },
        });
        let sortOrder = 0;
        for (const keyword of tpl.sections) {
          const componentType = mapTemplateSectionToComponent(keyword);
          // "hero" is skipped here specifically: TemplateHome/EcommerceHome
          // (the shell this Home page renders inside) already renders its
          // OWN hero natively from tpl.hero — adding a "hero" PageSection
          // too would duplicate it (two <h1>s, two different hero styles
          // stacked on one page). Standalone custom pages (Page Builder's
          // own "+ Import from template" button) are NOT inside that shell,
          // so they still get a real hero section there.
          if (!componentType || componentType === 'hero') continue;
          const def = getComponentDef(componentType);
          let content: Record<string, any> = def?.defaultContent || {};
          if (componentType === 'cta') content = { ...content, ctaLabel: tpl.hero.cta };
          await this.prisma.pageSection.create({
            data: { tenantId: tenant.id, pageId: homePage.id, componentType, content, sortOrder: sortOrder++, status: 'published' },
          });
        }

        // Seed a real Contact form (name/email/phone/subject/message) +
        // About/Services/Contact pages that embed it — previously these were
        // static Next.js routes (apps/tenant-website/app/about|services|contact
        // /page.tsx) with their own hardcoded copy AND, for Contact, its own
        // hardcoded form completely outside Forms Builder. Those routes now
        // prefer this real content when it exists (see their updated
        // page.tsx), falling back to the old hardcoded version only if a
        // tenant genuinely has none (pre-existing tenants not yet backfilled).
        const contactForm = await this.prisma.form.create({
          data: {
            tenantId: tenant.id,
            name: 'Contact Us',
            slug: 'contact-us',
            status: 'published',
            submitLabel: 'Send Message',
            successMessage: "Thanks for reaching out — we'll get back to you within 24 hours.",
          },
        });
        const contactFields: Array<{ type: string; label: string; required: boolean }> = [
          { type: 'text', label: 'Full Name', required: true },
          { type: 'email', label: 'Email', required: true },
          { type: 'phone', label: 'Phone', required: false },
          { type: 'text', label: 'Subject', required: false },
          { type: 'textarea', label: 'Message', required: true },
        ];
        for (let i = 0; i < contactFields.length; i++) {
          const f = contactFields[i];
          await this.prisma.formField.create({
            data: { tenantId: tenant.id, formId: contactForm.id, type: f.type, label: f.label, required: f.required, sortOrder: i },
          });
        }

        const seedPage = async (name: string, slug: string, sections: Array<{ componentType: string; content: Record<string, any> }>) => {
          const page = await this.prisma.page.create({
            data: { tenantId: tenant.id, name, slug, template: 'default', status: 'published' },
          });
          for (let i = 0; i < sections.length; i++) {
            await this.prisma.pageSection.create({
              data: { tenantId: tenant.id, pageId: page.id, componentType: sections[i].componentType, content: sections[i].content, sortOrder: i, status: 'published' },
            });
          }
        };

        await seedPage('About', 'about', [
          { componentType: 'hero', content: { title: `About ${input.name}`, subtitle: tpl.hero.subtitle, ctaLabel: '', ctaUrl: '' } },
          { componentType: 'team', content: getComponentDef('team')!.defaultContent },
          { componentType: 'cta', content: { ...getComponentDef('cta')!.defaultContent, title: `Come visit ${input.name}`, ctaLabel: tpl.hero.cta } },
        ]);
        await seedPage('Services', 'services', [
          { componentType: 'hero', content: { title: `What ${input.name} Offers`, subtitle: tpl.hero.subtitle, ctaLabel: '', ctaUrl: '' } },
          { componentType: 'features', content: getComponentDef('features')!.defaultContent },
          { componentType: 'pricing', content: getComponentDef('pricing')!.defaultContent },
        ]);
        await seedPage('Contact', 'contact', [
          { componentType: 'hero', content: { title: 'Get in Touch', subtitle: "We'd love to hear from you.", ctaLabel: '', ctaUrl: '' } },
          { componentType: 'contact', content: getComponentDef('contact')!.defaultContent },
          { componentType: 'form', content: { formId: contactForm.id } },
        ]);
      }
    }

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
    const adminUrl = `http://${input.slug}.${platformDomain}/admin`;

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
