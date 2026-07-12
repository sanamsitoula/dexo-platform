# Dexo Platform

**Domain-Driven Multi-Tenant SaaS Platform Engine** — transforms into any industry
through domain types. One codebase, twelve industries, two demo tenants pre-seeded.

> 📋 Implementation status: [DEXO_MASTER_PROMPT_v5.md](./DEXO_MASTER_PROMPT_v5.md)
> 🚀 Full run guide: [RUN_GUIDE_v5.md](./RUN_GUIDE_v5.md)
> 🔐 Login credentials: [CREDENTIALS.md](./CREDENTIALS.md)

---

## 🎯 What is Dexo?

Dexo is a multi-tenant SaaS platform that adapts itself to a tenant's industry at
onboarding time. When a tenant selects a **Domain Type** (e.g. `FITNESS_CENTER`),
the platform auto-provisions industry-specific modules, roles, menus, dashboards,
permissions, and a branded theme — with zero code changes.

- ✅ 12 industry domains (Fitness, Salon, School, Restaurant, Hotel, Healthcare, Ecommerce, Logistics, Tailor, NGO, SME, Coaching)
- ✅ 200+ auto-provisioned domain modules, 50+ roles, 1000+ permissions
- ✅ Domain-driven dynamic menus, dashboards, and themes
- ✅ Multi-branch management (per-tenant, branch-level financial isolation)
- ✅ 6 OAuth social login providers (Google, GitHub, Apple, Facebook, Microsoft, LinkedIn)
- ✅ 5 payment gateways (eSewa, Fonepay, ConnectIPS, Stripe, PayPal)
- ✅ NFRS-compliant double-entry finance module
- ✅ IRD Electronic Billing reports (Schedule 6D sales-book, purchase-book, VAT return, TDS, aging, cancelled-bills, reprint-log, audit-trail, CBMS sync status) — 11 endpoints + tenant-admin UI
- ✅ **Accounting & bookkeeping** — Chart of Accounts (ledger heads + sub-accounts, 46-account Nepal NFRS template), manual double-entry journal entries (draft/post/reverse), GL auto-posting from invoices & payments, trial balance / balance sheet / income statement now reflect real data
- ✅ **Invoicing & printing** — invoice list + printable view with **Print / Save-as-PDF** button, reprint logging with **"COPY OF ORIGINAL / प्रतिलिपि"** watermark (IRD-compliant), every new invoice auto-posts DR Accounts Receivable / CR Sales / CR VAT Payable
- ✅ **Fitness self-signup** — customers (`signupAs=MEMBER`) and trainers (`signupAs=TRAINER`) self-register; trainers view their assigned trainees via `/fitness/trainers/me/trainees`; per-member payment history
- ✅ WhatsApp Business Cloud API integration (per-tenant config, template messages, opt-in/out, floating chat button, tenant-admin settings)
- ✅ Contact Us pages (tenant-website public form + platform-web) with branch info, map, WhatsApp button
- ✅ 10 languages, 10 currencies

---

## 🏗️ Architecture (v5)

```
┌──────────────────────────────────────────────────────────┐
│  PLATFORM LAYER                                          │
│   apps/platform-web  :3001  marketing site + sign-up     │
│   apps/platform-admin :3002 platform staff panel         │
├──────────────────────────────────────────────────────────┤
│  TENANT LAYER                                            │
│   apps/tenant-website :4005 public website (per tenant)  │
│   apps/tenant-admin   :4006 owner + staff portal        │
│   apps/tenant-app     :4007 customer-facing app          │
├──────────────────────────────────────────────────────────┤
│  MOBILE LAYER                                            │
│   apps/mobile         :8081 Expo (domain-aware nav)      │
├──────────────────────────────────────────────────────────┤
│  API LAYER                                               │
│   apps/api            :4000 NestJS shared backend        │
│                          (Swagger at /api/docs)          │
├──────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (Docker)                                 │
│   PostgreSQL :5433  Redis :6379  MinIO :9000  MailHog :8025 │
└──────────────────────────────────────────────────────────┘
```

### Tech stack
- **Frontend:** Next.js 13+ (web/admin), React Native + Expo (mobile), TypeScript, Tailwind
- **Backend:** NestJS modular monolith, Prisma ORM, PostgreSQL, Redis, BullMQ
- **Infra:** Docker Compose, MinIO (S3), MailHog (email testing)

### Monorepo layout
```
Dexo/
├── apps/
│   ├── api/                  NestJS API (:4000)
│   ├── platform-web/         Platform marketing + sign-up (:3001)
│   ├── platform-admin/       Platform staff panel (:3002)
│   ├── tenant-website/        Tenant public website (:4005)
│   ├── tenant-admin/          Tenant owner + staff portal (:4006)
│   ├── tenant-app/           Tenant customer app (:4007)
│   └── mobile/               Expo mobile app (:8081)
├── packages/                 Shared NestJS modules (auth, tenant, user, billing, blog, …)
├── prisma/                   schema.prisma + seed pipeline
├── scripts/                  seed pipeline, smoke tests, dev helpers
├── docker-compose.yml        Infra services
├── run.bat / run.sh          One-command dev startup
└── *.md                      Architecture + run + credentials docs
```

---

## 🚀 Quick Start (one command)

### Prerequisites
- **Node.js** ≥ 18.0.0  (npm ≥ 9)
- **Docker Desktop** running
- **Git**

### Windows
```bash
git clone https://github.com/sanamsitoula/dexo-platform.git
cd dexo-platform
run.bat
```

### Linux / macOS
```bash
git clone https://github.com/sanamsitoula/dexo-platform.git
cd dexo-platform
./run.sh
```

The startup script performs all six setup steps in order (see **Modular setup**
below) and then boots every app. When it finishes it opens the browser windows
for you.

---

## 🧩 Modular setup (manual, step by step)

Prefer to run things yourself? Each step below maps to one module of the platform
and can be rerun independently. Run them in order the first time.

### Step 1 — Infrastructure module (Docker services)
Starts PostgreSQL, Redis, MinIO (S3), and MailHog. `run.bat` does this for you
automatically; if you're going modular, use compose:
```bash
docker-compose up -d
# verify: docker ps   (dexo-postgres, dexo-redis, dexo-minio, dexo-mailhog should be Up)
```
| Service    | Port | Console                      | Default creds            |
|------------|------|------------------------------|--------------------------|
| PostgreSQL | 5433 | —                            | postgres  / postgres     |
| Redis      | 6379 | —                            | (no auth)                |
| MinIO      | 9000 | http://localhost:9001        | minioadmin / minioadmin  |
| MailHog    | 8025 | http://localhost:8025        | (no auth)                |

### Step 2 — Environment module (`.env`)
```bash
cp .env.example .env
```
Then edit `.env` so the database URL matches the Docker container:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dexo
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-key-change-in-production
DEV_TENANT=vrfitness            # which tenant to simulate in dev
```
> If port 5433 is already taken by a native Windows Postgres, change the host
> port to 5432 in both `docker-compose.yml` and `.env`.

### Step 3 — Dependencies module
```bash
npm install
```
This installs the root workspace + every `apps/*` and `packages/*` workspace.

### Step 4 — Database module (schema + client)
```bash
npx prisma generate        # generate the Prisma client
npx prisma migrate dev --name "v5-init"   # create tables (first run only)
# Or, if you prefer to skip migrations:  npx prisma db push
```

### Step 5 — Seed module (v5 pipeline)
Seeds the platform admin, all 12 domain templates, and two demo tenants
(`vrfitness` = Fitness Center, `spicegarden` = Restaurant).
```bash
npm run db:seed:v5
```
> The v5 pipeline is idempotent — re-running produces the same state.

### Step 6 — Applications module (start everything)
```bash
npm run dev        # turbo runs every app in parallel (API + 6 frontends + mobile)
```
Or start individual apps:
```bash
npm run dev:api            # :4000
npm run dev --workspace=@dexo/platform-web      # :3001
npm run dev --workspace=@dexo/platform-admin   # :3002
npm run dev --workspace=@dexo/tenant-website   # :4005  (DEV_TENANT=vrfitness)
npm run dev --workspace=@dexo/tenant-admin     # :4006
npm run dev --workspace=@dexo/tenant-app       # :4007
```

### (Optional) Smoke tests
With the API running on `:4000`:
```bash
npx ts-node --transpile-only scripts/smoke-tests.ts
```
Verifies tenant creation, slug validation, lifecycle flows, the 12 domain
templates, seeded tenant states, and the `/api/health` endpoint.

---

## 🌐 Access points (locked v5 port map)

| App                    | Port | URL                       | Purpose                          |
|------------------------|------|---------------------------|----------------------------------|
| Platform Web           | 3001 | http://localhost:3001     | Marketing + tenant sign-up       |
| Platform Admin         | 3002 | http://localhost:3002     | Platform staff panel             |
| API Server             | 4000 | http://localhost:4000     | Shared backend                   |
| Swagger Docs           | 4000 | http://localhost:4000/api/docs | Interactive API docs        |
| Tenant Website (vrfitness) | 4005 | http://localhost:4005 | Tenant public website        |
| Tenant Admin Portal    | 4006 | http://localhost:4006     | Tenant owner + staff portal      |
| Tenant Customer App    | 4007 | http://localhost:4007     | Tenant customer-facing app       |

> **Production URL map (nginx, onedexo.com):** `onedexo.com` → platform-web ·
> `admin.onedexo.com` → platform-admin · `api.onedexo.com` → API ·
> `<tenant>.onedexo.com` → tenant-website · `admin.<tenant>.onedexo.com` → tenant-admin ·
> `portal.<tenant>.onedexo.com` → tenant-app (canonical member portal) ·
> custom domains → tenant-website via `/api/tenants/resolve`.
> Subdomain routing is fully dynamic (wildcard server blocks — no per-tenant nginx edits);
> custom-domain SSL fragments are generated per tenant by `scripts/nginx-tenant-sync.ts`
> into `/etc/nginx/dexo-tenants/` (fractional rebuild + graceful reload).
> See `infra/nginx/dexo.conf` and `docs/CUSTOM_DOMAINS.md`.
| Tenant Reports (admin) | 4006 | http://localhost:4006/reports | NFRS + IRD financial reports |
| Tenant Finance (admin) | 4006 | http://localhost:4006/finance | Chart of accounts, journal entries, invoices |
| Tenant Invoices (admin) | 4006 | http://localhost:4006/finance/invoices | Invoice list + print/PDF + reprint copy |
| Tenant WhatsApp settings | 4006 | http://localhost:4006/whatsapp | WhatsApp Business Cloud config |
| Tenant Contact Us (public) | 4005 | http://localhost:4005/contact | Public contact form + branches |
| Mobile (Expo)          | 8081 | http://localhost:8081     | Mobile-optimized interface        |
| MinIO Console          | 9001 | http://localhost:9001     | S3 file storage console           |
| MailHog                | 8025 | http://localhost:8025     | Email testing inbox               |

### Dev tenant switching
The default dev tenant is `vrfitness`. To point the tenant apps at a different
tenant:
```bash
# Option A — env var (requires restart)
DEV_TENANT=spicegarden npm run dev --workspace=@dexo/tenant-website

# Option B — X-Dev-Tenant header (no restart, set by the API client / NGINX)

# Option C — hostname (production-style, add to your hosts file)
#   vrfitness.localhost         → tenant vrfitness
#   admin.vrfitness.localhost   → vrfitness admin
#   portal.vrfitness.localhost  → vrfitness customer app
```

---

## 📒 Finance & Accounting (Nepal NFRS)

Double-entry bookkeeping with IRD electronic-billing compliance. NPR currency, VAT 13%, TDS, CBMS, fiscal years.

**Tenant Admin → http://localhost:4006/finance**

| Page | What it does |
|------|--------------|
| `/finance/accounts` | **Chart of Accounts** — ledger heads (control accounts) + sub-accounts. Seeded with a 46-account Nepal NFRS template. Add new accounts inline. |
| `/finance/journal` | **Manual journal entries** — create double-entry postings (debits = credits enforced), draft → post → reverse. |
| `/finance/invoices` | **Invoices & bills** — list tax invoices, click any to view & **Print / Save-as-PDF**. Reprints are logged and watermarked **"COPY OF ORIGINAL / प्रतिलिपि"**. |
| `/reports/finance/*` | Trial balance, balance sheet, income statement, cash flow. |
| `/reports/*` | IRD reports: sales book, purchase book, VAT return, TDS summary, AR/AP aging, cancelled bills, reprint log, audit trail, CBMS sync. |

**GL auto-posting:** every new invoice auto-creates a `JournalEntry` (DR Accounts Receivable / CR Sales Revenue / CR VAT Payable) and every payment auto-creates one (DR Cash/Bank / CR Accounts Receivable), so trial balance & financial statements reflect real activity. Postings are safe no-ops if the chart of accounts isn't seeded.

**Seed the accounting setup** (chart of accounts + monthly periods + tenant-domain link):
```bash
npm run db:seed:v5        # includes step 05-accounting
# or standalone:
npx ts-node --transpile-only scripts/seed/05-accounting.ts
```

### Fitness self-signup

Customers and trainers self-register against a fitness tenant:

```bash
# Register a TRAINER (auto-creates a Trainer + Member profile)
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{
  "email":"trainer@vrfitness.com","password":"Trainer123!",
  "firstName":"Jane","lastName":"Coach","tenantId":"<tenantId>",
  "signupAs":"TRAINER","specialization":"Strength"
}'

# After login, a trainer views their assigned trainees:
#   GET /api/fitness/trainers/me/trainees
# A member views their own profile:
#   GET /api/fitness/members/me
# Per-member payment history:
#   GET /api/fitness/memberships/member/:memberId/payments
```

---

## 🏋️ Fitness vertical (FITNESS_CENTER)

The fitness business type is fully wired end-to-end: API (`apps/api/src/modules/fitness/*`),
staff admin (**:4006**) and the customer mobile app (**:4007**, mobile-first PWA).

### Customer app — http://localhost:4007
Onboarding → membership → training journey, all self-service:
- **Onboarding**: register (welcome email is sent automatically), goals & profile setup
- **Workout journey**: AI/trainer workout plans, logging, streaks, progress charts, body assessments
- **Calorie tracking**: food logs + daily summary backed by the Nepali food database (`/diet`)
- **Membership & payments**: browse plans, see payment due, **pay online through the payment
  gateway** (eSewa / Khalti / ConnectIPS / Fonepay / Stripe / PayPal — whichever the gym has
  configured; seeded demo tenant has an **eSewa sandbox** provider). Checkout redirects to the
  gateway and returns to `/payment/return`, which verifies the transaction and activates the
  membership. Cash-at-counter stays a PENDING reservation.
- **Coach chat** (`/coach`), **referrals** (`/referrals`), **badges** (`/badges`),
  **check-in + my attendance** (`/checkin` — QR, manual and biometric punches)

### Tenant admin — http://localhost:4006
Members, plans, trainers, classes, check-in, **workouts** (AI generate + approve), **diet plans**
(AI generate + approve), **assessments**, **equipment & maintenance**, **badges**, **referrals**,
**food DB**, plus finance/accounting.

### AI plan generation
`POST /api/fitness/workout-plans/generate` and `POST /api/fitness/diet-plans/generate` build
member-specific plans from the latest body assessment. With `ANTHROPIC_API_KEY` set they use the
Anthropic API (model via `AI_PLAN_MODEL`); without a key a deterministic rule-based generator is
used, so the feature always works locally. Plans save as DRAFT → trainer approves.

### Demo data
`npm run db:seed:v5` (or standalone `npm run db:seed:fitness-full`) idempotently tops up **every
fitness table to ≥ 10 rows** for the `vrfitness` tenant — members, memberships, trainers, classes,
bookings, workout/diet plans + logs, assessments, messages, badges, referrals, equipment,
attendance, invoices. Verify with `npm run db:verify:fitness`.

---

## 📧 Tenant email (SMTP) — onboarding & password reset

Each tenant can configure **its own SMTP server** (Tenant Admin → **Email (SMTP)**, stored in the
`Setting` table under key `smtp`); tenants without a config fall back to the platform SMTP
(`SMTP_*` env vars — MailHog at http://localhost:8025 in local dev).

Sent automatically through the tenant's SMTP:
- **Welcome / onboarding email** when a customer registers (`POST /api/auth/register`)
- **Password reset** link (`POST /api/auth/forgot-password`)
- **Test email** from the admin screen (`POST /api/tenant-mail/test`)

API: `GET/PUT /api/tenant-mail/config`, `POST /api/tenant-mail/test`.

---

## 🖐️ Biometric attendance (ZKTeco data puller)

Attendance management modeled after
[ZKTecoAttendancePuller](https://github.com/sanamsitoula/ZKTecoAttendancePuller) — device
registry, **data puller**, **attendance logs** and **reports** — available to **every business
type / tenant**, not just fitness.

- **Protocol**: TCP port **4370** (UDP toggle for older models like iFace302), per-device comm key
  and timeout — via `node-zklib`. Set `ZK_MOCK=true` (default in `.env.example`) to pull generated
  sample punches without hardware.
- **Puller**: `POST /api/attendance-devices/:id/pull` (or *Pull all*); every run writes an
  `AttendancePullSession` audit row (records pulled, new inserts, error detail). A 30-minute
  scheduled pull runs when `ATTENDANCE_AUTO_PULL=true`. Pulls are **idempotent** —
  `UNIQUE(deviceId, deviceUid, checkInTime)` dedupes punches.
- **Mapping**: device user ids map to members via `Member.deviceUserId` (seeded 1..N for the demo
  tenant); unmapped punches are kept and flagged.
- **Screens**:
  - Tenant admin (:4006): **Devices** (CRUD, pull now, test connection, sessions),
    **Attendance Logs** (filter by date/device/person, CSV export),
    **Attendance Reports** (daily present/absent, monthly per-person grid, 14-day trend) —
    in the sidebar of *every* business type.
  - Platform admin (:3002 → **Attendance**): all devices & pull sessions across tenants.
  - Customer app (:4007 → **Check in**): members see their own attendance history
    (QR + manual + fingerprint punches) via `GET /api/attendance-logs/me`.

---

## 🔐 Test credentials (all portals)

> Full reference: [CREDENTIALS.md](./CREDENTIALS.md)

### Platform layer — http://localhost:3002
| Role           | Email            | Password    |
|----------------|------------------|-------------|
| Platform Admin | `admin@test.com` | `Admin@123` |

### FITNESS_CENTER tenant — `vrfitness` (subdomain)
| App                        | URL                  | Email                          | Password      |
|----------------------------|----------------------|--------------------------------|---------------|
| Tenant Admin Portal (:4006) | http://localhost:4006 | `admin@vrfitness.com`       | `Admin123!`   |
| Tenant Admin Portal (:4006) | http://localhost:4006 | `manager@vrfitness.com`     | `Manager123!` |
| Tenant Admin Portal (:4006) | http://localhost:4006 | `trainer1@vrfitness.com`    | `Trainer123!` |
| Tenant Customer App (:4007)  | http://localhost:4007 | `member1@vrfitness.com`     | `Member123!`  |

### RESTAURANT_AND_CAFE tenant — `spicegarden` (subdomain)
| App                        | URL                  | Email                          | Password      |
|----------------------------|----------------------|--------------------------------|---------------|
| Tenant Admin Portal (:4006) | http://localhost:4006 | `admin@spicegarden.com`     | `Admin123!`   |
| Tenant Admin Portal (:4006) | http://localhost:4006 | `manager@spicegarden.com`   | `Manager123!` |
| Tenant Admin Portal (:4006) | http://localhost:4006 | `waiter1@spicegarden.com`   | `Staff123!`   |

### Infra service consoles
| Service  | URL                     | Username        | Password        |
|----------|-------------------------|-----------------|-----------------|
| MinIO    | http://localhost:9001   | `minioadmin`    | `minioadmin`    |
| MailHog  | http://localhost:8025  | (no auth)       | (no auth)       |
| Postgres | jdbc:postgresql://localhost:5433/dexo | `postgres` | `postgres` |

---

## 🎯 Creating a new tenant

### Via Platform Admin (recommended)
1. Open http://localhost:3002 → log in as `admin@test.com` / `Admin@123`.
2. **Tenants → Create New Tenant**.
3. Step 1: business name + subdomain. Step 2: pick one of the 12 industries.
4. Click **Create Tenant** — Dexo auto-provisions modules, roles, menus, theme.

### Via API
```bash
# Auth first
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}' | jq -r .accessToken)

# Create + provision a tenant (assigns the SALON_AND_SPA domain)
curl -X POST http://localhost:4000/api/tenants \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"My Beauty Salon","subdomain":"mysalon"}'

curl -X POST http://localhost:4000/api/domains/tenant/{tenantId}/assign/SALON_AND_SPA \
  -H "Authorization: Bearer $TOKEN"
```

### After signup — how to reach a new tenant's website, admin, staff & dashboard

When a tenant is provisioned (via the signup wizard at `:3001` or the API), Dexo
creates the `Tenant` + `TenantLifecycle` + `TenantOnboarding` and returns
`{ tenantId, subdomain, url }`. The `url` is a production-style placeholder
(`https://<slug>.onedexo.com`). **You do NOT get a new port per tenant** — one
app instance serves every tenant; the tenant is selected by hostname (prod) or
`DEV_TENANT` (dev).

**Production — one subdomain per tenant, role paths underneath (one instance,
many tenants):**

| What | URL | Who logs in |
|------|-----|-------------|
| Public website | `https://<slug>.onedexo.com` | (public, no login) |
| Owner / staff admin login + dashboard | `https://<slug>.onedexo.com/admin/login` | owner, manager, trainers/waiters/staff (role-routed to `/admin/dashboard` or `/admin/staff/dashboard`) |
| Customer app | `https://<slug>.onedexo.com/app/login` | members / customers |
| Custom domain | `https://customer.com` (DNS TXT verified) | same as above |

Tenant-admin and tenant-app each run with a Next.js `basePath` (`/admin`,
`/app` — `TENANT_PATH_MODE=true`), so one running process serves every tenant
without a per-tenant subdomain cert (the wildcard cert only covers one
subdomain level, so `admin.<slug>.onedexo.com` is **not** used). A generic,
tenant-less entry point also still works for staff who don't know their
subdomain: `https://admin.onedexo.com/login` (tenant resolved from the
account, since email is globally unique) and
`https://app.onedexo.com/login?tenant=<slug>`.

nginx reads the hostname (and, for the wildcard tenant block, the `/admin` /
`/app` path prefix), sets `X-Tenant-Slug`, and routes to the shared
`tenant-website` / `tenant-admin` / `tenant-app` upstream. See
`/etc/nginx/sites-available/onedexo.conf` on the production host (not checked
into the repo) and `deploy/nginx/dexo.conf` / `infra/nginx/dexo.conf` for
local/legacy reference templates.

**Dev — one tenant per running instance (switch with `DEV_TENANT`):**

You can't use real `*.onedexo.com` subdomains on `localhost`, so the tenant
apps take the active tenant from the `DEV_TENANT` env var (default `vrfitness`).

| What | How to reach it |
|------|-----------------|
| Public website | `set DEV_TENANT=<slug>` then (restart) `npm run dev --workspace=@dexo/tenant-website` → http://localhost:4005 |
| Owner/admin dashboard | http://localhost:4006/login → log in with the owner email → redirects to `/dashboard` |
| Staff dashboard | http://localhost:4006/login → log in with a staff/trainer email → redirects to `/staff/dashboard` |
| Customer app | `set DEV_TENANT=<slug>` then `npm run dev --workspace=@dexo/tenant-app` → http://localhost:4007 |
| Mobile | open the Expo app → pick the tenant from the **searchable dropdown** on the login screen |

Worked example — a brand-new tenant `acme-fitness` whose owner signed up as
`owner@acme.com`:
1. Point the dev apps at it: `set DEV_TENANT=acme-fitness` and restart `:4005 / :4006 / :4007`.
2. http://localhost:4005 → `acme-fitness` public website.
3. http://localhost:4006/login → `owner@acme.com` / their password → `/dashboard` (owner).
4. In that dashboard, add staff → a trainer logs in at `:4006/login` → `/staff/dashboard`.
5. http://localhost:4007 (or mobile with `acme-fitness` selected) → customer/member experience.

> ⚠️ Dev limitation: `apps/tenant-website/app/layout.tsx` maps `DEV_TENANT` →
> domain template via `slugToDomainType()`, which today only knows `vrfitness`
> (FITNESS_CENTER) and `spicegarden` (RESTAURANT_AND_CAFE). Any other slug falls
> back to the FITNESS_CENTER template until you add the mapping (or run the
> tenant on a real subdomain in production).

---

## 🎨 Brand & design system

The full DEXO brand lives in [`brand/`](./brand) (strategy, color, typography, logo, motion,
launch kits). In code it ships as:

- **Tokens** — `packages/ui/src/styles/dexo-brand.css` (`--dx-*` variables, light + dark)
- **Tailwind preset** — `packages/ui/tailwind-preset.js` (v3 apps) / `@theme` blocks (v4 apps)
- **Type stack** — Space Grotesk (display 24px+) · Inter (UI/body) · JetBrains Mono (code/data), via `next/font`
- **Logo** — `DexoLogo` / `DexoMark` from `@dexo/ui`; favicon = `app/icon.svg` in every app

White-labeling: platform apps are always Dexo-branded; tenant apps inherit the foundation and
override **only** the semantic `--dx-primary` token with the tenant's color ("Powered by DEXO"
attribution stays). Rules: [docs/BRAND-GUIDE-FOR-DEVELOPERS.md](./docs/BRAND-GUIDE-FOR-DEVELOPERS.md).
Both guides are also published on the platform site at **http://localhost:3001/docs**.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/BRAND-GUIDE-FOR-DEVELOPERS.md](./docs/BRAND-GUIDE-FOR-DEVELOPERS.md) | Brand rules in code — tokens, platform vs tenant boundary (also at :3001/docs) |
| [docs/DEVELOPER-GUIDE.md](./docs/DEVELOPER-GUIDE.md) | Architecture map, auth, module anatomy, extension recipes (integrations, OTP, new apps, HR module) |
| [DEXO_MASTER_PROMPT_v5.md](./DEXO_MASTER_PROMPT_v5.md) | Master v5 architecture document |
| [RUN_GUIDE_v5.md](./RUN_GUIDE_v5.md) | Full setup + run guide (v5 ports) |
| [CREDENTIALS.md](./CREDENTIALS.md) | Test credentials for every portal |
| [01_MVP_Scope_Product_Definition.md](./01_MVP_Scope_Product_Definition.md) | Product vision and scope |
| [02_Core_Architecture_Decision_Record.md](./02_Core_Architecture_Decision_Record.md) | Architecture decisions |
| [03_Database_Schema_v1.md](./03_Database_Schema_v1.md) | Database design |
| [04_Module_Breakdown.md](./04_Module_Breakdown.md) | Module structure |
| [05_Auth_RBAC_Design.md](./05_Auth_RBAC_Design.md) | Authentication and RBAC |
| [06_API_Design_Conventions.md](./06_API_Design_Conventions.md) | API standards |
| [07_Dev_Environment_Setup.md](./07_Dev_Environment_Setup.md) | Dev environment |
| [08_MVP_Roadmap.md](./08_MVP_Roadmap.md) | MVP roadmap |
| [09_Phase_2_Expansion_Roadmap.md](./09_Phase_2_Expansion_Roadmap.md) | Phase 2 status |
| [FINANCE_MODULE.md](./FINANCE_MODULE.md) | Finance module specification |
| [docs/ECOMMERCE_MODULE.md](./docs/ECOMMERCE_MODULE.md) | Ecommerce vertical — catalog/inventory/cart/checkout/shipments, what's built vs roadmap |
| [docs/RBAC_ARCHITECTURE.md](./docs/RBAC_ARCHITECTURE.md) | Access-control hierarchy (Platform Admin → Tenant Module Override → Plan → Role), gaps and plan |
| [docs/ai/00_AI_MASTER_ARCHITECTURE.md](./docs/ai/00_AI_MASTER_ARCHITECTURE.md) | Dexo AI Platform — TypeScript agent runtime, tool/prompt/agent registries, Fitness reference integration, full built-vs-roadmap table |
| [docs/CUSTOM_DOMAINS.md](./docs/CUSTOM_DOMAINS.md) | Custom domain DNS setup (Namecheap/Hostinger/Mercantile/own VM) + nginx automation |
| [docs/azurevm.md](./docs/azurevm.md) | Azure VM production deployment runbook (DNS, nginx install, SSL, verification/troubleshooting) |
| [docs/EMAIL_SYSTEM.md](./docs/EMAIL_SYSTEM.md) | Global email hierarchy (Tenant → Global → System Default), provider-agnostic, super-admin configurable, no redeploy |
| [docs/CHATWOOT_INTEGRATION.md](./docs/CHATWOOT_INTEGRATION.md) | Self-hosted Chatwoot messaging — two-tier inboxes (customer↔tenant, tenant↔platform), provisioning, widgets |
| [docs/ci_cd.md](./docs/ci_cd.md) | CI/CD pipeline — GitHub Actions typecheck/build/migrations → automated PM2/SSH deploy to the Azure VM |
| [REMAINING_WORK.md](./REMAINING_WORK.md) | Session-by-session audit of what's done vs open across the whole platform |
| [todo.md](./todo.md) | Longer-horizon feature backlog (incl. planned Asset Management module) |

---

## 🛑 Stop everything

```bash
# Windows — stops all Dexo node apps and frees the locked ports
#   (Docker services keep running so you don't lose data)
stop.bat

# Linux/macOS
./stop.sh        # stops all Dexo node apps, frees the locked ports
                 # (Docker services keep running so you don't lose data)

# To also stop the Docker infra services:
docker stop dexo-postgres dexo-redis dexo-minio dexo-mailhog
```

---

## 🙏 Credits & Third-Party Software

OneDexo builds on and integrates with the following open-source projects:

- **[Chatwoot](https://github.com/chatwoot/chatwoot)** (AGPL-3.0) — self-hosted
  multi-tenant customer messaging, integrated as its own service and embedded
  via its widget SDK. Not modified or redistributed as part of this codebase
  — see [docs/CHATWOOT_INTEGRATION.md](./docs/CHATWOOT_INTEGRATION.md) and
  `docker-compose.chatwoot.yml`. All credit for Chatwoot itself to its
  authors and contributors.

---

## 📄 License

Proprietary and Confidential © Dexo Platform Team.

---

**Version:** v5.0 · **Status:** Core platform complete · **Last updated:** 2026-07-11