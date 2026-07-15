import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService, TenantMailService } from '@dexo/shared';
import { ConfigService } from '@nestjs/config';
import { SlugService } from './slug.service';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { DomainProvisioningService } from '../domain/domain-provisioning.service';
// Root import (not the deep '@dexo/shared/src/themes' one): the src/ path only
// exists at compile time — at runtime the package resolves to dist/, so a deep
// src import crashes node with MODULE_NOT_FOUND on boot. The deep import is a
// client-bundle trick for Next apps; the API is server code and must not use it.
import { getTemplate } from '@dexo/shared';
import { getComponentDef, mapTemplateSectionToComponent } from '@dexo/shared';

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
    // `ecommerce` (the Store: Products/Categories/Brands/Orders/Customers/
    // Inventory) is a plan-based module any tenant can enable regardless of
    // domainType (e.g. a fitness gym selling supplements/merch) — see
    // ModuleAccessGuard/RequireModule, which already independently gates
    // actual access per the tenant's plan. It always belongs in the base
    // admin/staff roles' module list so a non-ecommerce-vertical tenant that
    // turns Store on isn't left with an admin role that can't use it (this
    // used to be gated on isEcommerceDomain(domainType), which meant e.g. a
    // fitness tenant's own admin never got `ecommerce:*` — surfaced as
    // "Missing required permission: ecommerce:pick" on /inventory).
    const allModules = [
      'crm', 'blog', 'billing', 'attendance', 'subscriptions',
      'website_builder', 'roles', 'users', 'settings', 'reports', 'ecommerce',
    ];
    const staffModules = ['crm', 'blog', 'billing', 'attendance', 'website_builder', 'reports', 'ecommerce'];

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
   * Ecommerce tenant defaults — everything a new store needs to look alive on
   * day one: a default warehouse (required before stock can be tracked), an
   * "Uncategorized" bucket, plus a curated showcase catalog (6 categories +
   * 8 products with real photography). The demo rows are fully editable and
   * deletable from tenant-admin like any other product; a minimum-5 guard in
   * EcommerceService keeps the storefront from being emptied to a blank shell
   * (see deleteProduct/deleteCategory). Without these rows the storefront
   * renders an empty grid — which is why a freshly-provisioned store looks
   * "broken". Idempotent: upserts by slug/sku so re-provisioning won't crash.
   */
  private async seedEcommerceDefaults(tenantId: string): Promise<void> {
    await this.prisma.warehouse.create({
      data: { tenantId, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    });
    await this.prisma.productCategory.create({
      data: { tenantId, name: 'Uncategorized', slug: 'uncategorized' },
    });

    for (const c of ECOM_DEMO_CATEGORIES) {
      await this.prisma.productCategory.upsert({
        where: { tenantId_slug: { tenantId, slug: c.slug } },
        create: { tenantId, name: c.name, slug: c.slug },
        update: { name: c.name },
      });
    }

    const cats = await this.prisma.productCategory.findMany({
      where: { tenantId, slug: { in: ECOM_DEMO_CATEGORIES.map((c) => c.slug) } },
      select: { id: true, slug: true },
    });
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

    for (const p of ECOM_DEMO_PRODUCTS) {
      await this.prisma.product.upsert({
        where: { tenantId_sku: { tenantId, sku: p.sku } },
        create: {
          tenantId,
          categoryId: catBySlug.get(p.categorySlug) || null,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          description: p.description,
          images: p.images,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          taxRatePercent: 13,
          trackInventory: false,
          isActive: true,
          isFeatured: p.isFeatured,
          metaTitle: p.name,
          metaDescription: p.description,
        },
        update: {
          name: p.name,
          description: p.description,
          images: p.images,
          sellingPrice: p.sellingPrice,
          isFeatured: p.isFeatured,
        },
      });
    }
  }
}

// Showcase catalog seeded for every ecommerce tenant so the storefront looks
// complete (not an empty grid) the moment onboarding finishes. Images are
// stable Unsplash photo URLs (royalty-free). Tenants edit/replace these from
// tenant-admin → Products like any other row.
interface DemoCategory {
  name: string;
  slug: string;
}
interface DemoProduct {
  sku: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  images: string[];
  costPrice: number;
  sellingPrice: number;
  isFeatured: boolean;
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const ECOM_DEMO_CATEGORIES: DemoCategory[] = [
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors' },
  { name: 'Accessories', slug: 'accessories' },
];

const ECOM_DEMO_PRODUCTS: DemoProduct[] = [
  {
    sku: 'DEMO-0001', slug: 'aurora-running-shoes', name: 'Aurora Running Shoes',
    description: 'Lightweight, breathable knit upper with responsive cushioning — built for daily miles and weekend adventures.',
    categorySlug: 'fashion',
    images: [U('1542291026-7eec264c27ff'), U('1556906781-9a412961c28c')],
    costPrice: 3000, sellingPrice: 4999, isFeatured: true,
  },
  {
    sku: 'DEMO-0002', slug: 'luxe-chronograph-watch', name: 'Luxe Chronograph Watch',
    description: 'Minimalist stainless-steel case, sapphire glass, and a precision quartz movement. Quietly confident.',
    categorySlug: 'accessories',
    images: [U('1523275335684-37898b6baf30'), U('1524805444758-089113d48a6d')],
    costPrice: 7500, sellingPrice: 12999, isFeatured: true,
  },
  {
    sku: 'DEMO-0003', slug: 'wireless-noise-cancel-headphones', name: 'Wireless Noise-Cancel Headphones',
    description: 'Studio-grade active noise cancellation, 40-hour battery, and plush memory-foam ear cups.',
    categorySlug: 'electronics',
    images: [U('1505740420928-5e560c06d30e'), U('1484704849700-f032a568e944')],
    costPrice: 4200, sellingPrice: 6999, isFeatured: true,
  },
  {
    sku: 'DEMO-0004', slug: 'minimalist-leather-backpack', name: 'Minimalist Leather Backpack',
    description: 'Full-grain vegan leather, padded 15" laptop sleeve, and weather-resistant lining. Commute-ready.',
    categorySlug: 'fashion',
    images: [U('1553062407-98eeb64c6a62'), U('1547949003-9792a18a2601')],
    costPrice: 2400, sellingPrice: 3999, isFeatured: false,
  },
  {
    sku: 'DEMO-0005', slug: 'smart-fitness-band', name: 'Smart Fitness Band',
    description: '24/7 heart-rate, SpO2, sleep tracking, and a 10-day battery. IP68 water resistant.',
    categorySlug: 'sports-outdoors',
    images: [U('1576243345690-4e4b79b63288'), U('1510915225267-6b6b6b6b6b6b')],
    costPrice: 1800, sellingPrice: 2999, isFeatured: true,
  },
  {
    sku: 'DEMO-0006', slug: 'ceramic-aroma-diffuser', name: 'Ceramic Aroma Diffuser',
    description: 'Ultrasonic mist with 7-color ambient lighting. Whisper-quiet, auto shut-off. Turns any room into a retreat.',
    categorySlug: 'home-living',
    images: [U('1608571423902-eed4a5ad8108'), U('1556228720-195a672e8a03')],
    costPrice: 1100, sellingPrice: 1999, isFeatured: false,
  },
  {
    sku: 'DEMO-0007', slug: 'matte-lipstick-set', name: 'Matte Lipstick Set',
    description: 'Six long-wearing, transfer-proof nude-matte shades. Enriched with vitamin E and shea butter.',
    categorySlug: 'beauty',
    images: [U('1586495777744-4413f21062fa'), U('1522335789203-aabd1fc54bc9')],
    costPrice: 900, sellingPrice: 1499, isFeatured: false,
  },
  {
    sku: 'DEMO-0008', slug: 'polarized-sunglasses', name: 'Polarized Sunglasses',
    description: 'UV400 polarized lenses in a lightweight acetate frame. Timeless wayfarer silhouette.',
    categorySlug: 'accessories',
    images: [U('1572635196237-14b3f281503f'), U('1577803645773-f96470509666')],
    costPrice: 2100, sellingPrice: 3499, isFeatured: true,
  },
];
