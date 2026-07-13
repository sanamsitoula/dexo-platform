# OneDexo — Azure VM Production Deployment Runbook

This is the missing piece behind the "admin/portal always redirects" problem:
`infra/nginx/dexo.conf` only takes effect once it's actually **installed and
reloaded** on the VM. If you haven't run the install steps below (or nginx
isn't running at all), every request — including `admin.<tenant>.onedexo.com`
— falls through to whatever default web server/redirect the VM had before,
which is exactly the symptom reported ("always redirected").

## 0. First, fix the immediate URL mistake

Tenant Admin is **subdomain-routed**, not path-routed:

- ❌ `subhangym.onedexo.com/admin` — this hits the tenant **website** app
  (no `/admin` route exists there → 404/fallback, easy to mistake for "redirected").
- ✅ `admin.subhangym.onedexo.com` — this is the actual Tenant Admin console.
- ✅ `portal.subhangym.onedexo.com` — the customer app (member portal).

If you type the subdomain form and it *still* redirects/fails, it's the
nginx-not-deployed issue below.

## 1. Prerequisites

- Azure VM (Ubuntu 22.04+ recommended), public IP, ports 80/443 open in the
  Network Security Group.
- Node.js 18+, npm 9+, PostgreSQL, PM2 (or your process manager of choice)
  already running the 7 apps (see `run.sh`) on their fixed ports:

| App | Port |
|---|---|
| API | 4000 |
| Platform Web | 3001 |
| Platform Admin | 3002 |
| Tenant Website | 4005 |
| Tenant Admin | 4006 |
| Tenant App (portal) | 4007 |

Verify they're actually listening **before** touching nginx:
```bash
for p in 4000 3001 3002 4005 4006 4007; do
  curl -s -o /dev/null -w "port $p: %{http_code}\n" http://127.0.0.1:$p
done
```
If any port doesn't respond, fix that first — nginx forwarding to a dead
port also looks like "redirects to nowhere."

## 2. DNS

At your DNS provider (Cloudflare recommended — it can wildcard-proxy
multi-level subdomains):

```
onedexo.com            A      <VM public IP>
*.onedexo.com          A      <VM public IP>   (covers <tenant>.onedexo.com)
admin.onedexo.com      A      <VM public IP>
api.onedexo.com        A      <VM public IP>
```

`*.onedexo.com` only covers **one** level (`<tenant>.onedexo.com`). Two-level
hosts (`admin.<tenant>.onedexo.com`, `portal.<tenant>.onedexo.com`) need
either:
- **Cloudflare proxied (orange-cloud) DNS** — a single `*.onedexo.com`
  wildcard, proxied, actually resolves `admin.subhangym.onedexo.com` too
  (Cloudflare handles the multi-level match at their edge), **or**
- explicit records per level: `*.onedexo.com` AND `admin.*.onedexo.com` /
  `portal.*.onedexo.com` — most DNS providers don't support double-wildcards,
  so Cloudflare proxy is the practical path.

Verify DNS is actually resolving to your VM before debugging nginx:
```bash
dig +short admin.subhangym.onedexo.com
dig +short subhangym.onedexo.com
# both should print your VM's public IP
```
If these print nothing (or a different IP), the problem is DNS, not nginx —
fix DNS first, nginx can't help if the request never reaches the VM.

## 3. Install nginx + the OneDexo config

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

sudo mkdir -p /etc/nginx/dexo-tenants   # per-custom-domain fragments (see below)
sudo cp infra/nginx/dexo.conf /etc/nginx/sites-available/dexo.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dexo.conf /etc/nginx/sites-enabled/dexo.conf

sudo nginx -t          # MUST say "syntax is ok" / "test is successful"
sudo systemctl reload nginx
```

If `nginx -t` fails, **do not** proceed — read the error, it'll usually be a
missing cert path (next step) or a typo. Nothing routes correctly until this
passes.

## 4. SSL certificate

`infra/nginx/dexo.conf` references `/etc/letsencrypt/live/onedexo.com/*` —
that file must exist before nginx will even start with this config.

```bash
sudo certbot certonly --nginx -d onedexo.com -d www.onedexo.com -d admin.onedexo.com -d api.onedexo.com
```

For the wildcard (`*.onedexo.com`, needed for every tenant subdomain), you
need DNS-01 (HTTP-01 can't prove ownership of a wildcard):
```bash
sudo certbot certonly --manual --preferred-challenges dns -d "*.onedexo.com" -d onedexo.com
# or, non-interactively with the Cloudflare DNS plugin:
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d onedexo.com -d "*.onedexo.com"
```
Then `sudo systemctl reload nginx` again once the cert exists.

## 5. Verify — this is the actual test for "does admin work now"

```bash
curl -sI https://admin.subhangym.onedexo.com | head -5
# Expect: HTTP/2 200 (or 302 to /login, which is correct — tenant-admin
# redirects unauthenticated users to its own login page, that's NOT the bug)

curl -sI https://subhangym.onedexo.com | head -5
curl -sI https://portal.subhangym.onedexo.com | head -5
curl -sI https://chatwoot.onedexo.com | head -5
# Expect a Chatwoot response, NOT a tenant-website page. If chatwoot.onedexo.com
# is missing its own server_name block in infra/nginx/dexo.conf, it falls
# through to the generic `~^(?<tenant>[a-z0-9-]+)\.onedexo\.com$` wildcard,
# which treats "chatwoot" as a tenant slug and serves whatever tenant-website
# falls back to for an unresolved tenant — the wildcard block MUST have a
# dedicated chatwoot.onedexo.com block (already in dexo.conf) taking priority.
```

If these `curl` from the VM itself work but the browser doesn't, it's almost
always DNS propagation delay or a stale browser DNS cache — try from an
incognito window or `curl` from your own machine (not the VM) to rule that out.

## 6. Per-tenant custom domains (fitness.com → tenant, optional)

Platform subdomains above need **zero** further config — the wildcard
`server_name` blocks in `dexo.conf` match every tenant automatically. Custom
domains a tenant brings themselves need one fragment each, generated by:

```bash
OUT_DIR=/etc/nginx/dexo-tenants CERTBOT=1 npx ts-node scripts/nginx-tenant-sync.ts
```

Run this after a tenant verifies a domain (see `docs/CUSTOM_DOMAINS.md`), or
on a cron. It only touches fragments that changed and reloads nginx
gracefully — no downtime, no effect on other tenants.

## Troubleshooting checklist (in order)

1. `curl 127.0.0.1:<port>` for the target app — is the Node process even up?
2. `dig +short <host>` — does DNS point at this VM?
3. `sudo nginx -t` — is the config even valid/loaded?
4. `sudo systemctl status nginx` — is nginx actually running?
5. `curl -sI https://<host>` **from the VM** — isolates browser/DNS-cache issues.
6. `sudo tail -50 /var/log/nginx/error.log` — the actual reason for a 502/504
   or connection refused will be here.
