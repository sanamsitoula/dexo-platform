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
| Tenant admin | http://bishnufit.localhost:4006 (or plain :4006 + login subdomain) |
| Customer app | http://bishnufit.localhost:4007 |

The tenant middlewares resolve the slug from the host (`bishnufit.localhost` →
`bishnufit`), falling back to `DEV_TENANT` env, then `vrfitness`.

## 2. Production-style domains via nginx (`deploy/nginx/dexo.conf`)

**Host-based** routing — one hostname per app, wildcard subdomains per tenant.
This is deliberately *not* path-prefix routing (`/dexo`, `/dexo/admin`, …):
Next.js apps emit root-relative asset URLs (`/_next/...`), so path prefixes
would require a `basePath` rebuild of every app **and** would break host-based
tenant resolution. Host routing is what production uses, so dev matches prod.

| Host | → App |
|---|---|
| `dexo.com` / `dexo.localhost` | Platform web (3001) |
| `admin.dexo.com` | Platform admin (3002) |
| `api.dexo.com` | API (4000) — Swagger at `/api/docs` |
| `<tenant>.dexo.com` (e.g. `bishnufit.dexo.com`) | Tenant website (4005) |
| `admin.<tenant>.dexo.com` | Tenant admin (4006) |
| `portal.<tenant>.dexo.com` | Customer app (4007) |

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
127.0.0.1 bishnufit.dexo.com admin.bishnufit.dexo.com portal.bishnufit.dexo.com
```

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
| Demo the customer app for one gym | `ngrok http 4007` → open `…/?tenant=bishnufit` |
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
