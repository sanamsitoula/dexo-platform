# Global Email Management System

Status: **Core hierarchy + super-admin control built**. Provider-agnostic,
switchable without redeploy. Advanced pieces (multi-domain-per-tenant
verification, template versioning/localization, delivery webhooks, queueing)
are roadmap — see bottom.

## The hierarchy (implemented)

```
Tenant SMTP Config          (Setting key "smtp", per tenant)
        ↓ (if not set/enabled)
Global Email Config         (PlatformEmailConfig — ONE row, super-admin editable
                              via platform-admin Settings → Email, takes effect
                              immediately, no redeploy)
        ↓ (if no global config exists)
System Default              (SMTP_* env vars — MailHog in local dev, last resort)
```

`TenantMailService.send(tenantId, msg)` (in `@dexo/shared`) resolves this
automatically on every call — no business-logic code anywhere branches on a
provider name. The decision is entirely data-driven per the design
principle "providers are interchangeable through configuration only."

## Where things live

- **Schema**: `PlatformEmailConfig` (the global config, singleton row) and
  `PlatformEmailLog` (every send, for monitoring) in `prisma/schema.prisma`.
- **Service**: `packages/shared/src/mail/tenant-mail.service.ts` —
  `getGlobalConfig`/`saveGlobalConfig` (masks the secret on read, keeps it on
  save unless a new one is provided — same UX pattern as tenant SMTP),
  `testGlobalConfig` (real send + records `lastTestedAt/Status/Error`),
  `getLogs`, and `bootstrapGlobalConfigFromEnv()` (one-time seed from
  `GLOBAL_SMTP_*` env vars on first API boot — **only if no DB row exists
  yet**; after that, the env vars are inert and the admin UI is the only way
  to change it, matching "switch providers globally... without requiring
  application redeployment").
- **API**: `apps/api/src/modules/platform-email/` —
  `GET/PUT /api/platform-email/config`, `POST /api/platform-email/test`,
  `GET /api/platform-email/logs` — all `PlatformAdminGuard`-only.
- **UI**: `apps/platform-admin/app/settings/email/` — provider/host/port/
  credentials form (secret masked, rotate by pasting a new value), sender
  identity, a real test-send button, and a delivery log table. Linked from
  the Settings index page.

## Initial provider: Brevo

Seeded via `GLOBAL_SMTP_*` in `.env` (gitignored — **never** committed; the
credential you provided is only in the local `.env` file, not in source
control or `.env.example`, which has blank placeholders). On first API boot
with no `PlatformEmailConfig` row yet, `bootstrapGlobalConfigFromEnv()`
creates one from those env vars automatically. From then on, manage/rotate
it via Settings → Email in platform-admin — the whole point of this system
is that a credential rotation is a form submit, not a deploy.

## Tenant-side (already existed, now formally tier 1 of the hierarchy)

`apps/api/src/modules/tenant-mail/` (`/api/tenant-mail/config`, `/test`) —
a tenant can already configure their own SMTP for full white-label sending;
that code was NOT changed, it's simply now documented as the top tier that
overrides Global when present. This is "Option 2: Use Custom Email Service"
from the spec — already built, just newly connected to a real Global tier
instead of falling straight to the env-var System Default.

## Monitoring (built, minimal)

`PlatformEmailLog` records every send — `to`, `subject`, `via`
(tenant/global/system), `status` (SENT/FAILED), `messageId`/`error`,
`createdAt`. The admin UI shows the last 20-200. This covers "Queued →
Sent → Failed" observability; it does **not** cover delivered/opened/
clicked/bounced/spam-report tracking (those require provider webhooks, see
Roadmap).

## Roadmap — explicitly not built (real scope, not hand-waved)

- **Multi-provider abstraction beyond SMTP** — Brevo (and most transactional
  providers) also offer an HTTP API with richer features (templates, tags,
  webhooks); today everything goes through SMTP via `nodemailer`, which
  works with any SMTP-speaking provider (Brevo, SendGrid, Mailgun, corporate
  Exchange/O365, Gmail SMTP, etc.) but doesn't use provider-specific HTTP
  APIs or webhook-based delivery events.
- **Multi-domain-per-tenant with per-domain verification** (SPF/DKIM/DMARC
  checks, `notify.company.com` vs `billing.company.com` routing) — the
  tenant SMTP config today is one config per tenant, not one-per-domain.
- **Global + tenant template system** — versioning, localization, preview,
  reusable components, dynamic variables beyond the current hardcoded
  `shell()` HTML wrapper in `TenantMailService`.
- **Rate limiting / quota enforcement** — `dailyLimit`/`monthlyLimit` fields
  exist on `PlatformEmailConfig` but nothing reads or enforces them yet.
- **Provider health monitoring / cost tracking** — `lastTestedAt/Status`
  exist from manual test-sends; no automatic periodic health check, no
  per-email cost accounting.
- **Delivery webhooks** (opened/clicked/bounced/spam/deferred) — requires
  each provider's webhook format; SMTP alone can't report these, only a
  provider's HTTP API/webhook can.
- **Send queue** — sends are synchronous today (matches the rest of the
  platform's notification pattern); a real queue (BullMQ, already a
  dependency elsewhere in the API) would be needed for bulk/marketing sends
  at "millions of emails" scale.
