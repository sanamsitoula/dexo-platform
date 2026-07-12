# Ecommerce Tenant Module

Status: **v1 built and live** (API + provisioning). Storefront UI, advanced
inventory, and platform-integration items are roadmap — see below.

## What "select Ecommerce → fully provisioned" actually does today

`ProvisioningService.provisionTenant()` — when `domainType` matches
ecommerce/retail/shop:

1. Creates the tenant, owner, default roles (see Roles below).
2. Seeds a **default warehouse** ("Main Warehouse", code `MAIN`) — required
   before any stock can be tracked, so a new tenant can add products
   immediately with no manual warehouse setup.
3. Seeds an **"Uncategorized" product category** — a landing bucket so
   products can be created before the tenant organizes their catalog.
4. Does **not** seed fake demo products — a live store shouldn't show
   placeholder junk to real visitors.

Everything else (finance ledger accounts, payment gateway credentials,
shipping carrier accounts) is tenant-configured, same as every other
vertical on the platform.

## Architecture

```
Catalog (Product/ProductCategory/Brand/ProductAttribute/ProductVariant)
   │
   ├─▶ Inventory (Warehouse/StockItem/StockLedgerEntry) — audit-trailed,
   │    every change recorded, not just current quantity
   │
   ├─▶ Cart/CartItem — per-customer, resolved via getOrCreateCustomerForUser
   │
   └─▶ Checkout ──▶ SalesOrder/SalesOrderItem (stock deducted synchronously)
            │
            ├─▶ Shipment (Logistics-lite: courier, tracking, status)
            └─▶ WebhooksService.emit(...) — order.created, order.status_changed,
                 order.cancelled, shipment.created, shipment.status_changed,
                 product.low_stock
```

Reused from the rest of the platform rather than duplicated:
- **Customer** (finance/CRM model) — a logged-in shopper is lazily mapped to
  a Customer row by email, the same entity Invoice/AR already use.
- **Coupon** — checkout applies existing tenant coupons by code.
- **Branch** — a Warehouse can optionally belong to a Branch.

## API surface

Authenticated (`/api/ecommerce`, `@RequireModule('ecommerce')`):
`categories`, `brands`, `products`, `products/:id/variants`, `attributes`,
`attributes/:id/values`, `warehouses`, `stock`, `stock/adjust`, `stock/low`,
`cart`, `cart/items`, `checkout`, `orders`, `orders/:id/status`,
`orders/:id/cancel`, `orders/:id/confirm-payment`, `orders/:id/shipment`,
`shipments/:id/status`, `dashboard/summary`.

Public storefront (`/api/ecommerce/public/:subdomain/...`, no auth):
`categories`, `products`, `products/:slug`.

## Roles seeded for ecommerce tenants

Beyond the universal `admin`/`staff`/`customer`: `ecommerce_manager`,
`sales_manager`, `inventory_manager`, `finance_manager`, `customer_support`,
`seo_content_manager`, `picker_packer`.

**Done**: finer-grained action permissions `ecommerce:pick` (gates
`stock/adjust`, `orders/:id/shipment`, `shipments/:id/status` via
`@RequirePermission`/`PermissionGuard`, see `packages/shared/src/guards/permission.guard.ts`)
and `ecommerce:view_financials` (gates `totalRevenue` on
`dashboard/summary` — stripped server-side in the controller when the
caller lacks it) now exist and are seeded onto the `finance_manager`
(`view_financials`) and `picker_packer` (`pick`) roles in
`ProvisioningService`. Still resource-level for everything else
(`ecommerce:view`/`:create`/`:edit`/`:delete`); a full permission-grammar
overhaul remains future work. See `docs/RBAC_ARCHITECTURE.md`.

**Not built** (real Purchase module doesn't exist yet, so these roles from
the original enterprise spec are deferred): Purchase Manager, a standalone
Logistics Manager (shipment tracking currently lives inside `ecommerce`),
B2B Sales Representative, Vendor/Supplier external role.

## Product Attributes & Variations

`ProductAttribute` ("Size", "Color") → `ProductAttributeValue` ("M", "Red")
→ `ProductVariantAttributeValue` join row on `ProductVariant`. This replaces
free-form JSON with a structured, reusable system so a storefront can render
a proper "Size / Color" picker and variants can share attribute definitions
across the whole catalog.

## Generic Webhook bus (plug and play for ANY module)

`WebhooksModule` / `WebhooksService.emit(tenantId, eventType, payload)` is
NOT ecommerce-specific — any module can import `WebhooksModule` and call
`emit()` with a new dot-namespaced event name (`salon.appointment.booked`,
`school.exam.published`, ...) with zero schema migration, because
`WebhookEndpoint.eventTypes` and `WebhookDelivery.eventType` are plain
strings, not a closed enum.

- Tenant manages endpoints at `/api/webhooks` (list/create/update/delete,
  `/deliveries` for audit history, `/:id/test` to send a synthetic ping).
- Delivery: HMAC-SHA256 signs the JSON body (`X-Dexo-Signature` header),
  5s timeout, every attempt logged to `WebhookDelivery`.
- **Done**: retry-with-backoff — a failed delivery is marked `RETRYING`
  with `nextRetryAt` (1m / 5m / 30m / 2h after attempts 1-4), and a
  `@Cron(EVERY_MINUTE)` sweep (`WebhooksService.retrySweep`, reusing the
  existing `@nestjs/schedule` `ScheduleModule` already registered in
  `app.module.ts` — no new queue library) redelivers anything due. After 5
  attempts a delivery is marked `DEAD` and stops retrying (visible via
  `/deliveries`). Schema: added `RETRYING`/`DEAD` to `WebhookDeliveryStatus`
  and a nullable `WebhookDelivery.nextRetryAt DateTime?` column (migration
  needed, see below).
- **Roadmap**: a UI in tenant-admin's Settings → Integrations page (API
  exists, UI doesn't yet).

## SEO

`Product.metaTitle` / `metaDescription` fields exist and are accepted by the
create/update API. `robots.txt` and `sitemap.xml` are dynamic per-tenant
routes in tenant-website (work on subdomains and custom domains).

**Not built**: a `/shop/[slug]` product detail page (so product URLs are
deliberately excluded from the sitemap until that page exists — shipping
product URLs with no page would just be 404s), JSON-LD `Product` structured
data, Open Graph tags per product.

## Inventory

Built: `reorderPoint` per product + `getLowStockProducts()` +
`stock/low` endpoint + a `product.low_stock` webhook fired automatically
when a sale drops stock to/below the threshold.

**Not built** (each is a real, multi-day feature, not a field addition):
batch/expiry tracking (FMCG/pharma), serial number tracking (electronics/
high-value), automated PO generation on low stock (no Purchase module to
generate a PO into).

## Payments

`SalesOrder.paymentMethod` (`COD` | `PREPAID`) exists; checkout accepts it.

**Done**: `PaymentGatewayService` (`initPayment`/`verifyPayment`) is now
wired into ecommerce checkout — a `PREPAID` order with a `providerType`
calls `initPayment` and returns the redirect/session payload alongside the
order (checkout still succeeds and the order is created even if gateway
init fails — the client can retry payment separately). A new
`POST /orders/:id/confirm-payment` endpoint calls `verifyPayment`; on a
`COMPLETED` result it marks the order confirmed, the linked `Invoice` paid,
and triggers ledger posting (DR Cash/Bank instead of AR). COD orders skip
the gateway entirely and post revenue immediately (DR Accounts
Receivable).

**Not built**: an actual COD reconciliation workflow (marking COD collected
on delivery), multi-currency with live exchange-rate conversion (currency is
stored per-order but not auto-converted), gateway webhook/IPN handling
(only the explicit client-initiated `confirm-payment` callback exists —
no server-to-server webhook receiver per provider).

## Explicitly out of scope for v1 (roadmap, not started)

These are each substantial, standalone efforts — listed honestly rather than
shipped as shallow stubs:

- **Storefront UI**: product listing/detail/cart/checkout pages in
  tenant-website (today: API + public browse endpoints only, no rendered
  catalog pages — the template system from the signup wizard covers the
  marketing site, not a shopping cart UI).
- **Theme/page builder**: drag-and-drop editor or robust theme customizer.
- **Analytics/tracking**: GA4/Meta Pixel ecommerce event integration.
- **CDN + image optimization**: auto WebP/AVIF generation on upload,
  Cloudflare/CloudFront auto-provisioning per tenant.
- **Domain/SSL execution automation**: the manual DNS flow is documented
  (`docs/CUSTOM_DOMAINS.md`) and fragment generation is scripted
  (`scripts/nginx-tenant-sync.ts`), but nothing triggers it automatically on
  tenant activation yet.
- **Exception workflows**: out-of-stock-during-picking substitution/refund
  flow, fraud/manual-review hold. (Cancel→GL-reversal is now built — see
  Finance integration below.)
- **Finance integration — done**: `EcommerceLedgerService`
  (`apps/api/src/modules/ecommerce/ecommerce-ledger.service.ts`) creates an
  `Invoice` (linked via `SalesOrder.invoiceId`, unique 1:1 FK — already
  existed on the schema, no migration needed for that relation) at
  checkout, and posts a journal entry through the canonical
  `apps/api/src/modules/finance/journal.service.ts` /
  `accounts.service.ts` stack: DR Cash/Bank (PREPAID, once payment is
  verified) or DR Accounts Receivable (COD, posted immediately) · CR Sales
  Revenue · CR Output VAT, plus a COGS leg (DR COGS · CR Inventory) when
  every sold item has a positive `Product.costPrice` on record (skipped
  entirely, not partially posted, if cost data is incomplete for any line).
  Mirrors `GymLedgerService`'s pattern: idempotent on
  `(referenceType, referenceId)` via `alreadyPosted`, `resolveAccounts`
  account-code lookups, `$transaction`-wrapped posting, and — critically —
  never throws into the checkout path (accounting failures are logged and
  skipped, not surfaced as checkout errors). `cancelOrder` posts a mirrored
  reversing entry (debit/credit swapped) with the same idempotency guard
  (`ECOMMERCE_SALE_REVERSAL` reference type) so a retried cancel never
  double-reverses, and marks the Invoice `CANCELLED`.
  **Not built**: a partial-refund (vs. full cancel) reversal path, and a
  return→restock workflow beyond the existing `SALE_RETURN` stock ledger
  reason.
- **Multi-vendor marketplace** (Vendor/Supplier external role implies this).

## Migrations needed (schema changed, not yet migrated — do not run
`prisma migrate` blindly; review then run in each environment)

Two schema changes in this pass, not yet applied to any database:
1. `WebhookDeliveryStatus` enum: added `RETRYING`, `DEAD`.
2. `WebhookDelivery.nextRetryAt DateTime?` (nullable, new index
   `@@index([nextRetryAt])`).

No SalesOrder/Invoice schema change was needed — `SalesOrder.invoiceId`
already existed. Run:

```
npx prisma migrate dev --name webhook_retry_backoff
```

(or the environment's equivalent `migrate deploy` flow) before deploying
this branch.
