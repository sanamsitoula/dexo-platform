# Dexo Platform — TODO v5 (Master Prompt v5.0)

**Date:** 2026-06-26
**Source:** [DEXO_MASTER_PROMPT_v5.md](./DEXO_MASTER_PROMPT_v5.md)
**Overall Completion:** ~30% (Phases 0–3 + 3A complete)

## Quick Status

| Phase | Completion | Status |
|-------|------------|--------|
| Phase 0: Codebase Restructure | 100% | ✅ Complete |
| Phase 1: Schema Migration | 100% | ✅ Complete |
| Phase 2: Seed System | 100% | ✅ Complete |
| Phase 3: API Scoping + Templates + Onboarding | 100% | ✅ Complete |
| Phase 3A: Tenant Lifecycle | 90% | ✅ API complete (slug, provisioning, suspend, archive, delete, custom-domain) |
| Phase 4: DNS & Multi-Tenant Routing | 0% | ⏳ Not Started |
| Phase 5: Tenant Admin (:4006) | 0% | ⏳ Not Started |
| Phase 6: Platform Website (:3001) | 0% | ⏳ Not Started |
| Phase 7: Tenant Website (:4005) | 0% | ⏳ Not Started |
| Phase 8: Tenant App (:4007) | 0% | ⏳ Not Started |
| Phase 9: Platform Admin (:3002) | 0% | ⏳ Not Started |
| Phase 10: Engineering Standards | 0% | ⏳ Not Started |
| Phase 11: Testing + Documentation | 0% | ⏳ Not Started |

## Progress This Session (2026-06-26)

### Phase 0 — DONE ✅
- Renamed `apps/web` → `apps/platform-web` (port 3001)
- Renamed `apps/admin` → `apps/platform-admin` (port 3002)
- Deleted legacy `apps/platform-admin/app/t/` routes
- Updated root `package.json` workspaces + scripts
- Created new shared packages: `packages/api-client`, `packages/cms`, `packages/analytics`, `packages/modules` (12 industry sub-modules)
- Updated `run.bat`, `run.sh`, `scripts/start-app.ps1` with locked v5 port map
- Created `.env.local` for all 6 apps with `DEV_TENANT` set
- Fixed `apps/tenant-app/package.json` to use port 4007

### Phase 1 — DONE ✅
- `prisma/schema.prisma` extended with `LifecycleStatus`/`SslStatus` enums + `BusinessTypeTemplate`, `CustomerOnboarding`, `TenantOnboarding`, `TenantLifecycle` models
- Migration `20260626052331_v5_phase1` applied
- **DB connection fix:** Moved Docker postgres to port 5433 (native Windows postgres was on 5432)

### Phase 2 — DONE ✅
- 12/12 BusinessTypeTemplate records seeded
- 2 demo tenants: `vrfitness` + `spicegarden` with full TenantLifecycle + TenantOnboarding
- 14+4 users, 15+10 invoices, 3+12 branches, 4+134 schedules, 20 customers

### Phase 3 — DONE ✅
- `apps/api/src/modules/business-template/` — public templates API
- `apps/api/src/modules/onboarding/` — tenant + customer onboarding endpoints
- `apps/api/src/modules/health/` — `/api/health` endpoint
- `@Public()` decorator added to public routes
- ContactMessage controller already supports tenant scoping (existing)

### Phase 3A — DONE ✅
- `apps/api/src/modules/tenant-lifecycle/`:
  - `slug.service.ts` — validateSlug (3-30 chars, reserved list), reserveSlug
  - `provisioning.service.ts` — provisionTenant (creates Tenant, TenantLifecycle, TenantOnboarding)
  - `custom-domain.service.ts` — requestCustomDomain (DNS TXT), verifyCustomDomain
  - `tenant-lifecycle.service.ts` — suspend, reactivate, archive, scheduleDeletion, cancelDeletion, hardDelete with audit logging
  - `tenant-lifecycle.controller.ts` — all 12 lifecycle endpoints
- `apps/api/src/common/middleware/tenant-status.middleware.ts` — returns 402/403/404/503 per lifecycle status
- Module reordered in app.module.ts to win route precedence over existing TenantController

### Verified end-to-end (live API on :4000)
- `GET /api/health` → `{status: ok, db: up, ...}` ✅
- `GET /api/business-templates` → 12 records ✅
- `GET /api/business-templates/FITNESS_CENTER` → 1 record ✅
- `GET /api/tenants/check-slug?slug=newgym` → `{available: true}` ✅
- `GET /api/tenants/check-slug?slug=admin` → `{available: false, reason: 'reserved'}` ✅
- `GET /api/tenants/check-slug?slug=vrfitness` → `{available: false, reason: 'taken'}` ✅
- `POST /api/tenants` → creates tenant, returns `{tenantId, subdomain, url}` ✅
- `GET /api/tenants/:id/lifecycle` → full lifecycle state ✅
- `POST /api/tenants/:id/lifecycle/suspend` → status=SUSPENDED, audit log ✅
- `POST /api/tenants/:id/domain/request` → returns DNS TXT instructions ✅

## Progress This Session (2026-06-26)

### Phase 0 — DONE ✅
- Renamed `apps/web` → `apps/platform-web` (port 3001)
- Renamed `apps/admin` → `apps/platform-admin` (port 3002)
- Deleted legacy `apps/platform-admin/app/t/` routes
- Updated root `package.json` workspaces + scripts
- Created new shared packages: `packages/api-client`, `packages/cms`, `packages/analytics`, `packages/modules` (12 industry sub-modules)
- Updated `run.bat`, `run.sh`, `scripts/start-app.ps1` with locked v5 port map
- Created `.env.local` for all 6 apps with `DEV_TENANT` set
- Fixed `apps/tenant-app/package.json` to use port 4007

### Phase 1 — DONE ✅
- `prisma/schema.prisma` extended with `LifecycleStatus`/`SslStatus` enums + `BusinessTypeTemplate`, `CustomerOnboarding`, `TenantOnboarding`, `TenantLifecycle` models
- Relations added to `Tenant` and `User`
- Migration `20260626052331_v5_phase1` applied successfully
- **DB connection fix:** Windows native Postgres was occupying port 5432. Moved Docker container to **port 5433** (matches v5 spec) on the bridge, updated `.env` `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/dexo?schema=public`

### Phase 2 — DONE ✅
- 12/12 BusinessTypeTemplate records seeded (full websiteSections, onboardingSteps, dashboardLayout, features per industry)
- 2 demo tenants: `vrfitness` (FITNESS_CENTER) + `spicegarden` (RESTAURANT_AND_CAFE)
- Both with `TenantLifecycle` (status=ACTIVE, ssl=ACTIVE) and `TenantOnboarding` (completed=true, 6/6 steps)
- 14+4 users, 15+10 invoices, 3+12 branches, 4+134 schedules
- 20 customers created
- All seeded via `scripts/seed/0{0,1,3,4}*.ts` with idempotent `upsert` + `require.main === module` block

## Progress This Session (2026-06-26)

### Phase 0 — DONE ✅
- Renamed `apps/web` → `apps/platform-web` (port 3001)
- Renamed `apps/admin` → `apps/platform-admin` (port 3002)
- Deleted legacy `apps/platform-admin/app/t/` routes
- Updated root `package.json` workspaces + scripts (added `db:seed:*`, `crg:*` scripts)
- Created new shared packages: `packages/api-client`, `packages/cms`, `packages/analytics`, `packages/modules` (with all 12 industry sub-modules)
- Updated `run.bat`, `run.sh`, `scripts/start-app.ps1` with locked v5 port map (3001/3002/4000/4005/4006/4007/8081)
- Created `.env.local` for all 6 apps with `DEV_TENANT` set
- Fixed `apps/tenant-app/package.json` to use port 4007 (was 3002)

### Phase 1 — 90% DONE ✅
- `prisma/schema.prisma` updated with:
  - `LifecycleStatus` enum: PROVISIONING | ACTIVE | SUSPENDED | ARCHIVED | DELETION_SCHEDULED | DELETED
  - `SslStatus` enum: PENDING | ACTIVE | FAILED | EXPIRED
  - `BusinessTypeTemplate` model (12 template fields)
  - `CustomerOnboarding` model
  - `TenantOnboarding` model (6-step progress tracking)
  - `TenantLifecycle` model
- Relations added to `Tenant` (customerOnboardings, tenantOnboarding, tenantLifecycle)
- Relation added to `User` (customerOnboardings)
- `npx prisma validate` passes ✅
- PENDING: `npx prisma migrate dev --name "v5-phase1"` (requires running DB)
- PENDING: `npx prisma generate`

### Phase 2 — 60% DONE 🔄
- `scripts/seed/index.ts` — master runner
- `scripts/seed/clean.ts` — safe-order delete (30 models)
- `scripts/seed/00-platform.ts` — platform admin + 4 plans + settings
- `scripts/seed/01-domain-templates.ts` — all 12 BusinessTypeTemplate records (with full websiteSections, onboardingSteps, dashboardLayout, features)
- `scripts/seed/02-domains.ts` — delegates to existing `seed-domains-complete.js`
- `scripts/seed/03-tenants/fitness-center.ts` — VR Fitness Center (vrfitness) seed
- `scripts/seed/03-tenants/restaurant.ts` — Spice Garden (spicegarden) seed
- `scripts/seed/04-demo-data/fitness-data.ts` — 8 members + 15 invoices
- `scripts/seed/04-demo-data/restaurant-data.ts` — 8 orders + 5 reservations + 10 invoices
- PENDING: full integration with new schema fields, demo data for all 12 industries

## Locked Architecture Constants

```
PORT MAP — LOCKED
  :3001  apps/platform-web       Platform marketing + sign-up
  :3002  apps/platform-admin     Platform staff panel
  :4000  apps/api                Shared API
  :4005  apps/tenant-website     Tenant public website
  :4006  apps/tenant-admin       Tenant owner + staff portal
  :4007  apps/tenant-app         Tenant customer-facing app
  :8081  apps/mobile             Expo mobile
  :5433  PostgreSQL
  :6379  Redis
  :9000  MinIO
  :8025  MailHog (dev)

TENANT RESOLUTION — ALWAYS via hostname middleware, NEVER [subdomain] URL
DOMAIN TYPE — config/data loaded at runtime, NOT separate app folders
12 domain types: FITNESS_CENTER | SALON_AND_SPA | RESTAURANT_AND_CAFE |
  HOTEL_AND_HOSPITALITY | HEALTHCARE_CLINIC | SCHOOL_AND_EDUCATION |
  COACHING_INSTITUTE | ECOMMERCE | LOGISTICS_AND_DELIVERY |
  TAILOR_SHOP | NGO | SME_CORPORATE
```

---

## Phase 0: Codebase Restructure — BLOCKER FOR ALL OTHER PHASES

> Session goal: Rename existing apps, update workspace, lock all ports.

### 0.1 Rename apps
- [ ] `mv apps/web apps/platform-web`
- [ ] `mv apps/admin apps/platform-admin`

### 0.2 Update package.json names and ports
- [ ] `apps/platform-web/package.json` → name `@dexo/platform-web`, dev on :3001
- [ ] `apps/platform-admin/package.json` → name `@dexo/platform-admin`, dev on :3002

### 0.3 Update root workspace
- [ ] Root `package.json` workspaces includes `apps/platform-web`, `apps/platform-admin`, `apps/tenant-website`, `apps/tenant-admin`, `apps/tenant-app`, `packages/*`

### 0.4 Delete legacy routes
- [ ] Delete `apps/platform-admin/app/t/` directory
- [ ] Add redirect page if backward compat needed

### 0.5 Add shared packages scaffold
- [ ] `packages/auth` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/tenancy` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/permissions` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/ui` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/api-client` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/billing` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/notifications` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/cms` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/analytics` (src/index.ts, package.json, tsconfig.json)
- [ ] `packages/modules/{fitness,restaurant,salon,tailor,hotel,healthcare,school,coaching,ecommerce,logistics,ngo,sme}` scaffolds

### 0.6 Update run.bat and run.sh
- [ ] Replace all service names with new app names
- [ ] Port kill list: 3001, 3002, 4005, 4006, 4007
- [ ] Banner shows correct port → app → URL mapping

### 0.7 Environment files
- [ ] `.env.local` for each new app with `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_PORT`, `DEV_TENANT`

### 0.8 Initialize code-review-graph
- [ ] `pip install code-review-graph`
- [ ] `code-review-graph install`
- [ ] `code-review-graph build`
- [ ] `crg-daemon start`

### Phase 0 Deliverables
- [ ] All apps start without errors
- [ ] `npm run dev --workspace=apps/platform-admin` starts on :3002
- [ ] Workspace imports resolve
- [ ] `code-review-graph status` shows graph built

---

## Phase 1: Database Schema Migration

> Make schema correct before building any UI. All data models final.

### 1.1 Add tenantId to ContactMessage
- [ ] ContactMessage.tenantId String? + relation
- [ ] Tenant.contactMessages ContactMessage[]
- [ ] @@index([tenantId])

### 1.2 Add BusinessTypeTemplate model
- [ ] Fields: id, domainType (unique), name, description, tagline, heroImage, colorPrimary, colorAccent, colorBg, fontHeading, fontBody, websiteSections (Json), onboardingSteps (Json), dashboardLayout (Json), features (Json), timestamps

### 1.3 Add CustomerOnboarding model
- [ ] Fields: id, tenantId, userId, email, step, totalSteps, data (Json), completed, completedAt, source, timestamps
- [ ] @@index([tenantId]), @@index([email])

### 1.4 Add TenantOnboarding model
- [ ] Fields: id, tenantId (unique), step, totalSteps (6), completed, completedAt, profileComplete, brandingComplete, modulesComplete, teamComplete, websiteComplete, billingComplete, timestamps

### 1.5 Add TenantLifecycle model
- [ ] Fields: id, tenantId (unique), status, subdomainSlug (unique), customDomain (unique), customDomainVerified, dnsToken, sslStatus, suspendedAt, suspendedBy, suspendReason, archivedAt, archivedBy, deletedAt, deletedBy, deletionScheduledAt, provisionedAt, timestamps
- [ ] Add TenantStatus enum: PROVISIONING | ACTIVE | SUSPENDED | ARCHIVED | DELETION_SCHEDULED | DELETED
- [ ] Add SslStatus enum: PENDING | ACTIVE | FAILED | EXPIRED

### 1.6 Run migrations
- [ ] `npx prisma migrate dev --name "schema-migration-phase1"`
- [ ] `npx prisma generate`
- [ ] `code-review-graph update`

### Phase 1 Deliverables
- [ ] `npx prisma studio` shows all new models
- [ ] No migration errors
- [ ] Graph updated and reflects new schema files

---

## Phase 2: Seed Data System

> Idempotent, re-runnable seed scripts. Two demo domains fully seeded.

### 2.1 Seed architecture
- [ ] `scripts/seed/index.ts` — Master runner
- [ ] `scripts/seed/clean.ts` — Wipes in safe order
- [ ] `scripts/seed/00-platform.ts` — Platform admin, plans, settings
- [ ] `scripts/seed/01-domain-templates.ts` — All 12 BusinessTypeTemplate records
- [ ] `scripts/seed/02-domains.ts` — Domain, DomainModule, DomainRole, DomainPermission, DomainMenu, DomainWidget, DomainTheme
- [ ] `scripts/seed/03-tenants/fitness-center.ts` — VR Fitness Center full seed
- [ ] `scripts/seed/03-tenants/restaurant.ts` — Spice Garden full seed
- [ ] `scripts/seed/04-demo-data/fitness-data.ts` — Members, trainers, classes, invoices, attendance
- [ ] `scripts/seed/04-demo-data/restaurant-data.ts` — Tables, menu items, orders, reservations, staff

### 2.2 NPM scripts
- [ ] `db:seed`, `db:seed:clean`, `db:seed:fresh`, `db:seed:fitness`, `db:seed:restaurant`, `db:migrate:fresh`

### 2.3 Clean script
- [ ] Delete in correct order: CustomerOnboarding → TenantOnboarding → TenantLifecycle → ContactMessage → BranchUser → BranchSchedule → Attendance → BranchExpense → BranchReport → OAuthAccount → TenantOAuthConfig → TenantEnabledModule → TenantDomain → BranchUser → Branch → Invoice → Payment → JournalEntry → User → Tenant → BusinessTypeTemplate → DomainPermission → DomainMenu → DomainWidget → DomainTheme → DomainRole → DomainModule → Domain → Plan → PlatformOAuthConfig → Setting
- [ ] Wrap each delete in try/catch + log count

### 2.4 BusinessTypeTemplate seed (12 templates)
- [ ] FITNESS_CENTER (full config)
- [ ] RESTAURANT_AND_CAFE (full config)
- [ ] SALON_AND_SPA
- [ ] HOTEL_AND_HOSPITALITY
- [ ] HEALTHCARE_CLINIC
- [ ] SCHOOL_AND_EDUCATION
- [ ] COACHING_INSTITUTE
- [ ] ECOMMERCE
- [ ] LOGISTICS_AND_DELIVERY
- [ ] TAILOR_SHOP
- [ ] NGO
- [ ] SME_CORPORATE

### 2.5 FITNESS_CENTER tenant seed (vrfitness)
- [ ] Tenant: VR Fitness Center, subdomain=vrfitness, domain=FITNESS_CENTER
- [ ] Lifecycle: status=ACTIVE, sslStatus=ACTIVE
- [ ] Users: admin@/manager@/trainer1@/trainer2@/member1@/member2@
- [ ] Branches: HQ-KTM (HQ), BR-LAL, BR-BHA
- [ ] Classes: Morning HIIT, Evening Yoga, Strength Basics, Zumba Friday
- [ ] Members: 10 members
- [ ] Invoices: 15 across last 3 months
- [ ] Attendance: 30 rows
- [ ] Onboarding: all completed=true

### 2.6 RESTAURANT_AND_CAFE tenant seed (spicegarden)
- [ ] Tenant: Spice Garden, subdomain=spicegarden
- [ ] Users: admin@/manager@/waiter1@/chef@
- [ ] Tables: 12 (T01–T12), capacity 2–8
- [ ] Menu: 4 categories × 8 items; 2 specials
- [ ] Orders: 8
- [ ] Reservations: 5
- [ ] Invoices: 10
- [ ] Onboarding: all completed=true

### 2.7 Seed runner
- [ ] Idempotent functions (upsert on unique keys)
- [ ] Order: 00 → 01 → 02 → 03 (×2) → 04 (×2)

### Phase 2 Deliverables
- [ ] `npm run db:seed:fresh` runs without errors
- [ ] Both tenants visible in platform-admin
- [ ] Re-running seed produces same state

---

## Phase 3: API Scoping + Business Type Template API

### 3.1 Tenant middleware (global)
- [ ] `apps/api/src/common/middleware/tenant.middleware.ts`
- [ ] Reads X-Tenant-ID header or JWT sub-claim tenantId
- [ ] Sets req.tenantId; throws 400 if missing when required

### 3.2 Scope ContactMessage endpoints
- [ ] `POST /contact` saves tenantId
- [ ] `GET /contact` filtered by req.tenantId (PLATFORM_ADMIN sees all)
- [ ] `GET/PUT/POST /contact/:id` validate ownership

### 3.3 Scope Role endpoints
- [ ] Remove class-level PlatformAdminGuard
- [ ] `POST /roles` passes req.tenantId
- [ ] `GET /roles` returns WHERE tenantId = req.tenantId OR isSystem = true
- [ ] `PUT/DELETE /roles/:id` validate ownership; system roles immutable

### 3.4 BusinessTypeTemplate API
- [ ] `GET /api/business-templates` (public)
- [ ] `GET /api/business-templates/:domainType`

### 3.5 Onboarding API
- [ ] Tenant: GET /api/onboarding/tenant, PUT /api/onboarding/tenant/step/:n, POST /api/onboarding/tenant/complete
- [ ] Customer: POST /api/onboarding/customer/start, PUT /api/onboarding/customer/:id/step/:n, POST /api/onboarding/customer/:id/complete, GET /api/onboarding/customer/:id

### 3.6 Health check endpoint
- [ ] `GET /api/health` → { status, db, redis, minio, timestamp }

### Phase 3 Deliverables
- [ ] All endpoints return correct tenant-scoped data
- [ ] Swagger docs updated
- [ ] `code-review-graph update` after adding modules

---

## Phase 3A: Tenant Lifecycle Management

> Depends on: Phase 1 (TenantLifecycle model), Phase 3 (API middleware).

### 3A.1 Slug validation service
- [ ] `apps/api/src/modules/tenant-lifecycle/slug.service.ts`
- [ ] validateSlug: 3–30 chars, lowercase alnum + hyphens, no start/end hyphen
- [ ] Reserved words list: www, api, admin, app, portal, cdn, docs, status, dexo, support, mail, smtp
- [ ] reserveSlug: atomic DB unique constraint

### 3A.2 Provisioning service
- [ ] `apps/api/src/modules/tenant-lifecycle/provisioning.service.ts`
- [ ] provisionTenant: validate+reserve slug → create Tenant → quickSetup domain → create TenantOnboarding → emit event → update status=ACTIVE

### 3A.3 Custom domain service
- [ ] requestCustomDomain: store customDomain + dnsToken
- [ ] verifyCustomDomain: DNS TXT lookup, update customDomainVerified
- [ ] SSL provision via BullMQ worker (Certbot/Caddy/Cloudflare)

### 3A.4 Suspension service
- [ ] suspendTenant: status=SUSPENDED, audit log, emit event, invalidate sessions
- [ ] reactivateTenant: status=ACTIVE, clear fields, audit log, email

### 3A.5 Archival service
- [ ] archiveTenant: requires SUSPENDED, exports to MinIO, audit log

### 3A.6 Deletion workflow
- [ ] scheduleDeletion: 30-day grace, BullMQ delayed job
- [ ] cancelDeletion: status=SUSPENDED, clear fields
- [ ] hardDelete: remove media, cascade records, clear Redis, release slug, audit log

### 3A.7 Lifecycle API endpoints
- [ ] POST /api/tenants
- [ ] GET /api/tenants/:id/lifecycle
- [ ] POST /api/tenants/:id/lifecycle/{suspend,reactivate,archive,delete,cancel-delete}
- [ ] POST /api/tenants/:id/domain/{request,verify}
- [ ] GET /api/tenants/:id/domain/status
- [ ] GET /api/tenants/check-slug?slug=X

### 3A.8 Suspension middleware
- [ ] `apps/api/src/common/middleware/tenant-status.middleware.ts`
- [ ] SUSPENDED → 402, ARCHIVED → 403, DELETED → 404, PROVISIONING → 503
- [ ] Redis cache TTL 60s

### 3A.9 Frontend status pages
- [ ] `apps/tenant-admin/app/suspended/page.tsx`
- [ ] `apps/tenant-admin/app/archived/page.tsx`
- [ ] `apps/tenant-website/app/suspended/page.tsx`

### 3A.10 Seed update for lifecycle records
- [ ] Both seeded tenants get TenantLifecycle with status=ACTIVE, sslStatus=ACTIVE

### Phase 3A Deliverables
- [ ] POST /api/tenants creates tenant + reserves slug + returns subdomain
- [ ] Slug collision → 409
- [ ] Reserved words → 400
- [ ] Suspend → API returns 402
- [ ] Reactivate → resumes
- [ ] Delete → email + 30-day schedule
- [ ] Custom domain verify resolves DNS TXT
- [ ] `code-review-graph build` at phase end

---

## Phase 4: DNS & Multi-Tenant Routing

### 4.1 DNS records
- [ ] @ A <server-ip>, www CNAME dexo.com, * A <server-ip>, admin/api/cdn/docs/status A records

### 4.2 Reverse proxy routing
- [ ] NGINX / Traefik config routes hostnames to ports per spec
- [ ] *.dexo.com → :4005, admin.*.dexo.com → :4006, portal.*.dexo.com → :4007
- [ ] Custom domains → DB-resolved

### 4.3 Tenant resolver middleware
- [ ] `packages/tenancy/src/resolver.ts`
- [ ] Redis cache TTL 5min
- [ ] Parse slug or customDomain
- [ ] Query TenantLifecycle with tenant.branding + plan

### 4.4 Dev wildcard hosts
- [ ] /etc/hosts entries for vrfitness.localhost, admin.vrfitness.localhost, etc.
- [ ] DEV_TENANT env var fallback

### 4.5 SSL certificates
- [ ] Wildcard *.dexo.com cert
- [ ] Platform certs: dexo.com, admin.dexo.com, api.dexo.com
- [ ] Custom domains: per-tenant via BullMQ worker

### Phase 4 Deliverables
- [ ] NGINX config routes correctly
- [ ] Tenant resolver resolves subdomain + custom domain
- [ ] `code-review-graph update` after middleware

---

## Phase 5: Tenant Admin (:4006)

> Operational hub for tenant owners and staff. Dynamic, role-aware.

### 5.1 Middleware
- [ ] `apps/tenant-admin/middleware.ts`
- [ ] Reads hostname, x-dev-tenant, DEV_TENANT
- [ ] Sets x-tenant-slug header

### 5.2 App structure
- [ ] `app/layout.tsx`, `app/login/page.tsx`
- [ ] `app/suspended/page.tsx`, `app/archived/page.tsx`
- [ ] `(admin)/` route group: dashboard, users, roles, customers, contacts, branches, finance, settings, modules, website, onboarding, domain
- [ ] `(staff)/` route group: dashboard, customers, schedule, profile

### 5.3 Role routing
- [ ] OWNER/ADMIN → /admin/dashboard
- [ ] MANAGER/STAFF/TRAINER/WAITER → /staff/dashboard
- [ ] Customers never reach this app

### 5.4 Onboarding wizard
- [ ] Auto-shown when TenantOnboarding.completed=false
- [ ] Steps from BusinessTypeTemplate.onboardingSteps
- [ ] Resume after browser close

### 5.5 Domain management page
- [ ] Show current subdomain
- [ ] Custom domain setup form
- [ ] DNS instructions display
- [ ] Verify button
- [ ] SSL status badge

### 5.6 Dashboard
- [ ] Domain-aware layout from BusinessTypeTemplate.dashboardLayout.widgets
- [ ] At least 2 working widgets per seeded domain

### 5.7 Role-aware sidebar
- [ ] Items from DomainMenu filtered by user role

### Phase 5 Deliverables
- [ ] Login works for all credentials
- [ ] Dashboard shows correct widgets
- [ ] Onboarding wizard completes
- [ ] Suspended tenant → /suspended
- [ ] Custom domain page shows DNS instructions

---

## Phase 6: Platform Website (:3001)

### 6.1 Pages
- [ ] `app/page.tsx` — Landing (hero, features, 12 domain cards, pricing, CTA)
- [ ] `app/pricing/page.tsx`
- [ ] `app/domains/page.tsx`
- [ ] `app/domains/[type]/page.tsx`
- [ ] `app/signup/page.tsx`
- [ ] `app/signup/create/page.tsx` — 6-step wizard
- [ ] `app/login/page.tsx`, `app/about/page.tsx`, `app/contact/page.tsx`

### 6.2 Tenant sign-up wizard
- [ ] Step 1: Choose industry (12 cards from /api/business-templates)
- [ ] Step 2: Business basics
- [ ] Step 3: Configure services (template-specific)
- [ ] Step 4: Branding (logo, cover, color picker)
- [ ] Step 5: Choose subdomain (debounced 400ms availability check)
- [ ] Step 6: Choose plan + payment
- [ ] On complete: POST /api/tenants → POST /api/onboarding/tenant/complete → redirect to admin.{slug}.dexo.com

### 6.3 Design rules
- [ ] Clean modern SaaS (Linear/Vercel style)
- [ ] Dark hero, light content
- [ ] 12 industry cards with hover lift
- [ ] Mobile-first responsive

### Phase 6 Deliverables
- [ ] Sign-up flow creates real tenant
- [ ] Subdomain validated for uniqueness
- [ ] Domain provisioned
- [ ] Redirect to tenant-admin works

---

## Phase 7: Tenant Website (:4005)

### 7.1 App structure
- [ ] `app/layout.tsx` (branding + theme CSS vars)
- [ ] `app/page.tsx` (section-based home)
- [ ] `app/services/page.tsx`, `app/about/page.tsx`, `app/contact/page.tsx`
- [ ] `app/book/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`
- [ ] `app/onboarding/page.tsx`
- [ ] `app/unavailable/page.tsx` (when not ACTIVE)

### 7.2 Home — section-based
- [ ] Sections toggled by template.websiteSections

### 7.3 Theme injection
- [ ] CSS vars: --color-primary, --color-accent, --color-bg, --font-heading

### 7.4 Customer onboarding wizard
- [ ] Domain-aware steps from template
- [ ] On complete: create User, welcome email, JWT cookie, redirect to :4007

### 7.5 Suspension handling
- [ ] Middleware checks TenantLifecycle.status
- [ ] Renders unavailable page (no reason exposed)

### Phase 7 Deliverables
- [ ] localhost:4005 (DEV_TENANT=vrfitness) renders VR Fitness branded site
- [ ] Customer onboarding creates user → redirects to :4007
- [ ] Contact form saves with tenantId
- [ ] Suspended tenant → unavailable

---

## Phase 8: Tenant Customer App (:4007)

> **CRITICAL UX RULE:** NO navbar/sidebar. Bottom nav + card feed only.

### 8.1 App structure
- [ ] `app/layout.tsx` (bottom nav, theme, auth check)
- [ ] `app/login/page.tsx`
- [ ] `(home)/page.tsx` — personalized card feed
- [ ] `(bookings)/page.tsx`, `(bookings)/[id]/page.tsx`
- [ ] `(explore)/page.tsx`, `(explore)/[id]/page.tsx`
- [ ] `(account)/page.tsx`, `(account)/edit/page.tsx`
- [ ] `(activity)/page.tsx`

### 8.2 Navigation
- [ ] Bottom nav (4–5 items, icon + label)
- [ ] Sticky, semi-transparent blur
- [ ] Active item uses tenant primary color
- [ ] FITNESS_CENTER: Home | Classes | My Progress | Book | Profile
- [ ] RESTAURANT: Home | Menu | My Orders | Reserve | Profile

### 8.3 Home — card feed
- [ ] Domain-aware cards

### 8.4 Booking/Order flow
- [ ] Tap card → detail → "Book" → bottom sheet → confirm → POST /api/bookings → success → back to home
- [ ] All modals are bottom sheets (slide up)

### Phase 8 Deliverables
- [ ] Customer from :4005 lands on personalized feed
- [ ] Bottom nav works
- [ ] At least 3 feed cards per seeded domain
- [ ] Book a class or table end-to-end

---

## Phase 9: Platform Admin (:3002)

### 9.1 App structure
- [ ] `app/login/page.tsx`
- [ ] `(platform)/layout.tsx`
- [ ] `(platform)/dashboard/page.tsx` — platform stats
- [ ] `(platform)/tenants/page.tsx` — list with status badges
- [ ] `(platform)/tenants/[id]/page.tsx` — detail
- [ ] `(platform)/tenants/[id]/lifecycle/page.tsx` — lifecycle mgmt
- [ ] `(platform)/tenants/new/page.tsx` — manual create
- [ ] `(platform)/domains/page.tsx`, `plans/page.tsx`, `users/page.tsx`, `billing/page.tsx`, `oauth/page.tsx`, `settings/page.tsx`

### 9.2 Tenant lifecycle management UI
- [ ] Status badge: ACTIVE | SUSPENDED | ARCHIVED | DELETION_SCHEDULED
- [ ] Actions: Suspend (modal with reason), Reactivate, Archive (requires SUSPENDED), Schedule Deletion (30-day warning), Cancel Deletion
- [ ] Suspension reason visible to platform admins only

### 9.3 Remove legacy /t/ routes
- [ ] Delete `app/t/` entirely
- [ ] Redirect notice to :4006

### Phase 9 Deliverables
- [ ] Platform admin login works
- [ ] Tenant list shows both seeded tenants with ACTIVE badge
- [ ] Lifecycle actions work
- [ ] No /t/ routes exist

---

## Phase 10: Engineering Standards

### 10.1 Tenant resolution (packages/tenancy)
- [ ] Full resolver per Phase 4.3
- [ ] Branding loader merges template defaults ← tenant overrides

### 10.2 Feature flags (per tenant)
- [ ] `checkFeature(tenantId, 'onlineBooking')` reads TenantEnabledModule, Redis TTL 5min

### 10.3 Audit logging (tenant-scoped)
- [ ] Format: { tenantId, userId, action, resource, resourceId, ip, timestamp }
- [ ] All lifecycle events always audit-logged
- [ ] Retained after tenant deletion

### 10.4 Centralized error handling
- [ ] Returns { statusCode, message, error, requestId, tenantId }
- [ ] No stack traces in production

### 10.5 Environment validation
- [ ] class-validator on startup
- [ ] Refuses to start if DATABASE_URL, JWT_SECRET, REDIS_URL missing

### 10.6 Health checks
- [ ] `GET /api/health` → { status: "ok"|"degraded"|"down", db, redis, minio, timestamp }

### 10.7 Rate limiting
- [ ] Public: 60 req/min per IP
- [ ] Auth: 10 req/min per IP
- [ ] Tenant API: 300 req/min per tenantId

### Phase 10 Deliverables
- [ ] All middleware chains work
- [ ] Health endpoint responds correctly
- [ ] `code-review-graph build` at phase end

---

## Phase 11: Testing + Documentation

### 11.1 Seed verification tests
- [ ] `scripts/verify-seed.ts` — both tenants ACTIVE, lifecycle exists, correct domainType, ≥5 users, ≥10 invoices, onboarding completed, 12 BusinessTypeTemplate, ContactMessage has tenantId

### 11.2 Lifecycle smoke tests
- [ ] POST /api/tenants creates + returns subdomain URL
- [ ] GET /api/tenants/check-slug?slug=taken → { available: false }
- [ ] GET /api/tenants/check-slug?slug=admin → { available: false, reason: 'reserved' }
- [ ] GET /api/tenants/check-slug?slug=newgym → { available: true }
- [ ] POST /api/tenants/:id/lifecycle/suspend → next call returns 402
- [ ] POST /api/tenants/:id/lifecycle/reactivate → resumes
- [ ] POST /api/tenants/:id/lifecycle/delete → { deletionAt: 30 days }
- [ ] POST /api/tenants/:id/lifecycle/cancel-delete → SUSPENDED
- [ ] POST /api/tenants/:id/domain/request → DNS instructions

### 11.3 API smoke tests (per phase)
- [ ] Phase 3: GET /api/business-templates returns 12
- [ ] Phase 3: GET /api/contact (tenant JWT) returns only own messages
- [ ] Phase 5: PUT /api/onboarding/tenant/step/1 saves
- [ ] Phase 7: POST /api/onboarding/customer/start creates record
- [ ] Phase 8: GET /api/bookings (customer JWT) returns only own

### 11.4 Update documentation
- [ ] README.md — access points, demo credentials
- [ ] RUN_GUIDE.md — setup steps
- [ ] PROMPT.md — phase status checkboxes
- [ ] CREDENTIALS.md — all logins

---

## Demo Credentials Reference

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

---

## Phase Execution Checklist

```
[ ] Phase 0   — Codebase restructure + workspace update + CRG install
[ ] Phase 1   — Schema migration (tenantId, templates, onboarding, TenantLifecycle)
[ ] Phase 2   — Seed system (clean, seed, re-seed, 2 domains)
[ ] Phase 3   — API scoping + template + onboarding endpoints
[ ] Phase 3A  — Tenant lifecycle management
[ ] Phase 4   — DNS & multi-tenant routing architecture
[ ] Phase 5   — Tenant admin portal (:4006) + lifecycle UI + domain management page
[ ] Phase 6   — Platform website + sign-up wizard (:3001)
[ ] Phase 7   — Tenant public website (:4005) + suspension handling
[ ] Phase 8   — Tenant customer app (:4007) [no sidebar/navbar]
[ ] Phase 9   — Platform admin cleanup (:3002) + lifecycle management UI
[ ] Phase 10  — Engineering standards
[ ] Phase 11  — Testing + documentation update
```
