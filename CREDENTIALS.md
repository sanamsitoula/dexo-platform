# 🔐 Dexo Test Credentials Reference

All credentials below are seeded by the v5 seed pipeline
(`npm run db:seed:v5`, which runs `scripts/seed/index.ts`). They are **demo
credentials for local development only** — never deploy them to production.

---

## TL;DR — the one you'll use most

| Layer          | URL                       | Email              | Password    |
|----------------|---------------------------|--------------------|-------------|
| Platform Admin | http://localhost:3002     | `admin@test.com`   | `Admin@123` |
| Fitness Owner  | http://localhost:4006     | `admin@vrfitness.com` | `Admin123!` |
| Fitness Member | http://localhost:4007     | `member1@vrfitness.com` | `Member123!` |

---

## 1. Platform layer

The platform admin manages all tenants, plans, and domain templates.
Log in at the **Platform Admin** panel.

| App               | URL                   | Email            | Password    |
|-------------------|-----------------------|------------------|-------------|
| Platform Admin    | http://localhost:3002 | `admin@test.com` | `Admin@123` |
| Platform Web (sign-up + marketing) | http://localhost:3001 | `admin@test.com` | `Admin@123` |

---

## 2. FITNESS_CENTER tenant — subdomain `vrfitness`

Seeded by `scripts/seed/03-tenants/fitness-center.ts`.

### 2a. Tenant Admin Portal — http://localhost:4006 (owner + staff)
| Role     | Email                       | Password      |
|----------|-----------------------------|---------------|
| Owner    | `admin@vrfitness.com`       | `Admin123!`   |
| Manager  | `manager@vrfitness.com`     | `Manager123!` |
| Trainer  | `trainer1@vrfitness.com`    | `Trainer123!` |
| Trainer  | `trainer2@vrfitness.com`    | `Trainer123!` |

### 2b. Tenant Customer App — http://localhost:4007 (members)
| Role   | Email                      | Password     |
|--------|----------------------------|--------------|
| Member | `member1@vrfitness.com`    | `Member123!` |
| Member | `member2@vrfitness.com`    | `Member123!` |

### 2c. Tenant Website (public) — http://localhost:4005
No login required — this is the tenant's public marketing site. The tenant is
selected via `DEV_TENANT=vrfitness` (default) or the `X-Dev-Tenant` header.

---

## 3. RESTAURANT_AND_CAFE tenant — subdomain `spicegarden`

Seeded by `scripts/seed/03-tenants/restaurant.ts`.

### 3a. Tenant Admin Portal — http://localhost:4006
> Switch the portal to this tenant first: `DEV_TENANT=spicegarden npm run
> dev --workspace=@dexo/tenant-admin`

| Role    | Email                        | Password      |
|---------|------------------------------|---------------|
| Owner   | `admin@spicegarden.com`      | `Admin123!`   |
| Manager | `manager@spicegarden.com`    | `Manager123!` |
| Staff   | `waiter1@spicegarden.com`    | `Staff123!`   |
| Kitchen | `chef@spicegarden.com`        | `Staff123!`   |

### 3b. Tenant Customer App — http://localhost:4007
> Switch: `DEV_TENANT=spicegarden npm run dev --workspace=@dexo/tenant-app`
Restaurant customers are walk-in — no seeded customer logins for this tenant.

---

## 4. Mobile app (Expo) — http://localhost:8081

The mobile app reuses the same login API as the web apps. Use any of the
tenant user credentials above (e.g. `member1@vrfitness.com` / `Member123!`).
Scan the QR code shown in the terminal with the Expo Go app on your phone
(ensure your phone is on the same WiFi as the dev machine).

---

## 5. API + Swagger — http://localhost:4000

- **Swagger UI:** http://localhost:4000/api/docs (no login — interactive docs)
- **API base:** http://localhost:4000/api

Get a JWT to call protected endpoints:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}'
# → { "accessToken": "eyJ...", "refreshToken": "..." }
```

---

## 6. Infrastructure service consoles

| Service     | URL                     | Username        | Password        |
|-------------|-------------------------|-----------------|-----------------|
| PostgreSQL  | localhost:5433 / db `dexo_db` | `postgres` | `postgres`      |
| Redis       | localhost:6379          | (no auth)       | (no auth)       |
| MinIO S3    | http://localhost:9001   | `minioadmin`    | `minioadmin`    |
| MailHog     | http://localhost:8025   | (no auth)       | (no auth)       |

---

## 🔁 Reseeding the database

If logins stop working or you want a clean slate:
```bash
npm run db:seed:clean     # wipe all seeded data
npm run db:seed:v5        # reseed platform + 12 domains + 2 demo tenants
```
The v5 pipeline is idempotent, so you can also just re-run
`npm run db:seed:v5` without cleaning first.

---

## ⚠️ Notes

- These credentials are created by `scripts/seed/00-platform.ts` and the
  `03-tenants/*.ts` seeders. Changing a password in the DB will be overwritten
  on the next seed run.
- The legacy root-level seed scripts (`seed-demo-users.ts`,
  `seed-fitness-center-runner.ts`, `seed-branches-and-oauth.ts`,
  `seed-platform-admin.ts`) still exist for backward compatibility. The v5
  pipeline (`scripts/seed/index.ts`) is the canonical one — prefer
  `npm run db:seed:v5`.
- Never commit real secrets. `.env` and `.env.*` (except `.env.example`) are
  gitignored.

For full setup instructions see [RUN_GUIDE_v5.md](./RUN_GUIDE_v5.md) and the
[README](./README.md#-modular-setup-manual-step-by-step).