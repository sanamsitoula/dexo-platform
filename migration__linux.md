# Dexo Platform — Linux Migration & Setup Guide

Complete plan to take Dexo from the git URL to a fully running stack on a fresh
Linux machine (Ubuntu/Debian shown; any distro with Docker + Node 20 works),
then share it publicly through ngrok.

Repo: **https://github.com/sanamsitoula/dexo-platform.git**
Companion docs: [docs/LOCAL-DEV-URLS.md](./docs/LOCAL-DEV-URLS.md) (URLs/nginx/ngrok details),
[README.md](./README.md) (port map, credentials), [docs/DEVELOPER-GUIDE.md](./docs/DEVELOPER-GUIDE.md).

---

## Phase 0 — What you're standing up

| Port | Service |
|---|---|
| 3001 | Platform web (marketing + signup) |
| 3002 | Platform admin |
| 4000 | API (NestJS) — Swagger at `/api/docs` |
| 4005 | Tenant public website |
| 4006 | Tenant admin portal |
| 4007 | Tenant customer app |
| 5433 | PostgreSQL 16 (Docker) |
| 6379 / 9000 / 8025 | Redis / MinIO / MailHog (Docker) |

## Phase 1 — Prerequisites

```bash
sudo apt update && sudo apt install -y git curl build-essential

# Node.js 20 LTS (repo requires >= 18)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x

# Docker Engine + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker            # or log out/in
docker compose version

# ngrok (for public URLs)
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install -y ngrok
ngrok config add-authtoken <YOUR_NGROK_TOKEN>   # token from dashboard.ngrok.com
```

## Phase 2 — Clone & configure

```bash
git clone https://github.com/sanamsitoula/dexo-platform.git
cd dexo-platform

cp .env.example .env       # matches docker-compose.yml out of the box
npm install                # installs every workspace (root + apps + packages)
```

`.env` values worth knowing (defaults already correct for this setup):

| Var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/dexo` | Docker Postgres (host port **5433**) |
| `SMTP_HOST/PORT` | `localhost:1025` | MailHog — all dev email lands at http://localhost:8025 |
| `ZK_MOCK` | `true` | Biometric attendance puller uses sample punches (no hardware) |
| `FRONTEND_URL` | `http://localhost:3001` | Target of password-reset email links |
| `ANTHROPIC_API_KEY` | empty | Empty = rule-based AI plan fallback (works offline) |

## Phase 3 — One-command run

```bash
chmod +x run.sh
./run.sh
```

`run.sh` does, in order: dependency check → `.env` fallback →
`docker compose up -d postgres redis minio mailhog` → waits for `pg_isready` →
`prisma generate` + `prisma migrate deploy` → `npm run db:seed:v5`
(idempotent demo data: `vrfitness` gym + `spicegarden` restaurant, ≥10 rows in
every fitness table, eSewa sandbox, demo ZKTeco device) → `turbo run dev`
(all apps in parallel).

### Manual equivalent (if you prefer step-by-step)

```bash
docker compose up -d postgres redis minio mailhog
until docker exec dexo-postgres pg_isready -U postgres; do sleep 2; done
npx prisma generate
npx prisma migrate deploy
npm run db:seed:v5
npm run dev            # turbo starts every app; or run per app:
# (cd apps/api && npm run dev)          # ts-node — do NOT use `nest start` (monorepo rootDir)
# (cd apps/platform-web && npm run dev) # etc.
```

## Phase 4 — Verify

```bash
curl -s http://localhost:4000/api/health          # {"status":"ok",...}
npm run db:verify:fitness                          # all fitness tables >= 10 rows
```

Then in a browser (credentials: [CREDENTIALS.md](./CREDENTIALS.md)):
- http://localhost:3002 — platform admin (`admin@test.com` / `Admin@123`)
- http://vrfitness.localhost:4006 — tenant admin (`admin@vrfitness.com` / `Admin123!`)
- http://vrfitness.localhost:4007 — customer app (`member1@vrfitness.com` / `Member123!`)
- http://localhost:8025 — MailHog (welcome/reset emails)
- http://localhost:3001/docs — brand & developer docs

Any `*.localhost` subdomain resolves to 127.0.0.1 automatically — no hosts-file
edits needed for multi-tenant testing.

## Phase 5 — Public URLs with ngrok

A free ngrok URL is a **single hostname**, so tenant subdomains can't pass
through the tunnel. Dexo is tunnel-aware: tenant apps never mistake the ngrok
label for a tenant, and `?tenant=<slug>` pins a tenant via cookie.

**Option A — share one app (simplest):**
```bash
ngrok http 4007
# open  https://<id>.ngrok-free.app/?tenant=vrfitness
```

**Option B — expose the API (mobile apps, payment callbacks, webhooks):**
```bash
ngrok http 4000
# then start the frontend with:
# NEXT_PUBLIC_API_URL=https://<id>.ngrok-free.app npm run dev
```

**Option C — everything behind one tunnel via nginx (production-style):**
```bash
sudo apt install -y nginx
sudo cp deploy/nginx/dexo.conf /etc/nginx/sites-available/dexo.conf
sudo ln -s /etc/nginx/sites-available/dexo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
ngrok http 80
```
nginx routes by hostname (`dexo.com`, `admin.dexo.com`, `api.dexo.com`,
`<tenant>.dexo.com`, `admin.<tenant>.`, `portal.<tenant>.` — see
[deploy/nginx/dexo.conf](./deploy/nginx/dexo.conf)); through the free tunnel
use `?tenant=` on tenant apps. A paid ngrok wildcard domain restores full
subdomain routing. Details: [docs/LOCAL-DEV-URLS.md](./docs/LOCAL-DEV-URLS.md).

## Phase 6 — Keep it running (optional, server-style)

```bash
sudo npm install -g pm2
pm2 start "npm run dev" --name dexo --cwd ~/dexo-platform
pm2 start "ngrok http 80 --log stdout" --name ngrok
pm2 save && pm2 startup     # survive reboots
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `P1001: Can't reach database` | Postgres not up / wrong port — `docker ps`, confirm `dexo-postgres` maps **5433→5432**, `DATABASE_URL` uses 5433 |
| Port already in use | `run.sh` clears app ports; otherwise `lsof -ti tcp:<port> \| xargs kill -9` |
| `Cannot find module './NNN.js'` in a Next app | Stale build cache: stop that app, `rm -rf apps/<app>/.next`, restart |
| `nest start` fails with rootDir TS errors | Expected — the API runs via `npm run dev` (`ts-node --transpile-only`) |
| `prisma migrate dev` says non-interactive | Use `npx prisma migrate deploy` (and `migrate diff` to author new migrations) |
| Emails not arriving | They're in MailHog: http://localhost:8025 (dev never sends real email unless a tenant SMTP is configured) |
| ngrok shows wrong tenant | Open `https://<id>.ngrok-free.app/?tenant=<slug>` once to pin the cookie |
| Docker permission denied | `sudo usermod -aG docker $USER` then re-login |
