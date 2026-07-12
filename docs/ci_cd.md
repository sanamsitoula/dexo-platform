# CI/CD Pipeline — OneDexo

**Repo:** github.com/sanamsitoula/dexo-platform
**Prod:** `onedexo.com` on a single Azure VM, DNS/proxy via Cloudflare, nginx
routes host-based traffic to 6 Node processes managed by PM2 (see
`infra/nginx/dexo.conf`, `docs/azurevm.md`).

Status: **CI (typecheck/build/migration-check) already existed
(`.github/workflows/ci.yml`). This adds the missing CD half** — an automated
`deploy` job plus the PM2 process list and deploy script it runs on the VM.
Nothing here needs a container registry, Kubernetes, or Azure App
Service — it deploys the same way `docs/azurevm.md` describes running the
platform, just automated over SSH instead of by hand.

## Pipeline overview

```
git push origin main
        │
        ▼
┌───────────────────────────── GitHub Actions ─────────────────────────────┐
│  typecheck  ──▶  build  ──┐                                              │
│  migrations (ephemeral PG)─┴──▶  deploy  (only on main, only if all pass) │
└────────────────────────────────────────────────────────────────────────┘
        │  SSH (appleboy/ssh-action)
        ▼
┌──────────────────────── Azure VM (/var/www/dexo-platform) ───────────────┐
│  scripts/deploy.sh:                                                      │
│    git fetch + reset --hard origin/main                                  │
│    npm ci                                                                │
│    npx prisma generate && npx prisma migrate deploy                      │
│    npm run build   (turbo run build — all 7 workspaces)                  │
│    pm2 reload ecosystem.config.js   (zero-downtime restart)              │
└────────────────────────────────────────────────────────────────────────┘
```

- **Pull requests** run `typecheck` + `build` + `migrations` only — no deploy.
  This is the existing behavior in `ci.yml`, unchanged.
- **Pushes to `main`** run the same three jobs, and only if *all three* pass
  does `deploy` run. A red PR check or a broken migration blocks production
  automatically — there's no path where a failing build reaches the VM.
- **Every other branch** never triggers `deploy` (the job condition checks
  both the ref and that it's a `push` event, so PR runs against `main` don't
  accidentally deploy either).

## What runs on the VM: `scripts/deploy.sh`

```bash
scripts/deploy.sh
```

Idempotent — safe to re-run by hand for a manual redeploy or rollback check.
It does a hard reset to `origin/main` (not a merge), so the VM's checkout is
always byte-identical to what's on GitHub — no drift from manual edits on the
box. `pm2 reload` (not `restart`) does a zero-downtime reload for processes
that support it (Node's cluster mode under the hood), so a deploy doesn't
drop in-flight requests.

## What runs in production: `ecosystem.config.js`

A PM2 process list, one entry per app, matching the port map already fixed
in `run.sh` / `infra/nginx/dexo.conf`:

| PM2 process | Port | Workspace |
|---|---|---|
| `dexo-api` | 4000 | `@dexo/api` |
| `dexo-platform-web` | 3001 | `@dexo/platform-web` |
| `dexo-platform-admin` | 3002 | `@dexo/platform-admin` |
| `dexo-tenant-website` | 4005 | `@dexo/tenant-website` |
| `dexo-tenant-admin` | 4006 | `@dexo/tenant-admin` |
| `dexo-tenant-app` | 4007 | `@dexo/tenant-app` |

`apps/mobile` is deliberately not in this list — it's an Expo app shipped via
EAS Build/Submit to app stores, not an nginx-fronted server process.

## One-time setup

### 1. Prepare the VM

Follow `docs/azurevm.md` through nginx + SSL first (DNS, nginx install,
certs) — this pipeline assumes the VM already serves traffic manually and
just automates redeploys of code that's already running there.

Before the first build, make sure `.env` on the VM sets
`NEXT_PUBLIC_API_URL` to the real public API domain (e.g.
`https://api.onedexo.com`, matching `infra/nginx/dexo.conf`'s `api.`
server block) — see `.env.example`. This gets baked into every
frontend's browser bundle **at build time**, not read at runtime, so
if it's missing at this point every browser ends up calling
`http://localhost:4000` (the visitor's own machine) instead of your
API, with no build error to warn you.

```bash
# On the VM, once:
sudo npm install -g pm2
cd /var/www/dexo-platform      # or wherever you cloned the repo
git checkout main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup                    # prints a systemd command — run it so PM2
                                # survives a VM reboot
```

### 2. Create a deploy SSH key

On your own machine (not the VM):
```bash
ssh-keygen -t ed25519 -f deploy_key -C "github-actions-deploy" -N ""
```


Append `deploy_key.pub` to `~/.ssh/authorized_keys` for the deploy user on
the VM. Keep `deploy_key` (the private half) — it goes into a GitHub secret
next, never into the repo.

### 3. GitHub repo secrets

**Settings → Environments → New environment → `production`**, then add these
as *environment secrets* on `production` (scoping to an environment, rather
than repo-wide secrets, means you can later add required reviewers/approval
gates on production deploys without touching the workflow):

| Secret | Value |
|---|---|
| `AZURE_VM_HOST` | VM's public IP or `onedexo.com` |
| `AZURE_VM_USER` | SSH user (deploy user, not root) |
| `AZURE_VM_SSH_KEY` | contents of `deploy_key` (private key) |
| `AZURE_VM_SSH_PORT` | usually `22` |

Nothing else needs a GitHub secret — the VM already holds its own `.env`
(with the real Brevo SMTP key, JWT secrets, etc., per `.env.example`'s
warning); the deploy step only ever pulls code, it never touches `.env`.

### 4. Confirm the deploy path matches

`ci.yml`'s deploy step and `scripts/deploy.sh`'s default both assume the repo
lives at `/var/www/dexo-platform` on the VM. If yours is elsewhere, either
move it there or override both: the workflow's `script:` line and
`DEXO_DEPLOY_PATH` env var read by `deploy.sh`.

## Verifying a deploy

```bash
# From GitHub: Actions tab → latest run on main → deploy job logs
# From the VM directly:
pm2 status                 # all 6 processes should show "online"
pm2 logs dexo-api --lines 50
curl -sI http://127.0.0.1:4000        # confirm the API is actually listening
```

If `deploy` succeeds in Actions but the site still looks stale, it's almost
always a browser/CDN cache — Cloudflare's proxy caches static assets; a
purge (`Cloudflare dashboard → Caching → Purge Everything`) rules that out.

## Rollback

Because `deploy.sh` does `git reset --hard origin/<branch>`, rolling back is
reverting `main` and letting the pipeline redeploy — no separate rollback
tooling needed:

```bash
git revert <bad-commit>          # preferred: keeps history linear and honest
git push origin main             # triggers the same pipeline, deploys the revert
```

For a faster stop-the-bleeding rollback without waiting on CI, run
`scripts/deploy.sh` by hand on the VM after manually resetting to the last
good commit — but prefer `git revert` + push so the fix is recorded in
history and the next automated deploy doesn't reintroduce the bug.

## Explicitly not built (roadmap)

- **Staging environment.** Everything above deploys straight to production
  on merge to `main`. A `staging` branch + a second VM (or a second PM2
  process set on the same VM, different ports) would need its own
  `environment:` block and secrets, mirroring this one.
- **Approval gate before production deploy.** GitHub Environments support
  required reviewers — not configured here; add it under
  **Settings → Environments → production → Required reviewers** if you want
  a manual "approve to deploy" click.
- **Blue/green or canary deploys.** `pm2 reload` is zero-downtime for a
  single VM but is not a full blue/green setup (no separate old/new
  environment to compare against before cutting over).
- **Automatic rollback on failed health check.** `deploy.sh` doesn't curl the
  app after restart and auto-revert if it's down; failures currently need a
  human to notice and run `git revert`.
- **Database migration safety gate.** `migrate deploy` runs unconditionally
  in `deploy.sh` — a destructive/irreversible migration would apply on
  deploy same as any other. Review migrations in PR the same way you'd
  review any other change; there's no separate "pause before migrating"
  step.
