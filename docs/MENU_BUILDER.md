# Menu Builder — Multi-Tenant Menu & Content Sections

Status: **Built and verified live** — tenant-scoped CRUD, audit logging,
publish flow, and public rendering for Grid/List/Table/Accordion templates.

A **Menu** is a named, ordered (optionally hierarchical) collection of
**MenuItems** rendered on a tenant's public site per a chosen display
template — a services grid, a pricing table, a locations list, an FAQ
accordion, etc. Generic enough for any tenant to define their own: Services,
Team, Locations, FAQ, Pricing, Gallery categories, and so on.

## Worked example

The "ROC Fitness Club" Services scenario, verified end-to-end against the
`vrfitness` demo tenant:

1. Create a menu named **Services**, `displayTemplate = grid`.
2. Add items — **Gym, Cardio, Zumba** — each with an icon, short
   description, and a draft/published status.
3. Publish the menu.
4. The public site's `/menu/services` page immediately renders a responsive
   card grid pulling live from the published `MenuItem` rows — draft items
   (e.g. an unfinished "Zumba" item) never appear publicly.
5. Every step produces an `AuditLog` row (create/update/publish/delete),
   scoped to that tenant, with a field-level before/after diff.
6. A different tenant cannot see, query, or modify this menu under any
   circumstance — verified directly: listing menus as another tenant
   returns `[]`, and fetching this menu's ID directly returns 404.

## Architecture

```
apps/tenant-admin  Website Builder → Menus (list) → Menu editor (items)
        │
        ▼ PUT/POST/DELETE /api/menus...  (tenantId from JWT, never client-supplied)
apps/api  MenuBuilderModule (menu-builder.controller.ts, menu-builder.service.ts)
        │
        ▼
Prisma   Menu, MenuItem  (prisma/schema.prisma)
        │                 — reuses the EXISTING AuditLog model/AuditService,
        ▼                   not a new audit table
apps/tenant-website  GET /api/menus/public/:subdomain (no auth, published only)
        │
        ▼
        components/MenuSection.tsx → MenuGrid / MenuList / MenuTable / MenuAccordion
        app/menu/[slug]/page.tsx — public page per menu
```

## Data model

- `Menu` — `tenantId` (required, indexed), `name`, `slug` (unique per
  tenant), `type` (`static` | `dynamic` — dynamic is schema-ready but its
  sync engine is not built, see Deferred), `displayTemplate` (`grid` |
  `table` | `carousel` | `list` | `accordion` | `map`), `maxDepth`,
  `status` (`draft` | `published`), `settings` (Json, template-specific
  options).
- `MenuItem` — `tenantId` (required, indexed — never trust `menuId` alone
  for isolation), `menuId`, `parentId` (self-relation, up to `menu.maxDepth`
  levels), `title`, `slug` (unique per menu), `shortDescription`,
  `description`, `icon`, `images` (string array), `location` (Json — lat/
  lng/address/embed_url), `linkUrl`, `sortOrder`, `status` (`draft` |
  `published` | `archived`), `customFields` (Json).
- Audit — reuses the platform's existing `AuditLog` model (append-only,
  tenant-scoped, field-level `changes: {before, after}`) rather than adding
  a parallel audit table. Query it via the existing
  `GET /api/audit/resource/:entityType/:entityId` endpoint
  (`entityType` = `menu` or `menu_item`).

## API

Every endpoint derives `tenantId` from the caller's JWT (`req.user.tenantId`)
— **never** from a client-supplied path/body parameter. This deviates from a
`/api/tenants/:tenantId/menus`-shaped URL on purpose: it matches every other
tenant-owned module in this codebase (fitness, ecommerce, contact, etc.) and
makes cross-tenant access structurally impossible rather than relying on a
per-handler "does this path tenantId match the session" check.

```
GET    /api/menus                        list this tenant's menus
POST   /api/menus                        create a menu
GET    /api/menus/:id                    get a menu (with items)
PUT    /api/menus/:id                    update a menu (name/slug/template/status/...)
DELETE /api/menus/:id                    delete a menu

GET    /api/menus/:id/items              list a menu's items
POST   /api/menus/:id/items              create an item
PUT    /api/menus/items/:itemId          update an item
DELETE /api/menus/items/:itemId          delete an item
POST   /api/menus/items/:itemId/reorder  { direction: 'up' | 'down' }

GET    /api/menus/public/:subdomain?slug=<slug>   public, no auth, published-only
```

## Admin UI

- `apps/tenant-admin/app/(admin)/website/menus` — menu list (name, template,
  item count, status, delete).
- `apps/tenant-admin/app/(admin)/website/menus/[id]` — menu editor: name,
  display template picker, publish/unpublish, and inline item management
  (add/edit/delete, up/down reorder, per-item publish toggle).
- Linked from the main Website Builder page (`/website` → "Manage menus →").

## Deferred (explicitly, not silently)

Scoped down from the full spec to ship a real, verified vertical slice
rather than a half-built version of everything:

- **Carousel and Map display templates** render as Grid for now (a correct,
  working fallback — not broken, just not the bespoke swipe/pin UX yet).
- **Dynamic menus** (auto-sync items from another collection, e.g.
  Trainers) — the `type: 'dynamic'` field exists on the schema but no sync
  job/engine is built; only `static` (manually authored items) works today.
- **Drag-and-drop reordering** — up/down buttons instead of a DnD library.
- **Rich WYSIWYG editor** for `description` — a plain textarea today, not
  TipTap/ProseMirror. No client-side HTML is trusted or rendered as-is
  either way (fields are rendered as plain text, not dangerouslySetInnerHTML).
- **Multi-image upload with responsive variants** — the schema supports an
  `images` array, but the item editor only exposes a single `icon` (emoji/
  text) field today; wiring the existing `S3Service`/`FilesModule` upload
  for cover + gallery images is the next increment.
- **Google Map location field** — `MenuItem.location` (Json) exists on the
  schema; no address-autocomplete UI is wired yet.
- **Granular in-tenant roles** (owner/admin can publish, editor cannot,
  viewer read-only) — every endpoint currently just requires a valid tenant
  JWT (`JwtAuthGuard`), matching this codebase's existing convention of not
  having granular per-module role gates elsewhere either. Add if/when the
  broader RBAC work (see `docs/RBAC_ARCHITECTURE.md`) reaches this module.
- **Postgres Row-Level Security** — this codebase enforces tenant isolation
  at the application layer (JWT → `tenantId` → `WHERE tenantId = ...` on
  every query) consistently everywhere, not via RLS anywhere. Menu Builder
  follows the same, already-established pattern rather than introducing a
  new isolation paradigm this app doesn't use elsewhere.
- **Audit log viewer UI** scoped to menus specifically — the existing
  `GET /api/audit/resource/:entityType/:entityId` endpoint already returns
  everything needed; no dedicated "Menu audit" screen has been built yet.
