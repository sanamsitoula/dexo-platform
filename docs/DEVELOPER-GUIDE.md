# DEXO Developer Guide

How the platform fits together, how to extend it, and step-by-step recipes for the most
common kinds of work: integrating third-party APIs, adding OTP verification, building a new
module, building a new app, and shipping a platform-level module (HR example) that tenants
can enhance.

Companion docs: [BRAND-GUIDE-FOR-DEVELOPERS.md](./BRAND-GUIDE-FOR-DEVELOPERS.md),
[05_Auth_RBAC_Design.md](../05_Auth_RBAC_Design.md), [06_API_Design_Conventions.md](../06_API_Design_Conventions.md).

---

## 1. System map

```
                        ┌──────────────────────────────┐
                        │        apps/api  :4000       │  NestJS — ALL business logic
                        │  src/modules/* + packages/*  │  Prisma → Postgres :5433
                        └──────┬───────────┬───────────┘
        platform surfaces      │           │      tenant surfaces (per subdomain)
  ┌────────────────────────────┤           ├──────────────────────────────────────┐
  │ platform-web   :3001  marketing/signup │ tenant-website :4005  public site    │
  │ platform-admin :3002  Dexo staff admin │ tenant-admin   :4006  owner + staff  │
  │                                        │ tenant-app     :4007  customer PWA   │
  │                                        │ mobile (Expo)         customer native│
  └────────────────────────────────────────┴──────────────────────────────────────┘
  Infra (docker-compose / run.bat): Postgres 5433 · Redis 6379 · MinIO 9000 · MailHog 1025/8025
```

- **One API, many frontends.** Every frontend talks to `http://localhost:4000/api` through a
  small typed client (`apps/<app>/lib/api.ts`). Frontends never touch the DB.
- **One schema.** `prisma/schema.prisma` at the repo root. Every business row carries
  `tenantId`; platform rows have `tenantId = null`.
- **Shared packages** (`packages/*`): `@dexo/auth` (JWT, guards), `@dexo/shared` (Prisma,
  audit, queue, tenant mail), `@dexo/ui` (brand tokens, preset, logo), plus feature packages
  (billing, notification, settings, …) mounted by `apps/api/src/app.module.ts`.

## 2. Multi-tenancy & the business-template system

- **Tenant** = one business (row in `Tenant`, unique `subdomain`). Tenant resolution:
  subdomain host (`vrfitness.localhost`), `X-Dev-Tenant` header, or `DEV_TENANT` env in dev.
- **DomainType** = business vertical (`FITNESS_CENTER`, `RESTAURANT_AND_CAFE`, …12 types).
  Each has a `BusinessTypeTemplate` (colors, website sections, onboarding steps, dashboard
  layout, features) seeded by `scripts/seed/01-domain-templates.ts`. **Keep these** — new
  capabilities extend templates, they don't replace them.
- **Provisioning**: when a tenant is created, `domain-provisioning.service.ts` enables the
  domain's modules/roles and seeds vertical defaults (e.g. fitness → HQ branch + starter
  membership plans). Add your module's defaults there.
- **Menus/dashboards**: tenant-admin builds its sidebar from
  `apps/tenant-admin/lib/domain-config.ts` (`DOMAIN_MENUS` per domain + `COMMON_MENUS` that
  appear for **every** business type — attendance and email live there).

## 3. How auth works (read this before building anything)

1. **Login** — `POST /api/auth/login { email, password, subdomain }` → access JWT (1h) +
   refresh token. The JWT payload carries `sub` (userId), `email`, `tenantId`,
   `isPlatformAdmin`.
2. **Guards** — controllers use `@UseGuards(JwtAuthGuard)` from `@dexo/auth`; the strategy
   puts the payload on `req.user`. Platform-only endpoints add `PlatformAdminGuard`.
3. **Tenant scoping** — *every* service method takes `tenantId` as its first argument and
   filters `where: { tenantId }`. Controllers pass `req.user.tenantId`. This is the security
   boundary — never trust a tenantId from the request body.
4. **Roles** — `Role`/`UserRoles` per tenant; self-registration assigns `signupAs`
   (`MEMBER`/`TRAINER`) roles; admin signup only from the tenant-admin flow.
5. **Frontend storage** — tenant-admin stores the JWT under `tenant-token-<subdomain>`;
   tenant-app under `dexo_token`; clients attach `Authorization: Bearer`.
6. **Emails** — registration and password-reset emails are sent by `AuthService` through
   `TenantMailService` (`@dexo/shared`) — tenant SMTP first, platform SMTP fallback.

## 4. Anatomy of a backend module (the pattern to copy)

Look at `apps/api/src/modules/attendance-devices/` or `fitness/` — every module follows:

```
apps/api/src/modules/<name>/
  <name>.module.ts        # imports PrismaModule, declares providers/controllers
  <name>.controller.ts    # thin: guards + req.user.tenantId + delegation
  <name>.service.ts       # all logic; every method (tenantId, ...) and where:{tenantId}
```

Checklist to add one:
1. **Schema** — add models to `prisma/schema.prisma` (always `tenantId` + `tenant` relation
   + back-relation on `Tenant`). Generate a migration:
   `npx prisma migrate diff` → `prisma/migrations/<ts>_<name>/migration.sql` →
   `npx prisma migrate deploy && npx prisma generate` (Windows shells are non-interactive;
   `migrate dev` won't run).
2. **Module** — create the three files, register in `apps/api/src/app.module.ts`.
3. **Seed** — add demo rows in `scripts/seed/` (idempotent: count → top up).
4. **Frontend** — extend the app's `lib/api.ts` client group, add a page following an
   existing one (tenant-admin pages use the `_ui.tsx` primitives), add a menu entry in
   `domain-config.ts` (a specific domain's list, or `COMMON_MENUS` for all).
5. **Verify** — `npx tsc --noEmit` per app; run the API (`npm run dev` in apps/api —
   note: `nest start` fails on monorepo rootDir; the repo runs via ts-node transpile-only).

## 5. Complete journey: platform admin → tenant admin → customer

1. **Platform admin** (:3002, `admin@test.com`) creates a tenant, picks a business type →
   provisioning enables domain modules/roles, seeds defaults, creates `TenantLifecycle`
   (subdomain slug, SSL state) and `TenantOnboarding` (6-step checklist).
2. **Tenant admin** (:4006, `<subdomain>` login) completes onboarding: profile, branding
   (their colors/logo — the white-label semantic override), modules, team invites, website,
   billing. Sets up SMTP (Email settings), payment providers (payment-gateway), devices, plans.
3. **Public site** (:4005) renders the tenant's `BusinessTypeTemplate` + branding; customers
   discover the business and self-register.
4. **Customer** (:4007) registers (`signupAs: MEMBER` → welcome email → member profile
   auto-created for fitness tenants) → onboarding (goals) → buys a plan → pays online via the
   tenant's gateway → uses the vertical features (workouts, diet, check-in, chat, referrals).
5. **Money & data flow back**: payments create `PaymentTransaction` + GL journal entries;
   check-ins/attendance feed reports; platform admin sees cross-tenant analytics, billing,
   attendance and audit logs.

## 6. Recipe — integrate a third-party API (example: customer onboarding)

Pattern to copy: `apps/api/src/modules/payment-gateway/` (provider interface + pluggable
providers + per-tenant credentials) — it generalizes to any third-party integration.

Say you want to push every completed customer onboarding to an external CRM:

1. **Per-tenant credentials** — store in `Setting` (`key: 'crm'`, JSON value) like
   `TenantMailService` does, or in a dedicated table like `PaymentProvider` if you need
   status/fees. Never in env vars (env = platform-level only).
2. **Provider interface** — `ICrmProvider { pushLead(cfg, payload) }` with one class per
   vendor (`hubspot.provider.ts`, …), selected by `type` — exactly like
   `payment-provider.interface.ts`.
3. **Hook the event** — onboarding completion lives in
   `apps/api/src/modules/onboarding/onboarding.service.ts`; call your service best-effort:
   `this.crm.pushLead(tenantId, dto).catch(...)` — a vendor outage must never fail the
   user-facing flow (same rule as welcome emails).
4. **Inbound webhooks** — add an unauthenticated callback route with the tenant in the path,
   `POST /crm/callback/:tenantId`, and verify the vendor signature — see the eSewa/Fonepay
   callbacks in `payment-gateway.controller.ts`.
5. **Admin UI** — a settings card in tenant-admin (copy the Email (SMTP) page: load config →
   save → "send test").

## 7. Recipe — SMS OTP verification

Twilio credentials already exist in `.env.example` (`TWILIO_*`); MailHog-style dev fallback
is a console/mock sender.

1. **Schema** — add:
   ```prisma
   model OtpCode {
     id        String   @id @default(uuid())
     tenantId  String?
     phone     String
     codeHash  String        // bcrypt of the 6-digit code — never store plaintext
     purpose   String        // REGISTER | LOGIN | RESET | PAYMENT
     expiresAt DateTime
     attempts  Int      @default(0)
     usedAt    DateTime?
     createdAt DateTime @default(now())
     @@index([phone, purpose])
   }
   ```
2. **Module** — `apps/api/src/modules/otp/`:
   - `sms.provider.ts`: `send(to, text)` via Twilio REST (plain `fetch`, like
     `ai-plan.service.ts` calls Anthropic); if no `TWILIO_ACCOUNT_SID`, log the code
     (mock mode) so dev flows work.
   - `otp.service.ts`: `request(phone, purpose)` → generate 6 digits, bcrypt-hash, save with
     5-min expiry, rate-limit (max 3 active per phone), send SMS;
     `verify(phone, purpose, code)` → find latest unused, check expiry + attempts (max 5),
     compare hash, mark `usedAt`.
   - Controller: `POST /otp/request`, `POST /otp/verify` (throttled — the API already has
     `ThrottlerModule`).
3. **Wire into auth** — e.g. phone-verified registration: frontend calls `/otp/request`,
   user enters code, frontend calls `/otp/verify` → returns a short-lived `otpToken` (JWT,
   `type: 'otp'`), which is passed to `/auth/register` and checked there. Password reset by
   SMS mirrors the email flow in `auth.service.ts`.
4. **Frontend** — a 6-digit input screen in tenant-app between register and onboarding.

## 8. Recipe — create a new app

1. Scaffold under `apps/<name>` (copy `tenant-app` for a customer surface or `tenant-admin`
   for a staff surface — you get auth, api client, tokens and layout for free).
2. Add the folder to root `package.json` → `workspaces`; pick the next free port
   (README "locked v5 port map") and set it in the app's `dev` script.
3. Wire the brand foundation (see BRAND-GUIDE §3): `next/font` trio in the root layout,
   `dexo-brand.css` import, Tailwind preset (v3) or `@theme` block (v4), `app/icon.svg`.
4. Add `@dexo/ui`/`@dexo/shared` to `transpilePackages` in `next.config.js` if you import them.
5. Copy `lib/api.ts` from the nearest sibling and keep the same conventions (subdomain-scoped
   token, `ApiResponse<T>`, grouped endpoint objects).
6. Register the app in `run.bat` (start list + port check) so `run.bat` boots it.

## 9. Recipe — platform-level module that tenants enhance (HR example)

The pattern: **base module = platform-owned schema + API + default config; tenant
enhancement = per-tenant configuration + vertical presets + their own UI arrangement.**
This is exactly how finance (chart-of-accounts template → tenant chart) and attendance
(device registry → tenant devices) already work. For HR:

1. **Base (platform)**
   - Schema: `Employee` (tenantId, branchId, userId?, designation, joinDate, salary…),
     `LeaveType`, `LeaveRequest`, `PayrollRun` — all tenant-scoped.
   - Module `apps/api/src/modules/hr/` with CRUD + approval flows, reusing what exists:
     staff = `User` + `BranchUser`, attendance for timesheets (the ZKTeco module already
     provides punches/reports), finance for salary postings (copy `gym-ledger.service.ts` —
     it shows how a vertical posts to the GL).
   - Platform admin page: cross-tenant HR stats (copy `app/attendance/page.tsx`).
   - Register `hr` as a `DomainModule` so provisioning can enable it per business type,
     and add default `LeaveType` rows in `domain-provisioning.service.ts`.
2. **Tenant enhancement**
   - `BusinessTypeTemplate.features` gains an `hr` block per vertical (fitness: trainers as
     employees with session-based pay; restaurant: shift scheduling emphasis) — templates
     stay, they grow.
   - Tenant-admin pages under `app/(admin)/hr/*` + menu entry (add to `COMMON_MENUS` if HR
     is for every business type, or per-domain lists if not).
   - Tenant-specific config (leave policy, payroll day, allowances) in `Setting`
     (`key: 'hr'`) — the same self-service override mechanism as SMTP.
   - Staff self-service (leave request, payslip) can live in tenant-admin's `(staff)` area
     or tenant-app, calling the same API.
3. **Boundary** — tenants configure and extend *their* HR data and screens; the base
   schema/API/behavior stays platform-owned so every tenant benefits from upgrades.

## 10. Conventions cheat-sheet

- NPR + 13% VAT for money in Nepal verticals; `Decimal` in schema, never float.
- Best-effort side effects (email, webhooks, AI) — `.catch()` and log; never fail the main flow.
- Seeds are idempotent (upsert or count→top-up); every table a feature reads should reach
  ≥10 demo rows (`npm run db:verify:fitness` pattern).
- API responses: controllers return service results directly; errors via Nest exceptions.
- Windows dev: Postgres is Docker on **5433**; API runs `ts-node --transpile-only`;
  `prisma migrate dev` is unavailable (non-interactive) — use `migrate diff` + `deploy`.
