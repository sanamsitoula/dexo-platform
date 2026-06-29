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
Starts PostgreSQL, Redis, MinIO (S3), and MailHog.
```bash
docker-compose up -d
# verify: docker ps   (dexo_postgres, dexo_redis, dexo_minio, dexo_mailhog should be Up)
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dexo_db
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
| Postgres | jdbc:postgresql://localhost:5433/dexo_db | `postgres` | `postgres` |

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

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
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

---

## 🛑 Stop everything

```bash
# Windows
stop-all.bat
# Or: docker stop dexo_postgres dexo_redis dexo_minio dexo_mailhog

# Linux/macOS
./stop-all.sh    # if present, otherwise stop node + docker manually
```

---

## 📄 License

Proprietary and Confidential © Dexo Platform Team.

---

**Version:** v5.0 · **Status:** Core platform complete · **Last updated:** 2026-06-29