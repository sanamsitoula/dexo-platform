# Dexo V3 Refactor Plan — Multi-Tenant SaaS Platform

> **Status:** Planning Document (Not Implemented)
> **Created:** 2026-06-25
> **Author:** Dexo Architecture Team
> **Scope:** Reframe Dexo from "industry-specific system" to "Multi-Tenant SaaS Platform with Marketplace"

---

## 1. Executive Summary

### 1.1 What is Dexo V3?

**Dexo is a Multi-Tenant SaaS Platform** where users create and manage **multiple business tenants** from a single account. Each tenant is an independent business instance (e.g., a salon, fitness center, restaurant) running on its own subdomain (`beautyworld.dexo.app`).

Dexo provides **industry-specific tenant templates** that can be launched in minutes. Tenants auto-receive subdomain, theme, website, roles, permissions, CRM, finance, billing, and industry modules.

### 1.2 Why V3?

V1/V2 was architected as a domain-specific system (single industry per deployment). V3 reframes Dexo as a **platform** — a Business Operating System — where any entrepreneur can launch and manage a complete digital business without software development.

### 1.3 Key Decisions Locked

| Decision | Choice |
|----------|--------|
| Implementation scope | **Document plan only** (deferred implementation) |
| Template data model | **Reuse existing `Domain` model as `Template`** |
| Existing demo data | **Keep Fitness tenant with 5 branches** as showcase |

---

## 2. V1/V2 → V3 Conceptual Reframing

### 2.1 Conceptual Mapping

| V1/V2 Concept | V3 Concept | Notes |
|---|---|---|
| Dexo (single industry app) | Dexo Platform (multi-tenant SaaS) | Major reframing |
| User (one tenant) | Dexo Customer (many tenants) | New `TenantMember` join |
| Platform Admin (manage tenants) | Dexo Super Admin | Rename + scope expansion |
| Industry Domain (12 types) | Tenant Templates | Reuse existing model |
| Branch | Branch (per tenant) | Unchanged |
| Domain Module | Template Module | Unchanged |
| Theme | Theme (per tenant) | Unchanged |
| — | Website | NEW: pages, blog, SEO, media |
| — | Marketplace | NEW: templates, plugins, extensions |
| — | Package/Subscription | NEW: platform-level billing |
| — | Subdomain Routing | NEW: `*.dexo.app` resolver |

### 2.2 New Roles

**Platform-level:**
- **Dexo Super Admin** — manages platform settings, all tenants, packages, marketplace, global billing
- **Dexo Customer** — owns one or more tenants, manages their subscriptions

**Tenant-level (per tenant):**
- **Tenant Super Admin** — controls theme, website, domain, staff, roles, branches, subscription, payment gateways
- **Business Admin** — daily operations, staff, customers, orders, reports
- **Staff** — assigned business tasks
- **Customer** — uses tenant services (bookings, orders, etc.)

---

## 3. V3 Architecture Overview

### 3.1 User Journey

```
1. User registers / signs into Dexo (Platform)
2. Lands on Dexo Customer Dashboard ("My Tenants")
3. Sees available business templates in Marketplace
4. Selects template (e.g., Salon & Spa)
5. Fills tenant creation form (name, subdomain, etc.)
6. Auto-provisions:
   - Subdomain (beautyworld.dexo.app)
   - Theme + Website
   - Roles + Permissions
   - CRM + Finance + Billing
   - Industry Modules (Appointment, POS, etc.)
7. Becomes Tenant Super Admin
8. Tenant is live on its subdomain
```

### 3.2 Multi-Tenant Data Model (Target)

```
User (Dexo Customer)
  │
  ├── TenantMember ───── Tenant (business instance)
  │   (role:            │   │
  │    SUPER_ADMIN,     │   ├── Website (pages, blog, media, SEO)
  │    BUSINESS_ADMIN,  │   ├── Theme
  │    STAFF,           │   ├── Branches
  │    CUSTOMER)        │   ├── Members (staff)
  │                      │   ├── Customers (clients)
  │                      │   ├── Modules (industry-specific)
  │                      │   ├── CRM
  │                      │   ├── Finance
  │                      │   ├── Billing
  │                      │   ├── Roles + Permissions
  │                      │   ├── Payment Gateways
  │                      │   └── Settings
  │
  ├── Tenant (another business, e.g., Restaurant)
  │   └── ...
  │
  └── Subscription (platform-level package: Free/Pro/Enterprise)
```

### 3.3 Subdomain Routing

```
Request: https://beautyworld.dexo.app/dashboard
                │
                ▼
        ┌──────────────────┐
        │  Edge / Caddy    │
        │  *.dexo.app →    │
        │  app.dexo.app    │
        └──────────────────┘
                │
                ▼
        ┌──────────────────┐
        │  Next.js App     │
        │  Middleware:     │
        │  extract host    │
        │  → tenant lookup │
        │  → inject ctx    │
        └──────────────────┘
                │
                ▼
        ┌──────────────────┐
        │  tenantId =      │
        │  beautyworld     │
        │  (from subdomain)│
        └──────────────────┘
```

Local dev: `localhost:3000/?tenant=beautyworld` (subdomain emulated via query param or path prefix).

---

## 4. Current State Analysis (V1/V2)

### 4.1 Reusable Components (90%+ reusable)

| Component | Location | V3 Status |
|---|---|---|
| `User` model with `isPlatformAdmin` | `prisma/schema.prisma` | ✅ Reuse + extend |
| `Tenant` model with subdomain | `prisma/schema.prisma` | ✅ Reuse |
| `Branch` model + management | `modules/branch/*` | ✅ Reuse (per tenant) |
| `Domain` (12 industry types) | `modules/domain/*` | ✅ Reuse as `Template` |
| `DomainModule`, `DomainRole`, `DomainPermission` | `modules/domain/*` | ✅ Reuse |
| `DomainMenu`, `DomainWidget`, `DomainTheme` | `modules/domain/*` | ✅ Reuse |
| `TenantDomain`, `TenantEnabledModule` | `prisma/schema.prisma` | ✅ Reuse |
| Auto-provisioning engine | `domain-provisioning.service.ts` | ✅ Extend |
| Theme system (10 themes) | `modules/domain/*` | ✅ Reuse |
| Social OAuth (6 providers) | `modules/social-auth/*` | ✅ Reuse |
| Payment Gateway (5 providers) | `modules/payment-gateway/*` | ✅ Reuse |
| Finance (NFRS, double-entry) | `modules/finance/*` | ✅ Reuse (per tenant) |
| CRM (customers, leads) | existing | ✅ Reuse |
| Globalization (10 langs, 10 currencies) | `modules/globalization/*` | ✅ Reuse |
| Notifications, Files, Audit, Settings | `libs/*` | ✅ Reuse |
| Web app (3000) | `apps/web` | ⚠️ Refactor (add tenant switcher) |
| Admin app (3001) | `apps/admin` | ⚠️ Refactor (rename to Super Admin Console) |
| Mobile app (8081) | `apps/mobile` | ✅ Reuse (per tenant) |

### 4.2 New Components Required

| Component | Type | Notes |
|---|---|---|
| `TenantMember` model | Data | User ↔ Tenant many-to-many with role |
| `Website` model | Data | Pages, blog, media, SEO per tenant |
| `MarketplaceTemplate` (extends `Domain`) | Data | Presentation metadata (screenshots, pricing, ratings) |
| `MarketplacePlugin` model | Data | Plugins/extensions installable per tenant |
| `Package` model | Data | Platform-level subscription tiers (Free/Pro/Enterprise) |
| `Subscription` model | Data | User-level platform subscription |
| `MarketplaceController` | API | List, install, uninstall templates/plugins |
| `TenantMemberController` | API | Manage tenant members and roles |
| `WebsiteBuilderController` | API | Pages, blog posts, media, SEO |
| `SubdomainResolver` | Middleware | Extract tenant from `*.dexo.app` |
| `PackageController` | API | Subscribe, upgrade, manage packages |
| Dexo Customer Dashboard | UI | "My Tenants" landing page |
| Marketplace UI | UI | Template gallery, install flow |
| Tenant Switcher | UI | Top bar dropdown to switch between owned tenants |
| Website Builder UI | UI | Drag-drop pages, theme picker, SEO editor |
| Super Admin Console (renamed Admin app) | UI | Platform-wide management |

### 4.3 Demo Data Strategy

**Keep existing Fitness Center tenant** as a **showcase tenant**:
- Domain: `fitness`
- Subdomain: `fitnesscenter.dexo.app` (or similar)
- 5 branches: HQ-KTM, BR-LAL, BR-BHA, BR-PKR, BR-CHT
- Users: admin@fitnesscenter.com, trainer1@fitnesscenter.com, member@fitnessapp.com
- Purpose: Demonstrates the Fitness template to new users; visible in marketplace as "Live Demo"

---

## 5. Data Model Changes (Prisma Schema)

### 5.1 New Models

```prisma
// ============================================
// V3 NEW MODELS
// ============================================

/// User can own/manage multiple tenants
model TenantMember {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      TenantMemberRole
  status    TenantMemberStatus @default(ACTIVE)
  invitedAt DateTime  @default(now())
  joinedAt  DateTime?
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([userId, tenantId])
  @@index([tenantId, role])
}

enum TenantMemberRole {
  TENANT_SUPER_ADMIN
  BUSINESS_ADMIN
  STAFF
  CUSTOMER
}

enum TenantMemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

/// Tenant website (pages, blog, media, SEO)
model Website {
  id          String   @id @default(cuid())
  tenantId    String   @unique
  subdomain   String   @unique  // e.g., "beautyworld"
  customDomain String? @unique  // e.g., "salon.com"
  logo        String?
  favicon     String?
  seoTitle    String?
  seoDescription String?
  seoKeywords String?
  ogImage     String?
  pages       WebsitePage[]
  blogPosts   BlogPost[]
  mediaItems  MediaItem[]
  contactForms ContactForm[]
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model WebsitePage {
  id          String   @id @default(cuid())
  websiteId   String
  slug        String   // e.g., "about", "services"
  title       String
  content     String   @db.Text  // JSON or HTML
  isPublished Boolean  @default(false)
  seoTitle    String?
  seoDescription String?
  order       Int      @default(0)
  
  website     Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  
  @@unique([websiteId, slug])
}

model BlogPost {
  id          String   @id @default(cuid())
  websiteId   String
  slug        String
  title       String
  excerpt     String?
  content     String   @db.Text
  coverImage  String?
  authorId    String
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  tags        String[]
  
  website     Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  author      User     @relation(fields: [authorId], references: [id])
  
  @@unique([websiteId, slug])
}

model MediaItem {
  id          String   @id @default(cuid())
  websiteId   String
  filename    String
  url         String
  mimeType    String
  size        Int
  alt         String?
  caption     String?
  
  website     Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
}

model ContactForm {
  id          String   @id @default(cuid())
  websiteId   String
  name        String
  email       String
  phone       String?
  message     String   @db.Text
  status      ContactFormStatus @default(NEW)
  submittedAt DateTime @default(now())
  
  website     Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
}

enum ContactFormStatus {
  NEW
  READ
  REPLIED
  ARCHIVED
}

/// Marketplace presentation (extends Domain)
model MarketplaceTemplate {
  id            String   @id @default(cuid())
  domainId      String   @unique  // links to existing Domain
  displayName   String   // "Salon & Spa Pro"
  tagline       String?  // "Launch your beauty business in minutes"
  description   String   @db.Text
  iconUrl       String?
  bannerUrl     String?
  screenshots   String[]  // array of URLs
  pricingTier   PricingTier @default(FREE)
  monthlyPrice  Decimal? @db.Decimal(10, 2)
  yearlyPrice   Decimal? @db.Decimal(10, 2)
  features      String[]
  rating        Float    @default(0)
  installCount  Int      @default(0)
  isFeatured    Boolean  @default(false)
  isPublished   Boolean  @default(false)
  publishedAt   DateTime?
  
  domain        Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)
}

enum PricingTier {
  FREE
  FREEMIUM
  PAID
  ENTERPRISE
}

/// Marketplace plugins (extensions beyond template)
model MarketplacePlugin {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  category      PluginCategory
  description   String   @db.Text
  iconUrl       String?
  version       String   @default("1.0.0")
  author        String?
  priceType     PluginPriceType
  price         Decimal? @db.Decimal(10, 2)
  config        Json?    // plugin-specific configuration schema
  isPublished   Boolean  @default(false)
  installCount  Int      @default(0)
}

enum PluginCategory {
  ANALYTICS
  MARKETING
  PAYMENT
  INTEGRATION
  AUTOMATION
  REPORTING
  UI_THEME
  UTILITY
}

enum PluginPriceType {
  FREE
  ONE_TIME
  MONTHLY
  YEARLY
}

model TenantPlugin {
  id          String   @id @default(cuid())
  tenantId    String
  pluginId    String
  config      Json?
  enabled     Boolean  @default(true)
  installedAt DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plugin      MarketplacePlugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, pluginId])
}

/// Platform-level packages (user subscribes to a package, gets N tenants)
model Package {
  id              String   @id @default(cuid())
  name            String   // "Starter", "Pro", "Enterprise"
  slug            String   @unique
  description     String   @db.Text
  monthlyPrice    Decimal  @db.Decimal(10, 2)
  yearlyPrice     Decimal  @db.Decimal(10, 2)
  maxTenants      Int      // 1, 5, unlimited
  maxUsersPerTenant Int
  storageGB       Int
  features        String[]
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
}

model Subscription {
  id              String   @id @default(cuid())
  userId          String   // Dexo Customer
  packageId       String
  status          SubscriptionStatus
  billingCycle    BillingCycle
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd Boolean @default(false)
  cancelledAt     DateTime?
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  package         Package  @relation(fields: [packageId], references: [id])
  paymentMethodId String?
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}
```

### 5.2 Models to Update

```prisma
model User {
  // ... existing fields ...
  isPlatformAdmin Boolean @default(false)  // true = Dexo Super Admin
  isCustomer      Boolean @default(true)   // true = Dexo Customer (can own tenants)
  
  // New relations:
  tenantMembers   TenantMember[]
  subscriptions   Subscription[]
  ownedTenants    Tenant[] @relation("TenantOwner")
}

model Tenant {
  // ... existing fields ...
  ownerId         String?  // primary owner (Dexo Customer)
  
  // New relations:
  owner           User?     @relation("TenantOwner", fields: [ownerId], references: [id])
  members         TenantMember[]
  website         Website?
  plugins         TenantPlugin[]
}

model Domain {
  // ... existing fields ...
  marketplaceTemplate MarketplaceTemplate?
}
```

---

## 6. API Changes

### 6.1 New Endpoints

```
# Marketplace
GET    /api/marketplace/templates              # List all published templates
GET    /api/marketplace/templates/:slug        # Get template details
POST   /api/marketplace/templates/:slug/install # Install template as new tenant
GET    /api/marketplace/plugins                # List all plugins
POST   /api/marketplace/plugins/:slug/install  # Install plugin to current tenant
DELETE /api/marketplace/plugins/:id            # Uninstall plugin

# Tenant Members
GET    /api/tenants/:id/members                # List tenant members
POST   /api/tenants/:id/members                # Invite member
PATCH  /api/tenants/:id/members/:memberId      # Update member role
DELETE /api/tenants/:id/members/:memberId      # Remove member
POST   /api/tenants/:id/members/:memberId/accept # Accept invitation

# Customer Dashboard
GET    /api/customer/tenants                   # My owned/joined tenants
POST   /api/customer/tenants                   # Create new tenant from template
GET    /api/customer/subscription              # My current subscription
POST   /api/customer/subscription/upgrade      # Upgrade package

# Website Builder
GET    /api/websites/:tenantId                 # Get website config
PATCH  /api/websites/:tenantId                 # Update website config
GET    /api/websites/:tenantId/pages           # List pages
POST   /api/websites/:tenantId/pages           # Create page
PATCH  /api/websites/:tenantId/pages/:id       # Update page
DELETE /api/websites/:tenantId/pages/:id       # Delete page
GET    /api/websites/:tenantId/blog            # List blog posts
POST   /api/websites/:tenantId/blog            # Create blog post
POST   /api/websites/:tenantId/media           # Upload media
GET    /api/websites/:tenantId/contact-forms   # List contact form submissions

# Packages
GET    /api/packages                           # List all available packages
GET    /api/packages/:slug                     # Get package details

# Subdomain
GET    /api/resolve-tenant?subdomain=beautyworld  # Resolve subdomain → tenant
```

### 6.2 Subdomain Resolver Middleware

```typescript
// apps/api/src/common/middleware/subdomain-resolver.middleware.ts
@Injectable()
export class SubdomainResolverMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host; // e.g., "beautyworld.dexo.app"
    const subdomain = this.extractSubdomain(host); // "beautyworld"
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      const website = await this.prisma.website.findUnique({
        where: { subdomain },
        include: { tenant: true },
      });
      
      if (website) {
        req['tenantContext'] = {
          tenantId: website.tenantId,
          subdomain,
          websiteId: website.id,
        };
      } else if (subdomain !== 'app') {
        // Subdomain doesn't exist → 404
        return res.status(404).json({ error: 'Tenant not found' });
      }
    }
    
    next();
  }

  private extractSubdomain(host: string): string | null {
    // Local dev: skip
    if (host.includes('localhost') || host.includes('127.0.0.1')) return null;
    
    // Production: extract from "beautyworld.dexo.app"
    const parts = host.split('.');
    if (parts.length >= 3) return parts[0];
    
    return null;
  }
}
```

### 6.3 Auto-Provisioning Engine (Extended)

```typescript
// apps/api/src/modules/marketplace/marketplace.service.ts
async installTemplate(userId: string, slug: string, data: InstallTemplateDto) {
  // 1. Check user subscription limits
  const subscription = await this.getActiveSubscription(userId);
  const ownedCount = await this.countOwnedTenants(userId);
  if (ownedCount >= subscription.package.maxTenants) {
    throw new BadRequestException('Tenant limit reached. Upgrade your package.');
  }

  // 2. Resolve template (links to Domain)
  const template = await this.prisma.marketplaceTemplate.findUnique({
    where: { slug },
    include: { domain: { include: { modules: true, roles: true, themes: true } } },
  });
  if (!template) throw new NotFoundException('Template not found');

  // 3. Validate subdomain uniqueness
  if (await this.isSubdomainTaken(data.subdomain)) {
    throw new BadRequestException('Subdomain already taken');
  }

  // 4. Create tenant
  const tenant = await this.prisma.tenant.create({
    data: {
      name: data.tenantName,
      slug: data.subdomain,
      ownerId: userId,
      status: 'PROVISIONING',
    },
  });

  // 5. Create TenantMember (owner as SUPER_ADMIN)
  await this.prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      userId,
      role: 'TENANT_SUPER_ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  // 6. Auto-provision domain modules/roles/permissions
  await this.provisioningService.provisionDomain(tenant.id, template.domainId);

  // 7. Create website
  await this.prisma.website.create({
    data: {
      tenantId: tenant.id,
      subdomain: data.subdomain,
      seoTitle: `${data.tenantName} - Powered by Dexo`,
    },
  });

  // 8. Create default website pages
  await this.createDefaultPages(tenant.id, data.subdomain);

  // 9. Create default blog
  await this.createDefaultBlog(tenant.id);

  // 10. Increment install count
  await this.prisma.marketplaceTemplate.update({
    where: { id: template.id },
    data: { installCount: { increment: 1 } },
  });

  // 11. Update tenant status
  await this.prisma.tenant.update({
    where: { id: tenant.id },
    data: { status: 'ACTIVE' },
  });

  return { tenant, subdomain: data.subdomain, url: `https://${data.subdomain}.dexo.app` };
}
```

---

## 7. UI Changes

### 7.1 App Restructuring

```
apps/
├── web/           # Marketing site (dexo.app) - already exists, refactor
├── admin/         # → renamed to "super-admin" (Dexo Super Admin Console)
├── customer/      # NEW - Dexo Customer Dashboard ("My Tenants", billing, settings)
├── tenant/        # NEW - Tenant Admin App (one per tenant, subdomain-based)
├── mobile/        # Mobile app (per tenant, subdomain-based)
└── api/           # Backend (existing)
```

### 7.2 Dexo Customer Dashboard (`apps/customer`)

**Landing page after login** for Dexo Customers (non-platform-admin):

```
┌────────────────────────────────────────────────────────┐
│  Dexo                          [👤 John Doe ▾]         │
├────────────────────────────────────────────────────────┤
│  My Tenants                          [+ New Tenant]    │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ 🏋️ Fitness  │  │ 💇 Salon   │  │ ➕ Create  │       │
│  │ Center     │  │ & Spa      │  │ New Tenant │       │
│  │ 5 branches │  │ 1 branch   │  │            │       │
│  │ 120 users  │  │ 8 users    │  │            │       │
│  │            │  │            │  │            │       │
│  │ [Open]     │  │ [Open]     │  │ [Browse    │       │
│  │            │  │            │  │ Templates] │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                         │
│  Marketplace                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Salon│ │ Fit  │ │ Tail │ │ Rest │ │ ...  │         │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                         │
│  Subscription: Pro Plan · Renews Jan 15, 2027  [Upgrade]│
└────────────────────────────────────────────────────────┘
```

### 7.3 Tenant Switcher

Top bar dropdown component (similar to BranchSelector, but tenant-level):

```tsx
// apps/customer/components/TenantSwitcher.tsx
<TenantSwitcher
  tenants={userTenants}        // user's owned/joined tenants
  currentTenantId={current}
  onSwitch={(tenantId) => router.push(`/${tenant.slug}/dashboard`)}
/>
```

### 7.4 Marketplace UI

```
┌────────────────────────────────────────────────────────┐
│  Marketplace                                            │
│                                                         │
│  Categories: [All] [Salon] [Fitness] [Restaurant] ... │
│                                                         │
│  ┌────────────────┐  ┌────────────────┐               │
│  │ 💇 Salon & Spa │  │ 🏋️ Fitness     │               │
│  │ [Banner Image] │  │ [Banner Image] │               │
│  │ Launch your    │  │ Membership,    │               │
│  │ beauty business│  │ trainer mgmt   │               │
│  │ ⭐ 4.8 (120)   │  │ ⭐ 4.9 (85)    │               │
│  │ [Install Free] │  │ [Install Free] │               │
│  └────────────────┘  └────────────────┘               │
│                                                         │
│  ┌────────────────┐  ┌────────────────┐               │
│  │ 🍴 Restaurant  │  │ ✂️ Tailor Shop │               │
│  │ ...            │  │ ...            │               │
│  └────────────────┘  └────────────────┘               │
└────────────────────────────────────────────────────────┘
```

### 7.5 Website Builder UI

**Drag-drop page editor** (similar to Webflow/Wordpress):

```
┌────────────────────────────────────────────────────────┐
│  Website Builder > Pages > Home                          │
│                                                         │
│  ┌──────┐ ┌──────────────────────────┐ ┌──────────┐   │
│  │ Pages│ │                          │ │ Settings │   │
│  │      │ │   [Hero Block]           │ │          │   │
│  │ Home │ │   Welcome to Beauty World│ │ SEO      │   │
│  │ About│ │                          │ │ Title:   │   │
│  │ Serv │ │   [Services Block]       │ │ [____]   │   │
│  │ Cont │ │   - Hair                │ │          │   │
│  │ Blog │ │   - Spa                 │ │ Desc:    │   │
│  │      │ │   - Nails               │ │ [____]   │   │
│  │ [+   │ │                          │ │          │   │
│  │ Page]│ │   [Testimonials]         │ │ Image:   │   │
│  │      │ │                          │ │ [Browse] │   │
│  │      │ │   [Contact Form]         │ │          │   │
│  │      │ │                          │ │ [Save]   │   │
│  └──────┘ └──────────────────────────┘ └──────────┘   │
└────────────────────────────────────────────────────────┘
```

### 7.6 Admin App Rename

Rename `apps/admin` to `apps/super-admin`:
- Concept: "Dexo Super Admin Console" (for `isPlatformAdmin = true` users)
- Functions: manage all tenants, packages, marketplace, global billing, themes, platform settings

---

## 8. Implementation Phases

### Phase 1: Data Model Foundation (Est. 1 session)

**Tasks:**
- [ ] Add `TenantMember`, `Website`, `WebsitePage`, `BlogPost`, `MediaItem`, `ContactForm` models to schema
- [ ] Add `MarketplaceTemplate`, `MarketplacePlugin`, `TenantPlugin` models
- [ ] Add `Package`, `Subscription` models
- [ ] Add `TenantMemberRole`, `TenantMemberStatus`, `ContactFormStatus`, `PricingTier`, `PluginCategory`, `PluginPriceType`, `SubscriptionStatus`, `BillingCycle` enums
- [ ] Update `User` (add `isCustomer`, `tenantMembers`, `subscriptions`, `ownedTenants`)
- [ ] Update `Tenant` (add `ownerId`, `owner`, `members`, `website`, `plugins`)
- [ ] Update `Domain` (add `marketplaceTemplate` back-relation)
- [ ] Run `npx prisma migrate dev --name v3-multi-tenant-foundation`
- [ ] Generate Prisma client

**Files to create/modify:**
- `prisma/schema.prisma`

### Phase 2: API Implementation (Est. 2-3 sessions)

**Tasks:**
- [ ] Create `apps/api/src/modules/marketplace/` (controller, service, DTOs)
- [ ] Create `apps/api/src/modules/customer/` (controller, service for "my tenants")
- [ ] Create `apps/api/src/modules/tenant-member/` (controller, service)
- [ ] Create `apps/api/src/modules/website-builder/` (controller, service)
- [ ] Create `apps/api/src/modules/packages/` (controller, service)
- [ ] Create `apps/api/src/common/middleware/subdomain-resolver.middleware.ts`
- [ ] Apply middleware in `app.module.ts`
- [ ] Extend `domain-provisioning.service.ts` to also create website/blog/pages
- [ ] Update `app.module.ts` to register new modules
- [ ] Write seed data: 3 packages (Starter/Pro/Enterprise), 6 marketplace templates, 10 plugins

**Files to create/modify:**
- `apps/api/src/modules/marketplace/marketplace.module.ts` (NEW)
- `apps/api/src/modules/marketplace/marketplace.controller.ts` (NEW)
- `apps/api/src/modules/marketplace/marketplace.service.ts` (NEW)
- `apps/api/src/modules/marketplace/dto/*.ts` (NEW)
- `apps/api/src/modules/customer/customer.module.ts` (NEW)
- `apps/api/src/modules/customer/customer.controller.ts` (NEW)
- `apps/api/src/modules/customer/customer.service.ts` (NEW)
- `apps/api/src/modules/tenant-member/tenant-member.module.ts` (NEW)
- `apps/api/src/modules/tenant-member/tenant-member.controller.ts` (NEW)
- `apps/api/src/modules/tenant-member/tenant-member.service.ts` (NEW)
- `apps/api/src/modules/website-builder/website-builder.module.ts` (NEW)
- `apps/api/src/modules/website-builder/website-builder.controller.ts` (NEW)
- `apps/api/src/modules/website-builder/website-builder.service.ts` (NEW)
- `apps/api/src/modules/packages/packages.module.ts` (NEW)
- `apps/api/src/modules/packages/packages.controller.ts` (NEW)
- `apps/api/src/modules/packages/packages.service.ts` (NEW)
- `apps/api/src/common/middleware/subdomain-resolver.middleware.ts` (NEW)
- `apps/api/src/app.module.ts` (MODIFY)
- `apps/api/src/modules/domain/domain-provisioning.service.ts` (MODIFY)
- `seed-marketplace.ts` (NEW)

### Phase 3: UI Implementation (Est. 2-3 sessions)

**Tasks:**
- [ ] Create `apps/customer/` (new Next.js app for Dexo Customer Dashboard)
- [ ] Create `apps/tenant/` (new Next.js app for tenant admin, subdomain-aware)
- [ ] Refactor `apps/admin/` → `apps/super-admin/` (rename + adjust)
- [ ] Implement Customer Dashboard pages: /tenants (my tenants), /marketplace, /subscription, /settings
- [ ] Implement Tenant Switcher component
- [ ] Implement Marketplace gallery page
- [ ] Implement Tenant Creation wizard (template → config → done)
- [ ] Implement Website Builder pages: /websites/[tenantId]/pages, /blog, /media, /contact-forms
- [ ] Implement Super Admin pages: /tenants (all), /packages, /marketplace-admin, /platform-settings
- [ ] Update existing `apps/web/` to be marketing site only (or merge with customer app)

**Files to create/modify:**
- `apps/customer/` (NEW directory)
  - `package.json`, `next.config.js`, `tailwind.config.js`
  - `app/page.tsx` (My Tenants landing)
  - `app/marketplace/page.tsx`
  - `app/subscription/page.tsx`
  - `app/tenants/new/page.tsx` (create wizard)
  - `components/TenantSwitcher.tsx`
  - `components/TenantCard.tsx`
- `apps/tenant/` (NEW directory)
  - Standard Next.js structure with subdomain-aware middleware
- `apps/admin/` → `apps/super-admin/` (RENAME)
  - `app/tenants/page.tsx` (all tenants)
  - `app/packages/page.tsx`
  - `app/marketplace-admin/page.tsx`
- `apps/web/` (MODIFY)
  - Refocus as marketing site
  - Or merge with `customer` app

### Phase 4: Subdomain + Dev Experience (Est. 1 session)

**Tasks:**
- [ ] Configure Caddy/Nginx for `*.dexo.app` routing (or document for production)
- [ ] Implement local dev subdomain emulation (`?tenant=beautyworld` or `/t/beautyworld` path)
- [ ] Add `lvh.me` (or similar) support for local subdomain testing
- [ ] Update `docker-compose.yml` to include reverse proxy
- [ ] Update `run.bat` to support multiple tenant dev URLs
- [ ] Update `RUN_GUIDE.md` with subdomain testing instructions

**Files to create/modify:**
- `docker-compose.yml` (add Caddy)
- `Caddyfile` (NEW)
- `apps/customer/middleware.ts` (subdomain detection)
- `apps/tenant/middleware.ts` (subdomain detection)
- `run.bat` (MODIFY)
- `RUN_GUIDE.md` (MODIFY)

### Phase 5: Documentation & Polish (Est. 1 session)

**Tasks:**
- [ ] Update `MasterPrompt.MD` with V3 vision
- [ ] Update `README.md` with V3 architecture diagram
- [ ] Update `RUN_GUIDE.md` with new app structure and subdomain testing
- [ ] Create `docs/V3_ARCHITECTURE.md` (detailed technical doc)
- [ ] Update `TODO.md` with V3 phase status
- [ ] Create `docs/MARKETPLACE_GUIDE.md` (for tenants browsing/installing)
- [ ] Create `docs/WEBSITE_BUILDER_GUIDE.md` (for tenants customizing their site)
- [ ] Create `docs/SUPER_ADMIN_GUIDE.md` (for Dexo Super Admins)
- [ ] Update `CREDENTIALS.md` with V3 test accounts

**Files to create/modify:**
- `MasterPrompt.MD` (MODIFY)
- `README.md` (MODIFY)
- `RUN_GUIDE.md` (MODIFY)
- `TODO.md` (MODIFY)
- `CREDENTIALS.md` (MODIFY)
- `docs/V3_ARCHITECTURE.md` (NEW)
- `docs/MARKETPLACE_GUIDE.md` (NEW)
- `docs/WEBSITE_BUILDER_GUIDE.md` (NEW)
- `docs/SUPER_ADMIN_GUIDE.md` (NEW)

---

## 9. Migration & Backward Compatibility

### 9.1 Existing Data Migration

**Auto-migration script** (run after schema migration):

```typescript
// prisma/migrations/v3-migrate-existing.ts
async function main() {
  // 1. For all existing Users: set isCustomer = true
  await prisma.user.updateMany({
    where: { isPlatformAdmin: false },
    data: { isCustomer: true },
  });

  // 2. For all existing Tenants: set ownerId from first admin member
  const tenants = await prisma.tenant.findMany({
    include: { members: { where: { role: 'TENANT_ADMIN' }, take: 1 } },
  });
  for (const tenant of tenants) {
    if (tenant.members.length > 0) {
      const ownerId = tenant.members[0].userId;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { ownerId },
      });
      await prisma.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: ownerId,
          role: 'TENANT_SUPER_ADMIN',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    }
  }

  // 3. For all existing Domains: create MarketplaceTemplate
  const domains = await prisma.domain.findMany();
  for (const domain of domains) {
    await prisma.marketplaceTemplate.create({
      data: {
        domainId: domain.id,
        displayName: domain.name,
        description: domain.description || `Launch your ${domain.name} business in minutes`,
        pricingTier: 'FREE',
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  // 4. Seed default packages
  await prisma.package.createMany({
    data: [
      { name: 'Starter', slug: 'starter', monthlyPrice: 0, yearlyPrice: 0, maxTenants: 1, maxUsersPerTenant: 5, storageGB: 1 },
      { name: 'Pro', slug: 'pro', monthlyPrice: 29, yearlyPrice: 290, maxTenants: 5, maxUsersPerTenant: 50, storageGB: 10 },
      { name: 'Enterprise', slug: 'enterprise', monthlyPrice: 99, yearlyPrice: 990, maxTenants: 999, maxUsersPerTenant: 9999, storageGB: 100 },
    ],
  });

  console.log('✅ V3 migration complete');
}
```

### 9.2 Backward Compatibility

| Concern | Approach |
|---|---|
| Existing auth flow | ✅ Unchanged — User can still log in |
| Existing single-tenant flow | ✅ Still works — auto-creates `TenantMember` record |
| Existing Domain/TenantModule | ✅ Reused as Template |
| Existing API endpoints | ✅ Mostly unchanged — new endpoints added |
| Existing UI | ⚠️ Marketing site (`apps/web`) remains, customer dashboard is new |
| Existing 5 Fitness branches | ✅ Kept as showcase tenant |

---

## 10. Success Criteria

The V3 refactor is complete when:

- [ ] A new user can register, see the marketplace, and launch a tenant in <2 minutes
- [ ] A user can own and manage multiple tenants from one account
- [ ] Tenants are accessible via subdomain (`beautyworld.dexo.app`)
- [ ] Each tenant has a fully functional website with pages, blog, contact form
- [ ] Dexo Super Admin can manage all tenants, packages, and marketplace
- [ ] Marketplace has 6+ industry templates and 5+ plugins
- [ ] Platform packages (Starter/Pro/Enterprise) work with subscription billing
- [ ] All existing data (Fitness tenant with 5 branches) is preserved as showcase
- [ ] Documentation is updated to reflect V3 architecture
- [ ] All existing tests pass
- [ ] New tests cover: tenant creation, subdomain routing, marketplace install, member invitation

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Data migration breaks existing data | High | Backup database before migration; auto-migration script; rollback plan |
| Subdomain routing complexity in dev | Medium | Path-based emulation (`/t/beautyworld`) for local dev; document Caddy setup |
| Multi-tenant data leaks | Critical | Enforce `tenantId` in all queries; middleware injects tenant context; add `tenantId` filter audit |
| Auto-provisioning race conditions | Medium | Use Prisma transactions; idempotent operations; rollback on partial failure |
| Marketplace discoverability | Low | SEO optimization; featured templates; ratings; install count |
| Customer onboarding confusion | Medium | Interactive tutorial; sample tenant available; clear UI affordances |
| Subscription billing edge cases | Medium | Use Stripe Billing (existing payment integration); webhook handling; trial period |

---

## 12. Out of Scope (V3 Deferred)

These features are explicitly **deferred** to V4+:

- [ ] Mobile app per tenant (use responsive web for now)
- [ ] International payment gateway for marketplace (use Stripe/PayPal only)
- [ ] Multi-language marketplace (English only initially)
- [ ] Tenant-to-tenant data sharing
- [ ] Custom domain SSL automation (manual setup initially)
- [ ] White-label Dexo for resellers
- [ ] AI-powered template recommendations
- [ ] Real-time collaboration in website builder
- [ ] A/B testing for tenant websites
- [ ] Advanced analytics dashboards

---

## 13. Estimated Effort

| Phase | Effort | Sessions |
|---|---|---|
| Phase 1: Data Model | 4-6 hours | 1 |
| Phase 2: API | 12-16 hours | 2-3 |
| Phase 3: UI | 16-20 hours | 2-3 |
| Phase 4: Subdomain & DevX | 4-6 hours | 1 |
| Phase 5: Documentation | 4-6 hours | 1 |
| **Total** | **40-54 hours** | **7-9 sessions** |

---

## 14. Next Action

**Awaiting user approval to begin implementation.**

Recommended starting point: **Phase 1 (Data Model)** in next session.

After Phase 1 completion, we can validate the schema with a quick migration test before moving to Phase 2.

---

*End of V3 Refactor Plan*
