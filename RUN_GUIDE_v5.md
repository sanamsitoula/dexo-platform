# Dexo Platform v5 — Setup & Run Guide

**Locked port map** (v5.0):

```
:3001  apps/platform-web       Platform marketing + sign-up
:3002  apps/platform-admin     Platform staff panel
:4000  apps/api                Shared API
:4005  apps/tenant-website     Tenant public website
:4006  apps/tenant-admin       Tenant owner + staff portal
:4007  apps/tenant-app         Tenant customer-facing app
:8081  apps/mobile             Expo mobile
:5433  PostgreSQL  (Docker, or :5432 if Windows native occupies 5433)
:6379  Redis
:9000  MinIO
:8025  MailHog
```

---

## 1. Prerequisites

- **Node.js** >= 18.0.0
- **Docker Desktop** running
- **npm** >= 9.0.0

## 2. First-time setup

```bash
# Install dependencies
npm install

# Start Docker services (postgres, redis, minio, mailhog)
docker-compose up -d

# Wait ~5s for postgres to be ready
# If port 5433 is occupied by native Windows Postgres, edit .env DATABASE_URL to use 5432
# Otherwise keep 5433 (the v5 spec default)

# Run Prisma migrations (creates all tables including v5 models)
npx prisma migrate dev --name "v5-phase1"

# Generate Prisma client
npx prisma generate

# Seed all v5 data (12 BusinessTypeTemplate, 2 demo tenants, etc.)
npm run db:seed
```

## 3. Start the dev environment

```bash
# Windows
run.bat

# Linux/macOS
./run.sh
```

This starts:
1. Docker services (Postgres, Redis, MinIO, MailHog)
2. Demo user seed (admin@test.com / Admin@123)
3. API server on :4000
4. Platform Web (marketing + signup) on :3001
5. Platform Admin (staff panel) on :3002
6. Tenant Website (public, defaults to vrfitness) on :4005
7. Tenant Admin (owner/staff) on :4006
8. Tenant App (customer, bottom nav) on :4007
9. Mobile (Expo) on :8081

## 4. Dev tenant switching

The default dev tenant is `vrfitness`. To switch to `spicegarden` or any other tenant:

**Option A — env var** (restart required):
```bash
DEV_TENANT=spicegarden npm run dev:tenant-website
```

**Option B — X-Dev-Tenant header** (no restart):
The frontend reads `x-dev-tenant` from the request headers (set by NGINX in production).

**Option C — hostname** (production):
- `vrfitness.localhost` → tenant vrfitness
- `spicegarden.localhost` → tenant spicegarden
- `admin.vrfitness.localhost` → vrfitness admin
- `portal.vrfitness.localhost` → vrfitness customer app

Add to `C:\Windows\System32\drivers\etc\hosts` (run as Administrator):
```
127.0.0.1  vrfitness.localhost admin.vrfitness.localhost portal.vrfitness.localhost
127.0.0.1  spicegarden.localhost admin.spicegarden.localhost portal.spicegarden.localhost
```

## 5. Demo Credentials

### Platform layer
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Platform admin | admin@test.com | Admin@123 | http://localhost:3002 |

### FITNESS_CENTER (VR Fitness Center — vrfitness)
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Owner | admin@vrfitness.com | Admin123! | http://localhost:4006 |
| Manager | manager@vrfitness.com | Manager123! | http://localhost:4006 |
| Trainer | trainer1@vrfitness.com | Trainer123! | http://localhost:4006 |
| Customer | member1@vrfitness.com | Member123! | http://localhost:4007 |

### RESTAURANT_AND_CAFE (Spice Garden — spicegarden)
| Role | Email | Password | URL |
|------|-------|----------|-----|
| Owner | admin@spicegarden.com | Admin123! | http://localhost:4006 |
| Manager | manager@spicegarden.com | Manager123! | http://localhost:4006 |
| Staff | waiter1@spicegarden.com | Staff123! | http://localhost:4006 |

## 6. Smoke tests

With the API running on :4000:

```bash
npx ts-node --transpile-only scripts/smoke-tests.ts
```

Verifies:
- Tenant creation returns subdomain URL
- Slug validation (taken / reserved / available)
- Suspend → reactivate → delete → cancel-delete flow
- Custom domain DNS instructions
- BusinessTypeTemplate has 12 records
- Seed tenants are ACTIVE
- Health endpoint reports db up

## 7. Useful endpoints

**Public:**
- `GET /api/health` — health check
- `GET /api/business-templates` — 12 industry templates
- `GET /api/business-templates/:type` — one template
- `GET /api/tenants/check-slug?slug=X` — slug availability
- `POST /api/tenants` — create + provision tenant

**Tenant lifecycle (auth required):**
- `GET /api/tenants/:id/lifecycle` — full state
- `POST /api/tenants/:id/lifecycle/suspend` — `{reason, suspendedBy}`
- `POST /api/tenants/:id/lifecycle/reactivate` — `{reactivatedBy}`
- `POST /api/tenants/:id/lifecycle/archive` — `{archivedBy}`
- `POST /api/tenants/:id/lifecycle/delete` — `{requestedBy}` (30d grace)
- `POST /api/tenants/:id/lifecycle/cancel-delete` — restore to SUSPENDED
- `POST /api/tenants/:id/domain/request` — `{domain}` returns DNS TXT
- `POST /api/tenants/:id/domain/verify` — checks DNS
- `GET /api/tenants/:id/domain/status` — domain + SSL status

**Onboarding:**
- `GET /api/onboarding/tenant?tenantId=X` — get state
- `PUT /api/onboarding/tenant/step/:n` — `{tenantId, data}` save step
- `POST /api/onboarding/tenant/complete` — `{tenantId}` finalize
- `POST /api/onboarding/customer/start` — `{tenantId, email, source}`
- `GET /api/onboarding/customer/:id` — get progress
- `PUT /api/onboarding/customer/:id/step/:n` — `{data}` save
- `POST /api/onboarding/customer/:id/complete` — `{userId?}` finalize

## 8. Database connection troubleshooting

**Issue:** `P1000: Authentication failed`
- Windows native Postgres may be on port 5432. Move docker container to 5433:
  ```bash
  docker stop dexo_postgres && docker rm dexo_postgres
  docker run -d --name dexo_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dexo -p 5433:5432 postgres:15-alpine
  ```
- Update `.env`: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/dexo?schema=public`

**Issue:** `Can't reach database server at localhost:5433`
- Container not running: `docker ps` → check `dexo_postgres` is Up
- Restart: `docker restart dexo_postgres`

**Issue:** `Unknown argument` Prisma errors
- Run `npx prisma generate` to refresh the client

## 9. Stop all services

```bash
# Windows
stop-all.bat

# Or manually
docker stop dexo_postgres dexo_redis dexo_minio dexo_mailhog
# Kill all node processes on the v5 ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4005 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4006 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4007 "') do taskkill /PID %%a /F
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081 "') do taskkill /PID %%a /F
```

## 10. Mobile (Expo)

```bash
# Start Expo dev server (port 8081)
npm run dev:mobile

# On your phone:
# 1. Install "Expo Go" from App Store / Play Store
# 2. Make sure phone is on the same WiFi as this PC
# 3. Open Expo Go and scan the QR code shown in the mobile window
# 4. Update DEV_HOST in apps/mobile/lib/api.ts to your PC's IP
```
