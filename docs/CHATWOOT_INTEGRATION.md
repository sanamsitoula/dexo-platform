# Chatwoot Integration — Multi-Tenant Messaging

Status: **Built — connection management, per-tenant provisioning, two-tier
widgets.** Uses the real, self-hosted [Chatwoot](https://github.com/chatwoot/chatwoot)
open-source project (Ruby on Rails + Vue, AGPL-3.0) — see the credit section
in the main [README](../README.md). Not embedded as a library (Chatwoot
isn't a Node package); it runs as its own service and the platform talks to
it over its REST API + JS widget SDK.

## The flow, as requested

```
Gym customer  <──Tier 1──>  Gym owner / trainer   (per-tenant Chatwoot inbox)
Gym owner     <──Tier 2──>  Platform owner        (one platform-wide Chatwoot inbox)
```

- **Tier 1 — Customer ↔ Tenant.** Every tenant gets its own Chatwoot
  "Website" inbox, auto-created at provisioning time (best-effort — Chatwoot
  being unconfigured never blocks tenant creation). The tenant's website
  visitors (and member-portal users) chat through this inbox; tenant staff
  are Chatwoot **agents** on it.
- **Tier 2 — Tenant ↔ Platform.** A single, platform-wide inbox
  (`PlatformChatwootConfig.platformInboxId`) that every tenant owner is
  registered against as a **contact**. Platform admins are agents on this
  one inbox and see every tenant's support requests in one place.

## Architecture

```
platform-admin  Settings → Chat  ──▶  PlatformChatwootConfig (connection: baseUrl,
                                       API token, account id, Tier-2 inbox)
                                              │
apps/api ChatwootModule ──▶ ChatwootClientService (packages/shared/src/chatwoot)
   │                              │  thin REST wrapper — createWebsiteInbox,
   │                              │  upsertContact, testConnection
   ▼                              ▼
ProvisioningService          Chatwoot REST API (self-hosted, Rails)
  .provisionTenant()  ──▶  create Tier-1 inbox  ──▶  TenantChatwootConfig
                       ──▶  register owner as contact on Tier-2 inbox

Widgets (JS SDK embed, loaded client-side):
  apps/tenant-website  ChatwootWidget.tsx           — Tier 1, public, by subdomain
  apps/tenant-admin    ChatwootPlatformWidget.tsx    — Tier 2, authenticated
```

Both widgets are the **same technique** — inject Chatwoot's official
`sdk.js` embed script with a `websiteToken`, exactly like embedding
Intercom/Zendesk/Drift. No chat UI is rebuilt; Chatwoot's own widget and
(for agents) Chatwoot's own web dashboard are used directly. This is the
literal meaning of "plug and play" here: OneDexo provisions inboxes/contacts
and embeds Chatwoot's UI, it doesn't reimplement messaging.

## Self-hosting

`docker-compose.chatwoot.yml` (opt-in, `profiles: ["chatwoot"]` so it never
starts with the default stack):

```bash
docker compose -f docker-compose.yml -f docker-compose.chatwoot.yml --profile chatwoot up -d
# first boot only:
docker compose exec chatwoot-app bundle exec rails db:chatwoot_prepare
```

Chatwoot gets its **own** Postgres (`dexo-chatwoot-postgres`, port 5434) and
Redis (`dexo-chatwoot-redis`, port 6380) — fully isolated from
`dexo-postgres`/`dexo-redis`, no shared state, no version coupling. Its
outbound mail reuses the platform's Global Email config (see
`docs/EMAIL_SYSTEM.md`) so there's only one email provider to manage.

After first boot, complete Chatwoot's own setup wizard at
`http://localhost:3200` to create the platform's Chatwoot account, then in
**platform-admin → Settings → Chat**: paste the base URL, an API access
token (Chatwoot Profile Settings → Access Token), and the account id — Test
Connection, then Create Platform Support Inbox (Tier 2). Tier-1 inboxes then
provision automatically on every new tenant signup.

## Data model

- `PlatformChatwootConfig` — singleton, the connection + Tier-2 inbox (mirrors
  `PlatformEmailConfig`'s pattern exactly: masked secret, super-admin only).
- `TenantChatwootConfig` — one row per tenant: `inboxId`/`websiteToken` for
  their Tier-1 inbox, `contactEmail` for their owner's Tier-2 contact record.

Chatwoot itself remains the source of truth for conversations, messages, and
agent assignment — these tables only store the connection + provisioning
mapping needed to create inboxes and embed widgets.

## API surface

- `GET/PUT /api/chatwoot/config`, `POST /api/chatwoot/test` — platform-admin
  only, connection management.
- `POST /api/chatwoot/provision-platform-inbox` — one-time Tier-2 setup.
- `GET /api/chatwoot/platform-widget` — authenticated (tenant-admin), returns
  the Tier-2 widget token.
- `GET /api/chatwoot/public/:subdomain/widget` — **public**, no auth (the
  tenant-website visitor is anonymous) — returns the tenant's Tier-1 widget
  token.
- `POST /api/chatwoot/webhook` — public receiver for Chatwoot's outbound
  webhooks (see Roadmap — currently accepts and acknowledges only).

## Roadmap — explicitly not built

- **Webhook signature verification.** The receiver accepts any payload right
  now; Chatwoot doesn't sign webhooks with a shared secret out of the box,
  so this needs either an IP-allowlist at the ingress or a custom Chatwoot
  automation rule that includes a verifiable token in the payload.
- **Syncing Chatwoot events back into the platform** (e.g. a new Tier-1
  conversation triggering a notification via the existing
  `NotificationService`, or an `AiInteractionLog`-style audit row) — the
  webhook endpoint currently just acknowledges receipt.
- **Mobile app widget.** Chatwoot's widget SDK is web-only; `apps/mobile`
  (React Native) would need either a WebView pointing at Chatwoot's hosted
  widget page or Chatwoot's separate mobile SDK (not evaluated here).
- **Auto-creating Chatwoot *agent* logins** for tenant staff — today staff
  message via the embedded Tier-1 widget as unauthenticated visitors of
  their own tenant's inbox (fine for owner replies via Chatwoot's own
  dashboard, which they'd need a separately-created agent account for,
  provisioned manually by whoever runs Chatwoot).
- **Per-tenant branding on the Tier-1 widget** (color/logo matching the
  tenant's template) — Chatwoot's widget API supports this
  (`widget_color`, avatar), not wired into `createWebsiteInbox` yet.
- **Re-provisioning retry queue.** If Chatwoot is down at tenant-creation
  time, provisioning is silently skipped (logged) — tenant-admin has a
  manual "re-provision" endpoint (`POST /api/chatwoot/re-provision`) but no
  UI button for it yet, and no automatic retry.
