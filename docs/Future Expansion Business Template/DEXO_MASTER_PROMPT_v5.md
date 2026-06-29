# DEXO PLATFORM — MASTER IMPLEMENTATION PROMPT
> **Version:** 5.0 | **Date:** 2026-06-26
> **Use this file:** Open at the start of every coding session. Each phase is a standalone session.
> **Rule:** Never skip a phase. Never change the locked port map. Never add `[subdomain]` to URL paths.

---

## ARCHITECTURE CONSTANTS (never change these)

```
PORT MAP — LOCKED
  :3001  apps/platform-web       Platform marketing + sign-up (dexo.com)
  :3002  apps/platform-admin     Platform staff panel (admin.dexo.com)
  :4000  apps/api                Shared API (api.dexo.com)
  :4005  apps/tenant-website     Tenant public website ([tenant].dexo.com)
  :4006  apps/tenant-admin       Tenant owner + staff portal (admin.[tenant].dexo.com)
  :4007  apps/tenant-app         Tenant customer-facing app (portal.[tenant].dexo.com)
  :8081  apps/mobile             Expo mobile
  :5433  PostgreSQL
  :6379  Redis
  :9000  MinIO
  :8025  MailHog (dev)

TENANT RESOLUTION — ALWAYS via hostname middleware, NEVER via [subdomain] URL segments
  production: reverse proxy routes hostname → port
  development: read DEV_TENANT env var or X-Dev-Tenant header

DOMAIN TYPE — config/data loaded at runtime, NOT separate app folders
  12 types: FITNESS_CENTER | SALON_AND_SPA | RESTAURANT_AND_CAFE |
  HOTEL_AND_HOSPITALITY | HEALTHCARE_CLINIC | SCHOOL_AND_EDUCATION |
  COACHING_INSTITUTE | ECOMMERCE | LOGISTICS_AND_DELIVERY |
  TAILOR_SHOP | NGO | SME_CORPORATE

STACK
  Backend:   NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ
  Frontend:  Next.js 14 App Router, TypeScript, Tailwind CSS
  Mobile:    React Native + Expo
  Storage:   MinIO (S3-compatible)
  Auth:      JWT + refresh tokens, 6 OAuth providers
```

---

## CODE REVIEW GRAPH — SESSION RULES (apply to EVERY phase)

code-review-graph is installed in the monorepo root. It reduces AI token usage by giving
your AI assistant a precise map of only the files that matter for each task.

### Graph update cadence

| Scenario | Action |
|---|---|
| **First session ever** | `code-review-graph build` (run once, ~10–30 sec for this monorepo) |
| **Start of each phase session** | `code-review-graph update` (fast incremental, < 2 sec) |
| **After every schema migration** | `code-review-graph update` (Prisma-generated files changed) |
| **After adding a new package scaffold** | `code-review-graph update` |
| **After a large refactor (rename/move files)** | `code-review-graph build` (full rebuild) |
| **Watch mode (recommended while coding)** | `crg-daemon start` at repo root — auto-updates on every save |
| **New coding session (next day / new terminal)** | `code-review-graph update` — graph persists on disk, just sync changes |

### You do NOT need to rebuild between queries in the same session.
The graph lives in `.code-review-graph/` (SQLite). It survives restarts and new terminal
sessions. Only run `build` when files are renamed/moved or for the very first setup.

### Recommended session startup sequence
```bash
# 1. Start daemon (keeps graph fresh automatically while you code)
crg-daemon start

# 2. Start all services
./run.sh   # or run.bat on Windows

# 3. Tell your AI assistant:
#    "Build the code review graph for this project"   ← only needed once ever
#    After that, just ask your review questions normally
```

### Phase-end graph sync
At the end of each phase, after all deliverables pass:
```bash
code-review-graph update   # sync any final file changes
```
This ensures the next phase session starts with an accurate graph.

---

## SHARED PACKAGES (monorepo — packages/)

Every app imports from these. Never duplicate logic across apps.

```
packages/
  auth/           JWT helpers, guards, decorators, OAuth utilities
  tenancy/        Tenant resolution, middleware, context, branding loader
  permissions/    RBAC engine, permission checks, role helpers
  ui/             Shared React components, design tokens, theme engine
  api-client/     Typed fetch wrappers for each API module
  billing/        Subscription helpers, plan checks, payment gateway clients
  notifications/  Email templates, in-app notification helpers
  cms/            Content blocks, page builder types, media helpers
  analytics/      Event tracking, dashboard metric helpers
  modules/        Industry-specific logic (one subfolder per domain type)
    fitness/
    restaurant/
    salon/
    tailor/
    hotel/
    healthcare/
    school/
    coaching/
    ecommerce/
    logistics/
    ngo/
    sme/
```

---

## PHASE 0 — CODEBASE RESTRUCTURE
> **Session goal:** Rename existing apps, update workspace, lock all ports.
> **Blocker for:** Every other phase. Do this first.

### 0.1 Rename apps

```bash
mv apps/web    apps/platform-web
mv apps/admin  apps/platform-admin
```

### 0.2 Update package.json names and ports

```jsonc
// apps/platform-web/package.json
{ "name": "@dexo/platform-web", "scripts": { "dev": "next dev -p 3001" } }

// apps/platform-admin/package.json
{ "name": "@dexo/platform-admin", "scripts": { "dev": "next dev -p 3002" } }
```

### 0.3 Update root workspace

```jsonc
// package.json (root)
{
  "workspaces": [
    "apps/api", "apps/platform-web", "apps/platform-admin",
    "apps/tenant-website", "apps/tenant-admin", "apps/tenant-app",
    "apps/mobile", "packages/*"
  ]
}
```

### 0.4 Delete legacy routes

- Delete `apps/platform-admin/app/t/` directory entirely
- These routes move to `apps/tenant-admin` (Phase 5)
- Add a redirect page at the deleted path pointing to `:4006` if backward compat needed

### 0.5 Add shared packages scaffold

Create each folder under `packages/` with a `package.json`, `src/index.ts`, and `tsconfig.json`.
No implementation yet — just the scaffold so imports resolve.

### 0.6 Update run.bat and run.sh

Replace all service names with new app names. Update port kill list to include 3001, 3002,
4005, 4006, 4007. Update banner to show correct port → app → URL mapping.

### 0.7 Environment files

Each new app needs `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_PORT=<port>
DEV_TENANT=vrfitness            # dev only — which tenant to simulate
```

### 0.8 Initialize code-review-graph

```bash
pip install code-review-graph
code-review-graph install        # auto-configures for Claude Code / Cursor / Copilot etc.
code-review-graph build          # first-time parse of the full monorepo
crg-daemon start                 # watch mode — auto-updates on file save going forward
```

**Deliverables:** All apps start without errors. `npm run dev --workspace=apps/platform-admin`
starts on :3002. Workspace imports resolve. `code-review-graph status` shows graph built.

---

## PHASE 1 — DATABASE SCHEMA MIGRATION
> **Session goal:** Make schema correct before building any UI. All data models final.
> **Graph note:** Run `code-review-graph update` after `prisma generate` — generated client files
> change the graph's import map.

### 1.1 Add tenantId to ContactMessage

```prisma
model ContactMessage {
  id        String   @id @default(cuid())
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  // ... all existing fields unchanged ...
  @@index([tenantId])
}

model Tenant {
  // ... existing fields ...
  contactMessages ContactMessage[]
}
```

### 1.2 Add BusinessTypeTemplate model

```prisma
model BusinessTypeTemplate {
  id           String      @id @default(cuid())
  domainType   DomainType  @unique
  name         String
  description  String
  tagline      String
  heroImage    String?
  colorPrimary String
  colorAccent  String
  colorBg      String
  fontHeading  String      @default("Inter")
  fontBody     String      @default("Inter")
  websiteSections   Json
  onboardingSteps   Json
  dashboardLayout   Json
  features          Json
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}
```

### 1.3 Add CustomerOnboarding model

```prisma
model CustomerOnboarding {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  email       String
  step        Int      @default(1)
  totalSteps  Int
  data        Json
  completed   Boolean  @default(false)
  completedAt DateTime?
  source      String   // "tenant_website" | "platform_signup" | "invite"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([tenantId])
  @@index([email])
}
```

### 1.4 Add TenantOnboarding model

```prisma
model TenantOnboarding {
  id          String   @id @default(cuid())
  tenantId    String   @unique
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  step        Int      @default(1)
  totalSteps  Int      @default(6)
  completed   Boolean  @default(false)
  completedAt DateTime?
  profileComplete    Boolean @default(false)
  brandingComplete   Boolean @default(false)
  modulesComplete    Boolean @default(false)
  teamComplete       Boolean @default(false)
  websiteComplete    Boolean @default(false)
  billingComplete    Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 1.5 Add TenantLifecycle model (for Phase 3A)

```prisma
model TenantLifecycle {
  id             String          @id @default(cuid())
  tenantId       String          @unique
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  status         TenantStatus    @default(PROVISIONING)
  subdomainSlug  String          @unique
  customDomain   String?         @unique
  customDomainVerified Boolean   @default(false)
  dnsToken       String?         // for custom domain TXT verification
  sslStatus      SslStatus       @default(PENDING)
  suspendedAt    DateTime?
  suspendedBy    String?
  suspendReason  String?
  archivedAt     DateTime?
  archivedBy     String?
  deletedAt      DateTime?
  deletedBy      String?
  deletionScheduledAt DateTime?
  provisionedAt  DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

enum TenantStatus {
  PROVISIONING
  ACTIVE
  SUSPENDED
  ARCHIVED
  DELETION_SCHEDULED
  DELETED
}

enum SslStatus {
  PENDING
  ACTIVE
  FAILED
  EXPIRED
}
```

### 1.6 Run migrations

```bash
npx prisma migrate dev --name "schema-migration-phase1"
npx prisma generate
code-review-graph update          # sync generated Prisma client into graph
```

**Deliverables:** `npx prisma studio` shows all new models. No migration errors.
Graph updated and reflects new schema files.

---

## PHASE 2 — SEED DATA SYSTEM
> **Session goal:** Idempotent, re-runnable seed scripts. Clean + re-seed any time.
> **Scope:** Two demo domains fully seeded — FITNESS_CENTER + RESTAURANT_AND_CAFE.
> **Graph note:** No graph update needed unless new files are added to scripts/.

### 2.1 Seed architecture

```
scripts/seed/
  index.ts               Master seed runner (calls all below in order)
  clean.ts               Wipes all seed data in safe order (no cascade errors)
  00-platform.ts         Platform admin user, plans, global settings
  01-domain-templates.ts BusinessTypeTemplate for all 12 domain types
  02-domains.ts          Domain, DomainModule, DomainRole, DomainPermission,
                         DomainMenu, DomainWidget, DomainTheme
  03-tenants/
    fitness-center.ts    Full FITNESS_CENTER tenant seed
    restaurant.ts        Full RESTAURANT_AND_CAFE tenant seed
  04-demo-data/
    fitness-data.ts      Members, trainers, classes, invoices, attendance
    restaurant-data.ts   Tables, menu items, orders, reservations, staff
```

### 2.2 NPM scripts

```jsonc
// package.json (root)
{
  "scripts": {
    "db:seed":            "ts-node scripts/seed/index.ts",
    "db:seed:clean":      "ts-node scripts/seed/clean.ts",
    "db:seed:fresh":      "npm run db:seed:clean && npm run db:seed",
    "db:seed:fitness":    "ts-node scripts/seed/03-tenants/fitness-center.ts",
    "db:seed:restaurant": "ts-node scripts/seed/03-tenants/restaurant.ts",
    "db:migrate:fresh":   "npx prisma migrate reset --force && npm run db:seed"
  }
}
```

### 2.3 Clean script (scripts/seed/clean.ts)

Deletes in this exact order to avoid FK constraint errors:
```
CustomerOnboarding → TenantOnboarding → TenantLifecycle → ContactMessage →
BranchUser → BranchSchedule → Attendance → BranchExpense → BranchReport →
OAuthAccount → TenantOAuthConfig → TenantEnabledModule → TenantDomain →
BranchUser → Branch → Invoice → Payment → JournalEntry →
User → Tenant → BusinessTypeTemplate → DomainPermission →
DomainMenu → DomainWidget → DomainTheme → DomainRole →
DomainModule → Domain → Plan → PlatformOAuthConfig → Setting
```

Each delete is wrapped in try/catch. Log count deleted per model.

### 2.4 BusinessTypeTemplate seed (01-domain-templates.ts)

Seed ALL 12 templates. Key examples:

**FITNESS_CENTER template:**
```ts
{
  domainType: 'FITNESS_CENTER',
  name: 'Fitness Center',
  description: 'Complete gym and fitness management platform',
  tagline: 'Transform lives, one workout at a time',
  colorPrimary: '#E85D24',
  colorAccent: '#F2A623',
  colorBg: '#0F0F0F',
  websiteSections: {
    hero: { enabled: true, variant: 'video-bg' },
    stats: { enabled: true, items: ['Members', 'Trainers', 'Classes', 'Branches'] },
    services: { enabled: true, label: 'Our Classes' },
    trainers: { enabled: true, label: 'Our Trainers' },
    schedule: { enabled: true },
    pricing: { enabled: true },
    testimonials: { enabled: true },
    gallery: { enabled: true },
    contact: { enabled: true },
    cta: { enabled: true, text: 'Start Your Free Trial' }
  },
  onboardingSteps: [
    { step: 1, title: 'Your gym details', fields: ['name', 'phone', 'address', 'description'] },
    { step: 2, title: 'Choose your services', fields: ['services[]'] },
    { step: 3, title: 'Set membership plans', fields: ['plans[]'] },
    { step: 4, title: 'Upload branding', fields: ['logo', 'coverImage'] },
    { step: 5, title: 'Add your first trainer', fields: ['trainer.name', 'trainer.email', 'trainer.specialization'] },
    { step: 6, title: 'Launch your website', fields: ['subdomain', 'customDomain'] }
  ],
  dashboardLayout: {
    widgets: [
      { id: 'active-members', col: 1, row: 1, w: 2, h: 1 },
      { id: 'todays-classes', col: 3, row: 1, w: 2, h: 1 },
      { id: 'revenue-chart', col: 1, row: 2, w: 4, h: 2 },
      { id: 'upcoming-renewals', col: 1, row: 4, w: 2, h: 2 },
      { id: 'trainer-schedule', col: 3, row: 4, w: 2, h: 2 }
    ]
  },
  features: {
    members: true, trainers: true, classes: true,
    attendance: true, nutrition: true, pos: true,
    branches: true, onlineBooking: true
  }
}
```

**RESTAURANT_AND_CAFE template:**
```ts
{
  domainType: 'RESTAURANT_AND_CAFE',
  name: 'Restaurant & Cafe',
  tagline: 'Serve great food, run a great business',
  colorPrimary: '#C0392B',
  colorAccent: '#E67E22',
  colorBg: '#1A0A00',
  websiteSections: {
    hero: { enabled: true, variant: 'full-menu-bg' },
    menu: { enabled: true, label: 'Our Menu' },
    specials: { enabled: true, label: "Today's Specials" },
    reservation: { enabled: true },
    story: { enabled: true, label: 'Our Story' },
    gallery: { enabled: true },
    reviews: { enabled: true },
    contact: { enabled: true },
    cta: { enabled: true, text: 'Reserve a Table' }
  },
  onboardingSteps: [
    { step: 1, title: 'Restaurant details', fields: ['name', 'phone', 'address', 'cuisine'] },
    { step: 2, title: 'Opening hours', fields: ['hours[]'] },
    { step: 3, title: 'Add menu categories', fields: ['menuCategories[]'] },
    { step: 4, title: 'Upload branding', fields: ['logo', 'coverImage'] },
    { step: 5, title: 'Set up tables', fields: ['tableCount', 'tableLayout'] },
    { step: 6, title: 'Launch your restaurant site', fields: ['subdomain', 'customDomain'] }
  ],
  dashboardLayout: {
    widgets: [
      { id: 'todays-reservations', col: 1, row: 1, w: 2, h: 1 },
      { id: 'active-orders', col: 3, row: 1, w: 2, h: 1 },
      { id: 'revenue-chart', col: 1, row: 2, w: 4, h: 2 },
      { id: 'table-status', col: 1, row: 4, w: 2, h: 2 },
      { id: 'popular-items', col: 3, row: 4, w: 2, h: 2 }
    ]
  },
  features: {
    pos: true, orders: true, kitchen: true,
    tables: true, reservations: true, menu: true,
    delivery: true, onlineOrdering: true
  }
}
```

Seed the remaining 10 templates with equivalent data appropriate to each industry.

### 2.5 FITNESS_CENTER tenant seed (03-tenants/fitness-center.ts)

```
Tenant:       name="VR Fitness Center", subdomain="vrfitness", domain=FITNESS_CENTER
Lifecycle:    subdomainSlug="vrfitness", status=ACTIVE, sslStatus=ACTIVE
Users:        admin@vrfitness.com / Admin123!      (OWNER)
              manager@vrfitness.com / Manager123!  (MANAGER — HQ branch)
              trainer1@vrfitness.com / Trainer123! (TRAINER — strength)
              trainer2@vrfitness.com / Trainer123! (TRAINER — yoga)
              member1@vrfitness.com / Member123!   (MEMBER)
              member2@vrfitness.com / Member123!   (MEMBER)
Branches:     HQ-KTM (Kathmandu, isHQ=true), BR-LAL (Lalitpur), BR-BHA (Bhaktapur)
Classes:      Morning HIIT, Evening Yoga, Strength Basics, Zumba Friday
Members:      10 members (MONTHLY/QUARTERLY/ANNUAL, join date, renewal, branch)
Invoices:     15 invoices across last 3 months (mix of paid/pending)
Attendance:   30 rows (checkIn/checkOut, memberId, branchId, classId)
Onboarding:   TenantOnboarding all steps completed=true
```

### 2.6 RESTAURANT_AND_CAFE tenant seed (03-tenants/restaurant.ts)

```
Tenant:       name="Spice Garden", subdomain="spicegarden", domain=RESTAURANT_AND_CAFE
Lifecycle:    subdomainSlug="spicegarden", status=ACTIVE, sslStatus=ACTIVE
Users:        admin@spicegarden.com / Admin123!    (OWNER)
              manager@spicegarden.com / Manager123!(MANAGER)
              waiter1@spicegarden.com / Staff123!  (STAFF)
              chef@spicegarden.com / Staff123!     (KITCHEN)
Tables:       12 tables (T01–T12), capacity 2–8, indoor/outdoor
Menu:         4 categories × 8 items; 2 marked as Today's Special
Orders:       8 orders (PENDING/PREPARING/SERVED/COMPLETED)
Reservations: 5 reservations (today + next 3 days)
Invoices:     10 invoices (last 30 days)
Onboarding:   TenantOnboarding all steps completed=true
```

### 2.7 Seed runner (index.ts)

```ts
async function main() {
  console.log('🌱 Dexo seed starting...')
  await seed00Platform()
  await seed01Templates()
  await seed02Domains()
  await seed03FitnessCenter()
  await seed03Restaurant()
  await seed04FitnessData()
  await seed04RestaurantData()
  console.log('✅ Seed complete')
}
```

Each function is idempotent — uses `upsert` on unique keys, never plain `create`.

**Deliverables:** `npm run db:seed:fresh` runs without errors. Both tenants visible in
platform-admin. Re-running seed produces same state.

---

## PHASE 3 — API SCOPING + BUSINESS TYPE TEMPLATE API
> **Session goal:** All existing API endpoints tenant-scoped. New endpoints for templates and onboarding.
> **Graph note:** Run `code-review-graph update` after generating new controller/module files.

### 3.1 Tenant middleware (global)

```ts
// apps/api/src/common/middleware/tenant.middleware.ts
// Reads X-Tenant-ID header or resolves from JWT sub-claim tenantId
// Sets req.tenantId on every request
// Throws 400 if neither present and route requires tenant context
```

### 3.2 Scope ContactMessage endpoints

- `POST /contact` — read `tenantId` from `req.tenantId`, save on record
- `GET /contact` — PLATFORM_ADMIN returns all; else filter by `req.tenantId`
- `GET /contact/:id`, `PUT /contact/:id`, `POST /contact/:id/reply` — validate ownership

### 3.3 Scope Role endpoints

- Remove class-level `PlatformAdminGuard`
- `POST /roles` — pass `req.tenantId` to service
- `GET /roles` — return `WHERE tenantId = req.tenantId OR isSystem = true`
- `PUT /roles/:id`, `DELETE /roles/:id` — validate ownership; system roles immutable

### 3.4 BusinessTypeTemplate API

```
GET  /api/business-templates              — list all 12 templates (public, no auth)
GET  /api/business-templates/:domainType  — get one template with full config
```

### 3.5 Onboarding API

**Tenant onboarding:**
```
GET  /api/onboarding/tenant              — get current tenant's onboarding state
PUT  /api/onboarding/tenant/step/:n      — save step N data, mark complete
POST /api/onboarding/tenant/complete     — finalize, provision domain
```

**Customer onboarding:**
```
POST /api/onboarding/customer/start         — create CustomerOnboarding record
PUT  /api/onboarding/customer/:id/step/:n   — save step data
POST /api/onboarding/customer/:id/complete  — create User, send welcome email
GET  /api/onboarding/customer/:id           — get progress (for resume)
```

### 3.6 Health check endpoint

```
GET /api/health    — returns { status, db, redis, minio, timestamp }
```

**Deliverables:** All endpoints return correct tenant-scoped data. Swagger docs updated.
Run `code-review-graph update` after adding all new modules.

---

## PHASE 3A — TENANT LIFECYCLE MANAGEMENT
> **Session goal:** Full lifecycle for every tenant from creation to deletion. Zero manual
> DNS steps when a new tenant signs up.
> **Depends on:** Phase 1 (TenantLifecycle model), Phase 3 (API middleware).
> **Graph note:** This phase adds a significant new service tree. Run `code-review-graph build`
> at the end of this phase.

### Overview

Every tenant passes through these states:

```
PROVISIONING → ACTIVE → SUSPENDED → ARCHIVED → DELETION_SCHEDULED → DELETED
```

State transitions are explicit API calls, not direct DB writes. All transitions are
audit-logged.

### 3A.1 Slug validation service

```ts
// apps/api/src/modules/tenant-lifecycle/slug.service.ts

async validateSlug(slug: string): Promise<SlugValidationResult> {
  // Rules:
  //   3–30 chars, lowercase alphanumeric + hyphens only
  //   Cannot start or end with hyphen
  //   Cannot be a reserved word (www, api, admin, app, portal, cdn, docs, status, dexo, support)
  //   Must be unique in TenantLifecycle.subdomainSlug

  const reserved = ['www','api','admin','app','portal','cdn','docs','status','dexo','support','mail','smtp']
  // Returns { available: boolean, reason?: string }
}

async reserveSlug(tenantId: string, slug: string): Promise<void> {
  // Upserts TenantLifecycle record with status=PROVISIONING
  // Locks slug atomically via DB unique constraint
}
```

### 3A.2 Provisioning service

```ts
// apps/api/src/modules/tenant-lifecycle/provisioning.service.ts

async provisionTenant(tenantId: string, input: CreateTenantInput): Promise<ProvisionResult> {
  // Step 1: Validate + reserve slug
  await this.slugService.reserveSlug(tenantId, input.slug)

  // Step 2: Create Tenant record
  const tenant = await this.prisma.tenant.create({ ... })

  // Step 3: Provision domain type (roles, permissions, menu, modules)
  await this.domainService.quickSetup(tenantId, input.domainType)

  // Step 4: Create TenantOnboarding record (step=1, completed=false)
  await this.prisma.tenantOnboarding.create({ ... })

  // Step 5: Emit provisioning event (BullMQ queue)
  await this.queue.add('tenant.provisioned', { tenantId })

  // Step 6: Update lifecycle status to ACTIVE
  await this.prisma.tenantLifecycle.update({
    where: { tenantId },
    data: { status: 'ACTIVE', provisionedAt: new Date() }
  })

  return { tenantId, subdomain: `${input.slug}.dexo.com` }
}
```

### 3A.3 Custom domain service

```ts
// apps/api/src/modules/tenant-lifecycle/custom-domain.service.ts

// Tenant requests a custom domain
async requestCustomDomain(tenantId: string, domain: string): Promise<DnsInstructions> {
  const token = crypto.randomUUID()
  await this.prisma.tenantLifecycle.update({
    where: { tenantId },
    data: { customDomain: domain, dnsToken: token, customDomainVerified: false }
  })
  return {
    type: 'TXT',
    host: `_dexo-verify.${domain}`,
    value: `dexo-verification=${token}`,
    instructions: 'Add this TXT record to your DNS provider, then click Verify.'
  }
}

// Platform verifies ownership
async verifyCustomDomain(tenantId: string): Promise<VerifyResult> {
  const { customDomain, dnsToken } = await this.getLifecycle(tenantId)
  const txtRecords = await dns.resolveTxt(`_dexo-verify.${customDomain}`)
  const found = txtRecords.flat().includes(`dexo-verification=${dnsToken}`)
  if (found) {
    await this.prisma.tenantLifecycle.update({
      where: { tenantId },
      data: { customDomainVerified: true, sslStatus: 'PENDING' }
    })
    await this.queue.add('ssl.provision', { tenantId, domain: customDomain })
  }
  return { verified: found }
}

// SSL provisioning is async via BullMQ worker
// Worker calls Certbot / Caddy API / Cloudflare API
// On success: update sslStatus = 'ACTIVE'
// On failure: update sslStatus = 'FAILED', notify tenant owner
```

### 3A.4 Suspension service

```ts
async suspendTenant(
  tenantId: string,
  reason: string,
  suspendedBy: string
): Promise<void> {
  // Validates: tenant must be ACTIVE
  // Sets status=SUSPENDED, suspendedAt, suspendedBy, suspendReason
  // Audit log entry
  // Emits 'tenant.suspended' event
  //   → email to tenant owner
  //   → all sessions for this tenant invalidated (Redis keyspace flush)
  //   → API returns 402/403 for all tenant requests
}

async reactivateTenant(tenantId: string, reactivatedBy: string): Promise<void> {
  // Sets status=ACTIVE, clears suspension fields
  // Audit log entry
  // Emits 'tenant.reactivated' event → email to owner
}
```

### 3A.5 Archival service

```ts
async archiveTenant(tenantId: string, archivedBy: string): Promise<void> {
  // Pre-condition: tenant must be SUSPENDED (cannot archive an active tenant)
  // Sets status=ARCHIVED, archivedAt, archivedBy
  // Exports tenant data snapshot to MinIO (JSON + media files)
  // Audit log entry
  // Emits 'tenant.archived' event
}
```

### 3A.6 Deletion workflow (soft → scheduled → hard)

```ts
// Soft deletion request — starts 30-day grace period
async scheduleDeletion(
  tenantId: string,
  requestedBy: string
): Promise<{ deletionAt: Date }> {
  const deletionAt = addDays(new Date(), 30)
  await this.prisma.tenantLifecycle.update({
    where: { tenantId },
    data: {
      status: 'DELETION_SCHEDULED',
      deletionScheduledAt: deletionAt,
      deletedBy: requestedBy
    }
  })
  // BullMQ delayed job: fires at deletionAt to call hardDelete()
  await this.queue.add('tenant.hard-delete', { tenantId }, { delay: 30 * 24 * 3600 * 1000 })
  // Email to tenant owner: "Your account will be deleted on <date>. Cancel here."
  return { deletionAt }
}

// Cancel deletion during grace period
async cancelDeletion(tenantId: string): Promise<void> {
  // Sets status=SUSPENDED (was DELETION_SCHEDULED)
  // Removes BullMQ delayed job
  // Clears deletionScheduledAt + deletedBy
}

// Hard delete — called by BullMQ worker after grace period
async hardDelete(tenantId: string): Promise<void> {
  // 1. Delete all tenant media from MinIO
  // 2. Delete all tenant DB records (cascade from Tenant model)
  // 3. Remove Redis cache keys
  // 4. Release subdomainSlug (allow re-use after 90 days)
  // 5. Set status=DELETED, deletedAt
  // 6. Audit log (retained permanently — soft record, no PII)
}
```

### 3A.7 Lifecycle API endpoints

```
POST /api/tenants                           — create tenant (validates slug, triggers provisioning)
GET  /api/tenants/:id/lifecycle             — get full lifecycle state
POST /api/tenants/:id/lifecycle/suspend     — suspend (platform admin only)
POST /api/tenants/:id/lifecycle/reactivate  — reactivate (platform admin only)
POST /api/tenants/:id/lifecycle/archive     — archive (platform admin only)
POST /api/tenants/:id/lifecycle/delete      — schedule deletion (owner or platform admin)
POST /api/tenants/:id/lifecycle/cancel-delete — cancel scheduled deletion

POST /api/tenants/:id/domain/request        — tenant requests custom domain
POST /api/tenants/:id/domain/verify         — trigger DNS verification
GET  /api/tenants/:id/domain/status         — get domain + SSL status

GET  /api/tenants/check-slug?slug=vrfitness — public, returns { available: boolean }
```

### 3A.8 Suspension middleware

```ts
// apps/api/src/common/middleware/tenant-status.middleware.ts
// Runs after tenant.middleware.ts
// Checks TenantLifecycle.status from Redis cache (TTL 60s)
// If SUSPENDED:  throw 402 PaymentRequiredError { code: 'TENANT_SUSPENDED' }
// If ARCHIVED:   throw 403 ForbiddenError       { code: 'TENANT_ARCHIVED' }
// If DELETED:    throw 404 NotFoundError         { code: 'TENANT_NOT_FOUND' }
// If PROVISIONING: throw 503 ServiceUnavailableError { code: 'TENANT_PROVISIONING' }
```

### 3A.9 Frontend status pages

```
apps/tenant-admin/app/suspended/page.tsx
  — Shown when tenant is SUSPENDED
  — "Your account is suspended. Contact support or upgrade your plan."
  — Shows reason (if not sensitive) + support link

apps/tenant-admin/app/archived/page.tsx
  — Shown when ARCHIVED
  — "This account has been archived. Contact support to restore."

apps/tenant-website/app/suspended/page.tsx
  — Generic branded "temporarily unavailable" for public visitors
  — Does NOT expose suspension reason
```

### 3A.10 Seed update for lifecycle records

Update `03-tenants/fitness-center.ts` and `03-tenants/restaurant.ts` to also upsert
a `TenantLifecycle` record with `status=ACTIVE, sslStatus=ACTIVE` for each seeded tenant.

**Deliverables:**
- `POST /api/tenants` creates a tenant, reserves slug, and returns subdomain URL
- Slug collision returns 409 with `{ available: false, reason: 'taken' }`
- Reserved words return 400 with `{ available: false, reason: 'reserved' }`
- Suspend → API returns 402 for all subsequent tenant requests
- Reactivate → tenant resumes normal operation
- `POST /api/tenants/:id/lifecycle/delete` schedules deletion and sends email
- Custom domain verify endpoint resolves DNS TXT correctly
- `code-review-graph build` at phase end — new service tree is large

---

## PHASE 4 — DNS & MULTI-TENANT ROUTING ARCHITECTURE
> **Session goal:** Wildcard DNS, reverse proxy config, hostname→tenant resolution in prod and dev.
> **Graph note:** This phase is mostly infra/config. Run `code-review-graph update` after adding
> new middleware files.

### 4.1 DNS records (Namecheap / your registrar)

```
@       A     <server-ip>        Platform root
www     CNAME dexo.com           www redirect
*       A     <server-ip>        Wildcard — catches all tenant subdomains automatically
admin   A     <server-ip>        Platform admin
api     A     <server-ip>        API
cdn     A     <server-ip>        CDN / assets
docs    A     <server-ip>        Docs
status  A     <server-ip>        Status page
```

The wildcard record means zero DNS changes are needed when a new tenant signs up.
New subdomain resolves the moment the Tenant record is created.

### 4.2 Reverse proxy routing (NGINX / Traefik)

```
Internet
  ↓
Cloudflare (SSL termination, DDoS, caching)
  ↓
NGINX / Traefik
  ↓
Route by hostname:
  dexo.com / www.dexo.com               → :3001 (platform-web)
  admin.dexo.com                        → :3002 (platform-admin)
  api.dexo.com                          → :4000 (api)
  *.dexo.com (no admin. prefix)         → :4005 (tenant-website)
  admin.*.dexo.com                      → :4006 (tenant-admin)
  portal.*.dexo.com                     → :4007 (tenant-app)
  <custom-domain> (verified)            → :4005 (tenant-website, resolved by DB)
  admin.<custom-domain> (verified)      → :4006
  portal.<custom-domain> (verified)     → :4007
```

### 4.3 Tenant resolver middleware (packages/tenancy)

```ts
// packages/tenancy/src/resolver.ts
export async function resolveTenant(hostname: string): Promise<TenantContext> {
  // 1. Check Redis cache (TTL 5 min)
  const cached = await redis.get(`tenant:hostname:${hostname}`)
  if (cached) return JSON.parse(cached)

  // 2. Parse hostname
  //    vrfitness.dexo.com        → slug = 'vrfitness'
  //    admin.vrfitness.dexo.com  → slug = 'vrfitness'
  //    portal.vrfitness.dexo.com → slug = 'vrfitness'
  //    vrfitness.com             → lookup by customDomain

  // 3. Query DB by slug OR customDomain
  const lifecycle = await prisma.tenantLifecycle.findFirst({
    where: { OR: [{ subdomainSlug: slug }, { customDomain: hostname, customDomainVerified: true }] },
    include: { tenant: { include: { branding: true } } }
  })

  // 4. Cache + return context
  const ctx: TenantContext = {
    id: lifecycle.tenantId,
    slug: lifecycle.subdomainSlug,
    domainType: lifecycle.tenant.domainType,
    branding: lifecycle.tenant.branding,
    plan: lifecycle.tenant.plan,
    status: lifecycle.status
  }
  await redis.setex(`tenant:hostname:${hostname}`, 300, JSON.stringify(ctx))
  return ctx
}
```

### 4.4 Development wildcard hosts

For local dev without a real DNS server:

```bash
# /etc/hosts (Mac/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1  vrfitness.localhost
127.0.0.1  admin.vrfitness.localhost
127.0.0.1  portal.vrfitness.localhost
127.0.0.1  spicegarden.localhost
127.0.0.1  admin.spicegarden.localhost
```

Or use `DEV_TENANT` env var as a simpler alternative (already in place from Phase 0).

### 4.5 SSL certificates

```
Wildcard cert:   *.dexo.com         (covers all tenant subdomains)
Platform certs:  dexo.com, admin.dexo.com, api.dexo.com
Custom domains:  individual certs — provisioned per-tenant via BullMQ worker (Phase 3A)
```

Certificate automation: Certbot + Let's Encrypt, or Cloudflare Origin CA.

**Deliverables:** NGINX config routes all tenant hostnames correctly. Tenant resolver
middleware resolves both subdomain and custom domain formats. `code-review-graph update`
after adding middleware.

---

## PHASE 5 — TENANT ADMIN (apps/tenant-admin, :4006)
> **Session goal:** The operational hub for tenant owners and staff. Dynamic, role-aware.
> **Key constraint:** No sidebar/navbar for customer-facing views. Traditional sidebar OK for admin/staff.
> **Graph note:** Run `code-review-graph update` after scaffolding all route group folders.

### 5.1 Middleware

```ts
// apps/tenant-admin/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const devTenant = request.headers.get('x-dev-tenant')
    ?? process.env.DEV_TENANT ?? 'vrfitness'
  const slug = isProd ? hostname.split('.')[0] : devTenant
  const response = NextResponse.next()
  response.headers.set('x-tenant-slug', slug)
  return response
}
```

### 5.2 App structure

```
apps/tenant-admin/app/
  layout.tsx
  login/page.tsx
  suspended/page.tsx        ← shown when TenantLifecycle.status = SUSPENDED
  archived/page.tsx         ← shown when ARCHIVED
  (admin)/
    layout.tsx              Admin shell with sidebar
    dashboard/page.tsx
    users/page.tsx
    roles/page.tsx
    customers/page.tsx
    contacts/page.tsx
    branches/page.tsx
    finance/page.tsx
    settings/page.tsx
    modules/page.tsx
    website/page.tsx
    onboarding/page.tsx     ← wizard if TenantOnboarding.completed=false
    domain/page.tsx         ← custom domain setup + verification status
  (staff)/
    layout.tsx
    dashboard/page.tsx
    customers/page.tsx
    schedule/page.tsx
    profile/page.tsx
```

### 5.3 Role routing

After login, JWT `{ role, tenantId, userId }` redirects:
- `OWNER` / `ADMIN` → `/admin/dashboard`
- `MANAGER` / `STAFF` / `TRAINER` / `WAITER` → `/staff/dashboard`
- Customers never reach this app — they go to `:4007`

### 5.4 Onboarding wizard (admin/onboarding)

Shown automatically when `TenantOnboarding.completed = false`.
Steps driven by `BusinessTypeTemplate.onboardingSteps` for tenant's domain type.
Progress persisted to API on each step. Can resume after browser close.

### 5.5 Domain management page (admin/domain)

Shows:
- Current subdomain (`vrfitness.dexo.com`) — read-only
- Custom domain setup form → calls `POST /api/tenants/:id/domain/request`
- DNS instructions returned from API (TXT record, host, value)
- Verification status badge (Unverified / Verified / SSL Active)
- "Verify Now" button → calls `POST /api/tenants/:id/domain/verify`

### 5.6 Dashboard (admin/dashboard)

Domain-aware, data-driven. Layout from `BusinessTypeTemplate.dashboardLayout.widgets`.
At minimum 2 working widgets per seeded domain type.

### 5.7 Role-aware sidebar

Sidebar items from `DomainMenu` records filtered by user role.

**Deliverables:** Login works for all credential sets. Dashboard shows correct widgets.
Onboarding wizard completes and marks `TenantOnboarding.completed=true`. Suspended tenant
redirects to `/suspended`. Custom domain page shows DNS instructions.

---

## PHASE 6 — PLATFORM WEBSITE (apps/platform-web, :3001)
> **Session goal:** Dexo's marketing site where new tenants discover and sign up.
> **Graph note:** Run `code-review-graph update` after scaffolding the wizard components.

### 6.1 Pages

```
app/
  page.tsx                Landing (hero, features, 12 domain cards, pricing, CTA)
  pricing/page.tsx
  domains/page.tsx        Browse all 12 industry types
  domains/[type]/page.tsx Industry landing (e.g., /domains/fitness-center)
  signup/page.tsx
  signup/create/page.tsx  Tenant onboarding wizard (multi-step)
  login/page.tsx
  about/page.tsx
  contact/page.tsx
```

### 6.2 Tenant sign-up wizard (signup/create)

```
Step 1: Choose industry        (12 domain type cards from /api/business-templates)
Step 2: Business basics        (name, phone, address)
Step 3: Configure services     (template-specific fields)
Step 4: Branding               (logo upload, cover image, color picker)
Step 5: Choose subdomain       (live availability check → GET /api/tenants/check-slug)
Step 6: Choose plan + payment

On complete:
  POST /api/tenants                    (create + provision, returns subdomain)
  POST /api/onboarding/tenant/complete
  Redirect to http://admin.{slug}.dexo.com with welcome state
```

Slug field does real-time availability check (debounced 400ms) while user types.
Shows green checkmark for available, red X for taken or reserved.

### 6.3 Design rules

- Clean modern SaaS (think Linear, Vercel)
- Dark hero section, light content sections
- 12 industry cards with hover lift, primary color accent per template
- Mobile-first responsive

**Deliverables:** Sign-up flow creates a real tenant. Subdomain validated for uniqueness.
Domain provisioned. Redirect to tenant-admin works.

---

## PHASE 7 — TENANT WEBSITE (apps/tenant-website, :4005)
> **Session goal:** Public-facing branded website for each tenant. SEO-optimized.
> **Graph note:** Run `code-review-graph update` after adding section components.

### 7.1 App structure

```
apps/tenant-website/app/
  layout.tsx              Fetches tenant branding, sets theme CSS vars
  page.tsx                Home (sections from template.websiteSections)
  services/page.tsx
  about/page.tsx
  contact/page.tsx        → POST /api/contact (tenant-scoped)
  book/page.tsx
  login/page.tsx          → redirects to :4007 after auth
  register/page.tsx       → customer onboarding wizard
  onboarding/page.tsx
  unavailable/page.tsx    ← shown when TenantLifecycle.status != ACTIVE
```

### 7.2 Home page — section-based rendering

Each section toggled by `template.websiteSections`. FITNESS_CENTER and RESTAURANT_AND_CAFE
home sections as specified in Phase 2.4.

### 7.3 Theme injection

```tsx
<html style={{
  '--color-primary': tenant.branding.colorPrimary,
  '--color-accent': tenant.branding.colorAccent,
  '--color-bg': tenant.branding.colorBg,
  '--font-heading': template.fontHeading,
}}>
```

### 7.4 Customer onboarding wizard

Domain-aware steps (from template). On completion: creates User, sends welcome email,
sets JWT cookie → redirects to `:4007`.

### 7.5 Suspension handling

Middleware checks `TenantLifecycle.status`. If not ACTIVE, renders `unavailable/page.tsx`
with generic "temporarily unavailable" message (no suspension reason exposed to public).

**Deliverables:** `localhost:4005` (DEV_TENANT=vrfitness) renders VR Fitness Center branded site.
Customer onboarding creates real user and redirects to :4007. Contact form saves ContactMessage
with tenantId. Suspended tenant shows unavailable page.

---

## PHASE 8 — TENANT CUSTOMER APP (apps/tenant-app, :4007)
> **Session goal:** App-like experience for end customers.
> **CRITICAL UX RULE:** NO traditional navbar or sidebar. Bottom navigation + card feed only.
> **Graph note:** Run `code-review-graph update` after scaffolding route groups.

### 8.1 App structure

```
apps/tenant-app/app/
  layout.tsx              Bottom nav, theme, auth check
  login/page.tsx
  (home)/page.tsx         Personalized card feed (domain-aware)
  (bookings)/
    page.tsx
    [id]/page.tsx
  (explore)/
    page.tsx
    [id]/page.tsx
  (account)/
    page.tsx
    edit/page.tsx
  (activity)/page.tsx
```

### 8.2 Navigation

Bottom navigation bar (4–5 items, icon + label). Sticky, semi-transparent blur background.
Active item uses tenant primary color. No sidebar. No top hamburger menu.

```
FITNESS_CENTER:   Home | Classes | My Progress | Book | Profile
RESTAURANT:       Home | Menu | My Orders | Reserve | Profile
```

### 8.3 Home — personalized card feed

See Phase 7 in v4.0 for detailed card layout spec for FITNESS_CENTER and RESTAURANT_AND_CAFE.

### 8.4 Booking / Order flow

Tap card → detail page → "Book" button → bottom sheet slides up → confirm →
`POST /api/bookings` → success animation → back to home.

All modals are bottom sheets (slide up). No center-screen modals.

**Deliverables:** Customer from :4005 onboarding lands on personalized feed. Bottom nav works.
At least 3 feed cards per seeded domain. Book a class or table end-to-end.

---

## PHASE 9 — PLATFORM ADMIN (apps/platform-admin, :3002)
> **Session goal:** Dexo staff panel. Manage all tenants, plans, lifecycle operations.
> **Graph note:** Run `code-review-graph update` after adding lifecycle management pages.

### 9.1 App structure

```
apps/platform-admin/app/
  login/page.tsx
  (platform)/
    layout.tsx
    dashboard/page.tsx         Platform stats (total tenants, MRR, active users)
    tenants/page.tsx           Tenant list with status badges + lifecycle actions
    tenants/[id]/page.tsx      Tenant detail (domain, plan, lifecycle, health)
    tenants/[id]/lifecycle/page.tsx  Lifecycle management (suspend/reactivate/archive/delete)
    tenants/new/page.tsx       Create tenant manually
    domains/page.tsx           Domain types + templates
    plans/page.tsx
    users/page.tsx
    billing/page.tsx
    oauth/page.tsx
    settings/page.tsx
```

### 9.2 Tenant lifecycle management UI

Tenant detail page shows lifecycle panel:

```
Status badge:  ACTIVE | SUSPENDED | ARCHIVED | DELETION_SCHEDULED

Actions (role-gated to PLATFORM_ADMIN):
  [Suspend]       → modal: enter reason → POST /api/tenants/:id/lifecycle/suspend
  [Reactivate]    → confirm dialog → POST /api/tenants/:id/lifecycle/reactivate
  [Archive]       → requires SUSPENDED state → POST /api/tenants/:id/lifecycle/archive
  [Schedule Deletion] → 30-day warning shown → POST /api/tenants/:id/lifecycle/delete
  [Cancel Deletion]   → shown only if DELETION_SCHEDULED
```

Suspension reason is stored and visible to platform admins but not to tenant owners.

### 9.3 Remove legacy /t/ routes

Delete `app/t/` entirely. Old links show redirect notice pointing to `:4006`.

**Deliverables:** Platform admin login works. Tenant list shows both seeded tenants with ACTIVE
badge. Lifecycle actions work. No `/t/` routes exist.

---

## PHASE 10 — ENGINEERING STANDARDS
> **Session goal:** All cross-cutting concerns. Do before any production deployment.
> **Graph note:** Run `code-review-graph build` after this phase — significant middleware tree added.

### 10.1 Tenant resolution (packages/tenancy)

Full resolver implementation per Phase 4.3. Branding loader merges template defaults ← tenant overrides.

### 10.2 Feature flags (per tenant)

```ts
const canUseFeature = await checkFeature(tenantId, 'onlineBooking')
// Reads from TenantEnabledModule; cached in Redis TTL 5min
```

### 10.3 Audit logging (tenant-scoped)

```ts
{ tenantId, userId, action, resource, resourceId, ip, timestamp }
// All lifecycle events (suspend, delete, etc.) always audit-logged
// Audit log retained even after tenant deletion
```

### 10.4 Centralized error handling

Returns `{ statusCode, message, error, requestId, tenantId }`.
Never leaks stack traces in production.

### 10.5 Environment validation

Uses `class-validator` on startup. App refuses to start if `DATABASE_URL`, `JWT_SECRET`,
`REDIS_URL` are missing.

### 10.6 Health checks

```
GET /api/health → { status: "ok"|"degraded"|"down", db, redis, minio, timestamp }
```

### 10.7 Rate limiting

- Public routes: 60 req/min per IP
- Auth routes: 10 req/min per IP
- Tenant API: 300 req/min per tenantId

**Deliverables:** All middleware chains work. Health endpoint responds correctly.
`code-review-graph build` at phase end.

---

## PHASE 11 — TESTING + DOCUMENTATION
> **Session goal:** Confidence before deployment.

### 11.1 Seed verification tests

```ts
// scripts/verify-seed.ts
// Checks:
// - Both tenants exist and are ACTIVE
// - TenantLifecycle records exist for both seeded tenants
// - Each tenant has correct domainType
// - At least 5 users per tenant
// - At least 10 invoices across tenants
// - TenantOnboarding.completed = true for both
// - BusinessTypeTemplate exists for all 12 domain types
// - ContactMessage has tenantId on all records
```

### 11.2 Lifecycle smoke tests

```
POST /api/tenants                         → creates tenant, returns subdomain URL
GET  /api/tenants/check-slug?slug=taken   → { available: false }
GET  /api/tenants/check-slug?slug=admin   → { available: false, reason: 'reserved' }
GET  /api/tenants/check-slug?slug=newgym  → { available: true }
POST /api/tenants/:id/lifecycle/suspend   → returns 200; next API call from tenant returns 402
POST /api/tenants/:id/lifecycle/reactivate → tenant resumes
POST /api/tenants/:id/lifecycle/delete    → returns { deletionAt: <30 days> }
POST /api/tenants/:id/lifecycle/cancel-delete → status returns to SUSPENDED
POST /api/tenants/:id/domain/request      → returns DNS instructions (type, host, value)
```

### 11.3 API smoke tests (per phase)

```
Phase 3:  GET /api/business-templates returns 12 records
Phase 3:  GET /api/contact (tenant JWT) returns only that tenant's messages
Phase 5:  PUT /api/onboarding/tenant/step/1 saves and returns updated state
Phase 7:  POST /api/onboarding/customer/start creates CustomerOnboarding record
Phase 8:  GET /api/bookings (customer JWT) returns only that customer's bookings
```

### 11.4 Update documentation

After each phase:
- `README.md` — access points, demo credentials
- `RUN_GUIDE.md` — setup steps
- `PROMPT.md` — phase status checkboxes
- `CREDENTIALS.md` — all login credentials

---

## QUICK REFERENCE — DEMO CREDENTIALS

### Platform layer
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Platform admin | admin@test.com | Admin@123 | localhost:3002 |

### FITNESS_CENTER (VR Fitness Center — vrfitness.dexo.com)
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Owner | admin@vrfitness.com | Admin123! | localhost:4006 |
| Manager | manager@vrfitness.com | Manager123! | localhost:4006 |
| Trainer | trainer1@vrfitness.com | Trainer123! | localhost:4006 |
| Customer | member1@vrfitness.com | Member123! | localhost:4007 |

### RESTAURANT_AND_CAFE (Spice Garden — spicegarden.dexo.com)
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Owner | admin@spicegarden.com | Admin123! | localhost:4006 |
| Manager | manager@spicegarden.com | Manager123! | localhost:4006 |
| Staff | waiter1@spicegarden.com | Staff123! | localhost:4006 |

### Dev tenant switching
```bash
DEV_TENANT=vrfitness npm run dev --workspace=apps/tenant-admin
DEV_TENANT=spicegarden npm run dev --workspace=apps/tenant-website
```

---

## PHASE EXECUTION CHECKLIST

```
[ ] Phase 0   — Codebase restructure + workspace update + CRG install
[ ] Phase 1   — Schema migration (tenantId, templates, onboarding, TenantLifecycle)
[ ] Phase 2   — Seed system (clean, seed, re-seed, 2 domains)
[ ] Phase 3   — API scoping + template + onboarding endpoints
[ ] Phase 3A  — Tenant lifecycle management (create, suspend, archive, delete, custom domain)
[ ] Phase 4   — DNS & multi-tenant routing architecture
[ ] Phase 5   — Tenant admin portal (:4006) + lifecycle UI + domain management page
[ ] Phase 6   — Platform website + sign-up wizard (:3001)
[ ] Phase 7   — Tenant public website (:4005) + suspension handling
[ ] Phase 8   — Tenant customer app (:4007) [no sidebar/navbar]
[ ] Phase 9   — Platform admin cleanup (:3002) + lifecycle management UI
[ ] Phase 10  — Engineering standards (tenancy, flags, health, rate limiting)
[ ] Phase 11  — Testing + documentation update
```

---

## CODE REVIEW GRAPH — QUICK REFERENCE

```bash
# First-time setup (Phase 0 only)
pip install code-review-graph
code-review-graph install
code-review-graph build

# Every session start
code-review-graph update

# After prisma generate, new scaffold, or large file additions
code-review-graph update

# After renaming/moving files or end of a large phase
code-review-graph build

# Recommended: always-on watch mode
crg-daemon start

# Verify graph is current
code-review-graph status
```

---

## SESSION PROMPT TEMPLATE

Copy this at the start of every new coding session:

```
Project: Dexo multi-tenant SaaS platform
Stack: NestJS API (:4000), Next.js 14 App Router, Prisma, PostgreSQL, TypeScript monorepo

LOCKED RULES:
- Port map: platform-web:3001, platform-admin:3002, API:4000,
  tenant-website:4005, tenant-admin:4006, tenant-app:4007, mobile:8081
- Tenant resolution: hostname middleware ONLY — never [subdomain] URL segments
- Domain type is runtime config/data — NOT separate app folders
- Never add [subdomain] to any route path
- Customer-facing app (:4007): NO sidebar, NO top navbar — bottom nav + card feed only
- Tenant lifecycle: PROVISIONING → ACTIVE → SUSPENDED → ARCHIVED → DELETION_SCHEDULED → DELETED
- Slug reservation is atomic; reserved words are blocked

Graph status:
  [ ] crg-daemon running (or run `code-review-graph update` now)

Current phase: [PASTE PHASE NUMBER AND NAME]

Task this session: [PASTE ONE SPECIFIC TASK]

Files I'm working in:
[LIST RELEVANT FILE PATHS]

Context I need you to know:
[ANY SPECIFIC DETAIL ABOUT CURRENT STATE]
```

---

*PROMPT.md version 5.0 — Phases 0–11, seed system, onboarding flows, tenant lifecycle,
DNS architecture, code-review-graph session rules*
*Update phase checkboxes as each phase completes.*
