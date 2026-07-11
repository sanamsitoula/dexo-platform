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
`orders/:id/cancel`, `orders/:id/shipment`, `shipments/:id/status`,
`dashboard/summary`.

Public storefront (`/api/ecommerce/public/:subdomain/...`, no auth):
`categories`, `products`, `products/:slug`.

## Roles seeded for ecommerce tenants

Beyond the universal `admin`/`staff`/`customer`: `ecommerce_manager`,
`sales_manager`, `inventory_manager`, `finance_manager`, `customer_support`,
`seo_content_manager`, `picker_packer`.

**Known limitation**: permissions are resource-level (`ecommerce:view` /
`:create` / `:edit` / `:delete`), not action-subtype-level. `picker_packer`
today gets `ecommerce:view`, which technically exposes cost price and
customer data alongside pick lists — a true separation needs a finer
permission grammar (`ecommerce:pick`, `ecommerce:view_financials`, ...). See
`docs/RBAC_ARCHITECTURE.md`.

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
  5s timeout, one attempt, every attempt logged to `WebhookDelivery`.
- **Roadmap**: retry-with-backoff worker (currently best-effort, no retry
  queue), a UI in tenant-admin's Settings → Integrations page (API exists,
  UI doesn't yet).

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
**Not built**: an actual COD reconciliation workflow (marking COD collected
on delivery), multi-currency with live exchange-rate conversion (currency is
stored per-order but not auto-converted), a real payment gateway integration
for ecommerce checkout (eSewa/Khalti/Stripe exist elsewhere on the platform
but aren't wired into this checkout flow yet).

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
  flow, fraud/manual-review hold, return→GL-reversal flow.
- **Finance integration**: SalesOrder doesn't create an Invoice/JournalEntry
  yet (see the note at the top of `ecommerce.service.ts`) — mirror the
  `FitnessFinanceService` deferred-revenue pattern when this is built.
- **Multi-vendor marketplace** (Vendor/Supplier external role implies this).
