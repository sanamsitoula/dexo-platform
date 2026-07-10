# AGENTS.md

Guidance for AI agents (and humans) working in the Dexo Platform monorepo.

## What this is

Dexo is a domain-driven multi-tenant SaaS platform. One codebase transforms into
12 industries (Fitness, Salon, Restaurant, Hotel, etc.) via domain types assigned
at tenant onboarding. Backend = NestJS modular monolith; frontends = Next.js +
Expo; DB = PostgreSQL via Prisma.

## Repository layout

```
apps/
  api/              NestJS shared backend (:4000) — Swagger at /api/docs
  platform-web/     Platform marketing + tenant sign-up (:3001)
  platform-admin/   Platform staff panel (:3002)
  tenant-website/   Per-tenant public website (:4005)
  tenant-admin/     Per-tenant owner + staff portal (:4006)
  tenant-app/       Per-tenant customer-facing web app (:4007)
  mobile/           Expo / React Native app (:8081)
packages/           Shared NestJS modules (@dexo/auth, @dexo/tenant, @dexo/user, ...)
prisma/             schema.prisma + migrations + seed pipeline
scripts/            seed pipeline, start-app.ps1, view-log.ps1, dev helpers
docs/               Design + deployment docs
```

## Locked port map (do not change)

| Port  | Service |
|-------|---------|
| 3001  | platform-web |
| 3002  | platform-admin |
| 4000  | api |
| 4005  | tenant-website |
| 4006  | tenant-admin |
| 4007  | tenant-app |
| 8081  | mobile (Expo) |
| 5433  | PostgreSQL (host port; container is 5432) |
| 6379  | Redis |
| 9000/9001 | MinIO (S3 / console) |
| 8025  | MailHog |

DB name is `dexo` (NOT `dexo_dev` / `dexo_db`). Postgres on host **5433** to avoid
clashing with native Windows installs.

## Essential commands

```bash
# Run everything (Windows) — starts Docker + API + all apps, hidden, with logs
run.bat
# Stop everything (frees ports, keeps Docker data)
stop.bat

# Individual apps (from repo root)
npm run dev:api              # api on :4000
npm run dev:admin            # platform-admin on :3002
npm run dev:web              # platform-web on :3001
npm run dev:tenant-admin     # :4006
npm run dev:tenant-website   # :4005
npm run dev:tenant-app       # :4007
npm run dev:mobile           # Expo on :8081

# Database
npm run db:generate          # prisma generate
npm run db:migrate           # prisma migrate dev
npm run db:push              # prisma db push (skip migrations)
npm run db:seed:v5           # idempotent v5 seed (platform admin + 2 tenants)
npm run db:seed:clean        # wipe + reseed
npm run db:studio            # prisma studio

# Quality
npm run lint
npm run type-check
npm run test                 # jest across workspaces (turbo)
```

**IMPORTANT — port conflicts:** never run `npm run dev` in an app folder while
`run.bat` services are already on those ports (you'll get `EADDRINUSE`). Run
`stop.bat` first, then start individual apps. The run.bat apps run in HIDDEN
windows — check `netstat -aon | findstr :4000` to see what's listening.

## Logs

Every app logs to `logs/<service>/<service>-<timestamp>.log.{out,err}`.
Tail live: `powershell -ExecutionPolicy Bypass -File scripts/view-log.ps1 api`
(add `-Err` for the error stream). The orchestrator log is
`logs/orchestrator/orchestrator-<timestamp>.log`.

From Git Bash / MINGW64, use **forward slashes** in `-File` paths
(`scripts/view-log.ps1`) — backslashes get eaten by the shell.

## Conventions

- **TypeScript everywhere.** NestJS backend, Next.js/Expo frontends.
- **No comments** unless explicitly requested — keep code self-documenting.
- **Mimic existing patterns.** Before adding a module, read a neighboring one
  (e.g. `apps/api/src/modules/finance/` for finance, `.../fitness/` for fitness).
- **Backend modules** live in `apps/api/src/modules/<name>/` and register in
  `apps/api/src/app.module.ts`. Shared logic goes in `packages/<name>/`.
- **Tenant scoping:** every tenant-scoped service reads `req.user.tenantId`.
  Never trust client-supplied tenantId.
- **Auth:** `@UseGuards(JwtAuthGuard)` + roles. See `packages/auth`.
- **Finance/accounting** = Nepal context: NPR, VAT 13%, TDS, CBMS, IRD electronic
  billing, fiscal years like "2081/82". "NFRS" in this repo = Nepal Financial
  Reporting Standards (accounting), NOT non-functional requirements.

## Verification checklist before declaring done

1. `npm run type-check` passes (or `npx tsc --noEmit` in the changed workspace).
2. `npm run lint` passes for changed workspaces.
3. If backend changed: API still boots (`curl http://localhost:4000/api/health`).
4. If schema changed: `npx prisma validate` + `npx prisma generate` succeed.
5. Don't commit unless explicitly asked. Don't update git config or force-push.

## Known gotchas

- **`@dexo/finance` package is dormant** — it has richer invoice/IRD/CBMS logic
  than the active `apps/api/src/modules/finance/` but is NOT wired into
  `app.module.ts`. Check both before assuming a feature exists.
- **GL auto-posting is missing** — invoices/payments don't yet create
  `JournalEntry` rows, so trial balance / balance sheet show no data until you
  post manual journal entries.
- **`slugToDomainType()`** in tenant apps only knows `vrfitness` + `spicegarden`;
  other slugs fall back to FITNESS_CENTER in dev.
- **Two mobile data paths:** `fitnessApi` (real `/fitness/*`) vs the stub
  `mobile-app.controller.ts` (sample data). Prefer `fitnessApi`.
