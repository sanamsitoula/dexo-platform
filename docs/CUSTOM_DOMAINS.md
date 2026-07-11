# Custom Domains on OneDexo

Every tenant gets a free platform subdomain (`vrfitness.onedexo.com`). Tenants
can additionally connect a domain they own (`fitness.com`). Both addresses
serve the same website/app — the platform resolves the tenant from the Host
header.

## How resolution works (implemented)

1. **Platform subdomain** — `vrfitness.onedexo.com` → middleware extracts
   `vrfitness` from the host and stamps `x-tenant-slug`.
2. **Custom domain** — `fitness.com` → middleware calls
   `GET /api/tenants/resolve?host=fitness.com`, which matches either
   `Tenant.domain` or a **verified** `TenantLifecycle.customDomain`, and caches
   the mapping in the `dexo_host_map` cookie for an hour.
3. **Mobile app** — the customer types any address (custom domain, subdomain,
   or bare slug) into "Connect by domain"; the app calls the same
   `/tenants/resolve` endpoint.

## Tenant flow (admin console → Domain page)

1. Tenant enters `fitness.com` → API (`POST /tenants/:id/domain/request`)
   returns a TXT record:
   ```
   Type:  TXT
   Host:  _dexo-verify.fitness.com
   Value: dexo-verification=<token>
   ```
2. Tenant adds the TXT record at their DNS provider, plus the pointing records
   below, then clicks Verify (`POST /tenants/:id/domain/verify`). The API does
   a live DNS TXT lookup; on match it sets `customDomainVerified = true` and
   SSL status to `PENDING`.

## Records the client must add (any provider)

| Purpose | Type | Host | Value |
|---|---|---|---|
| Ownership proof | TXT | `_dexo-verify` | `dexo-verification=<token>` |
| Apex domain (`fitness.com`) | A | `@` | `<OneDexo ingress public IP>` |
| `www` | CNAME | `www` | `vrfitness.onedexo.com` |

If the provider supports ALIAS/ANAME/CNAME-flattening at the apex (Cloudflare,
Namecheap ALIAS), prefer `ALIAS @ → vrfitness.onedexo.com` over a raw A record
so the IP can change without client action.

### Namecheap
Dashboard → Domain List → Manage → **Advanced DNS** → Add New Record.
Add the TXT (host `_dexo-verify`), the A record (host `@`), and the CNAME
(host `www`). TTL "Automatic". Propagation is usually minutes.

### Hostinger
hPanel → Domains → **DNS / Nameservers** → Manage DNS records. Same three
records. If the domain currently points to Hostinger hosting, delete their
default A/CAA parking records first.

### Mercantile (.com.np — Nepal registrar)
`.np` domains are free but Mercantile only delegates **nameservers**; there is
no DNS editor. The client should set the nameservers to a free DNS host
(Cloudflare is the usual choice: add site → copy the two NS names → submit
them in the Mercantile/register.com.np panel), then add the three records in
Cloudflare. NS changes at Mercantile can take 1–2 days to be approved.

### Own VM / public IP (self-hosted or testing)
If the client runs their own box and wants `fitness.com` to front OneDexo,
they reverse-proxy to us instead of DNS-pointing:
```nginx
server {
  server_name fitness.com;
  location / {
    proxy_pass https://vrfitness.onedexo.com;
    proxy_set_header Host fitness.com;   # keep the custom-domain Host so we resolve the tenant
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```
The TXT verification record still has to exist wherever the domain's DNS lives.

## Platform side (ops checklist)

- **Ingress**: nginx/traefik with a wildcard vhost for `*.onedexo.com` **and a
  default/catch-all vhost** for arbitrary custom domains, both proxying to the
  tenant-website (:4005) / tenant-app (:4007) services. The apps resolve the
  tenant per request, so no per-domain vhost config is needed.
- **SSL**:
  - `*.onedexo.com` — one wildcard cert (Let's Encrypt DNS-01).
  - Custom domains — on-demand certs: Caddy `on_demand_tls` or traefik/cert-manager
    HTTP-01 per host, gated by a callback to `/api/tenants/resolve?host=` so we
    only issue certs for verified tenant domains (this is what `sslStatus:
    PENDING → ACTIVE` tracks).
- **Local dev**: `vrfitness.localhost:4005` works without hosts-file edits;
  custom domains can be simulated with `?tenant=<slug>` or by adding the domain
  to `Tenant.domain` and a hosts-file entry pointing at 127.0.0.1.
