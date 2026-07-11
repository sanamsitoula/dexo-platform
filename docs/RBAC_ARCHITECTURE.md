# Access Control Architecture — Current State + Hierarchy Plan

## The hierarchy (as it exists today)

```
Platform Admin  (User.isPlatformAdmin = true, no tenantId)
   │  bypasses ALL guards below — sees/manages every tenant
   │
   ├── TenantModuleOverride   ◀── NEW: explicit per-tenant, per-module
   │                                grant/restrict, set BY a platform admin,
   │                                takes precedence over the tenant's plan
   │
   ▼
Tenant  (scoped by User.tenantId)
   │
   ├── Subscription → Plan.features.modules   (tenant-wide default;
   │                                            used when no override exists)
   │
   └── Role (tenant-scoped, e.g. admin/staff/customer/ecommerce_manager/...)
          │
          └── Role.permissions: string[]   e.g. "ecommerce:*", "crm:view"
                 │
                 ├── Tenant Admin     → role "admin"    → module:* everywhere
                 ├── Tenant Staff     → role "staff" / vertical roles
                 │                       → module:view/create/edit, scoped
                 └── Tenant Customer  → role "customer" → minimal read-only
```

Enforcement points:
- **`JwtAuthGuard`** — is this a valid, authenticated user? (packages/auth)
- **`PlatformAdminGuard`** — is `user.isPlatformAdmin`? All-or-nothing gate
  for platform-only endpoints (tenant lifecycle, billing config, etc).
- **`ModuleAccessGuard`** (`@RequireModule('ecommerce')`) — can this
  *tenant* use this *module* at all? Checks, in order: (1)
  `TenantModuleOverride` for this tenant+module — wins if present, either
  direction; (2) the tenant's subscription plan's `features.modules`; (3)
  defaults to allowed if neither exists.
- **Role permission strings** — checked ad hoc inside individual
  services/controllers (not a single central guard) via the `permissions`
  array on the user's assigned `Role`. This is the least uniform layer today
  — see "Gaps" below.

## What changed in this pass

1. **`TenantModuleOverride` model + guard integration** — this is the actual
   hierarchy fix: previously the *only* way to restrict a tenant's module
   access was to change their subscription plan (all tenants on that plan
   move together). Now a platform admin can grant or revoke **one specific
   module for one specific tenant** without touching their plan — e.g. give
   a Starter-plan tenant early access to `ecommerce` as a trial, or revoke a
   Growth-plan tenant's `billing_invoice` access for a compliance hold.
   API: `GET/PUT/DELETE /api/tenants/:id/module-overrides[/:moduleKey]`
   (platform-admin only).
2. **Closed an unguarded-endpoint gap** — `TenantLifecycleController`'s
   non-public routes (suspend/reactivate/archive/delete/domain management)
   had **no auth guard at all** (there is no global default guard in this
   API — only `@Public()` opts a route *out* of auth, so a controller that
   forgets to add a guard is silently open). Added
   `@UseGuards(JwtAuthGuard, PlatformAdminGuard)` to all of them. Worth an
   audit pass across the rest of the API for the same pattern (see Gaps).
3. **Ecommerce roles** seeded per-tenant on provisioning (see
   `docs/ECOMMERCE_MODULE.md`).

## Gaps (the "more granular, more dynamic" part — not done, scoped honestly)

This is real, multi-session work. Listed in priority order:

1. **Unguarded-controller audit.** Now that one real gap was found by
   inspection, every controller in `apps/api/src/modules/**` should be
   swept for missing `@UseGuards`/`@Public()` — a five-minute grep
   (`@Controller` without any `@Public`/`@UseGuards` in the file) catches
   most of it, but needs a human pass to confirm intent per route.
2. **A central permission-checking guard**, mirroring `ModuleAccessGuard`,
   that reads `@RequirePermission('ecommerce:pick')` off the route and
   checks the user's resolved role permissions in one place — today
   permission checks are inconsistent (some controllers check nothing
   beyond `JwtAuthGuard` + `RequireModule`, relying on the frontend to hide
   UI; a determined API caller with a valid token but the wrong role can
   often still hit the endpoint).
3. **Finer permission grammar.** Current strings are `resource:action`
   (`ecommerce:view/create/edit/delete/*`). This can't express "can see
   pick lists but not prices" (the `picker_packer` role example in
   `docs/ECOMMERCE_MODULE.md`) or "can edit orders under $500 but needs
   approval above that." Proposed: `resource:action:scope`, e.g.
   `ecommerce:view:fulfillment` vs `ecommerce:view:financials`, with the
   Roles matrix UI (already built, per `REMAINING_WORK.md`) extended to
   show scoped sub-permissions per module instead of one checkbox per verb.
4. **Branch-level scoping.** Roles are tenant-wide today; a multi-branch
   retailer can't give a branch manager permissions restricted to their own
   branch's orders/stock. Would need a `RoleBranchScope` join or a
   `branchId` claim checked alongside `permissions`.
5. **Field-level/data-level permissions** (e.g. hide `costPrice` from
   `sales_manager` but show it to `finance_manager`) — a different
   mechanism entirely (response-shape filtering per role), not covered by
   any guard above.
6. **Self-service permission builder UI** for platform admins: a visual
   matrix (tenant × module × role × permission) instead of hitting the API
   directly — the module-override endpoints added in this pass have no UI
   yet (platform-admin's Tenant detail page would be the natural home).
7. **Time-boxed / conditional overrides** — the current
   `TenantModuleOverride` is permanent until manually removed; a trial
   grant that auto-expires needs an `expiresAt` field + a cron to clean up,
   deliberately left out of v1 to keep the model simple.

None of these require a schema rewrite — items 2–4 layer on top of the
existing `Role.permissions` string array and the new `TenantModuleOverride`
table, which is why this pass focused on making the *module*-level
hierarchy real first: it's the foundation the finer-grained work builds on.
