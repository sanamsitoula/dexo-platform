# Local development URLs, live domains & ngrok

How to reach Dexo three ways: plain localhost, production-style domains through
nginx, and shared live URLs through ngrok. All three work simultaneously.

## 1. Plain localhost (zero setup — the default)

Browsers resolve any `*.localhost` to 127.0.0.1 automatically, so multi-tenant
subdomains already work **without nginx or hosts-file edits**:

| Surface | URL |
|---|---|
| Platform web | http://localhost:3001 |
| Platform admin | http://localhost:3002 |
| API / Swagger | http://localhost:4000 · /api/docs |
| Tenant public site | http://bishnufit.localhost:4005 |
| Tenant admin | http://bishnufit.localhost:4006/admin (basePath baked into the build) |
| Customer app | http://bishnufit.localhost:4007/portal (basePath baked into the build) |

The tenant middlewares resolve the slug from the host's first label
(`bishnufit.localhost` → `bishnufit`), falling back to `DEV_TENANT` env, then
unresolved (no more hardcoded demo-tenant fallback).

## 2. Production-style domains via nginx (`deploy/nginx/dexo.conf`)

**Path-based** routing for the tenant surfaces — one hostname per tenant,
with `/admin` and `/portal` sub-paths for the admin and customer apps.
`apps/tenant-admin` and `apps/tenant-app` are built with
`basePath: '/admin'` / `basePath: '/portal'` (see their `next.config.js`),
so their assets are already prefixed and nginx can route both paths to the
same tenant host without a second-level wildcard cert. All three
`middleware.ts` files resolve the tenant from the host's first label only —
no `admin.`/`portal.` prefix parsing.

| Host / path | → App |
|---|---|
| `dexo.com` / `dexo.localhost` | Platform web (3001) |
| `admin.dexo.com` | Platform admin (3002) |
| `api.dexo.com` | API (4000) — Swagger at `/api/docs` |
| `<tenant>.dexo.com` (e.g. `bishnufit.dexo.com`) | Tenant website (4005) |
| `<tenant>.dexo.com/admin` | Tenant admin (4006, basePath) |
| `<tenant>.dexo.com/portal` | Customer app (4007, basePath) |

Setup (WSL/Linux; on Windows use nginx-for-Windows with the same conf):

```bash
sudo cp deploy/nginx/dexo.conf /etc/nginx/sites-available/dexo.conf
sudo ln -s /etc/nginx/sites-available/dexo.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For a local `dexo.com`, add hosts-file entries (Windows:
`C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 dexo.com admin.dexo.com api.dexo.com
127.0.0.1 bishnufit.dexo.com
```

(admin/portal are now paths — `bishnufit.dexo.com/admin`,
`bishnufit.dexo.com/portal` — not separate hosts, so no extra hosts-file
entries are needed for them.)

(hosts files don't support wildcards — add a line per tenant you test, or use
`*.localhost` which needs none.)

## 3. Sharing a live URL with ngrok

```bash
ngrok http 80        # in front of nginx, or  ngrok http 4007  for one app
```

**The one constraint:** a free ngrok URL is a *single hostname*
(`https://abc123.ngrok-free.app`), so subdomain-based tenant routing cannot
pass through the tunnel. Dexo handles this natively:

- The tenant apps (`tenant-website`, `tenant-app`) recognize tunnel hosts
  (`*.ngrok-free.app`, `*.ngrok.app`, `*.ngrok.io`, `*.trycloudflare.com`,
  `*.loca.lt`) and **never** treat the random tunnel label as a tenant slug.
- To pick the tenant through a tunnel, open the URL once with the override:

  ```
  https://abc123.ngrok-free.app/?tenant=bishnufit
  ```

  The middleware pins `bishnufit` in the `dexo_tenant` cookie — every
  subsequent request on that tunnel stays on that tenant. Change tenants by
  passing a different `?tenant=`.

Recipes:

| Goal | Command |
|---|---|
| Demo the customer app for one gym | `ngrok http 4007` → open `…/portal/?tenant=bishnufit` |
| Demo the tenant website | `ngrok http 4005` → open `…/?tenant=bishnufit` |
| Expose the API (mobile app / webhooks / payment callbacks) | `ngrok http 4000` → set the frontend's `NEXT_PUBLIC_API_URL=https://<id>.ngrok-free.app` |
| Everything at once behind nginx | `ngrok http 80` → tunnel serves whichever `server_name _;`/default block matches; use `?tenant=` on tenant apps |

Notes:
- The API's CORS is `*` in dev, so cross-origin tunnel frontends work as-is.
- Payment-gateway callbacks (eSewa/Khalti) need a public URL — point the
  provider's callback at `https://<id>.ngrok-free.app/api/payment-gateway/callback/<provider>/<tenantId>`.
- Paid ngrok (custom/wildcard domains) restores full subdomain routing:
  `ngrok http 80 --domain=dexo.yourname.ngrok.app` plus a wildcard reserved
  domain lets `bishnufit.dexo.yourname.ngrok.app` flow through nginx untouched.
