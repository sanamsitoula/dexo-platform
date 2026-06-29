# Implementation Plan: Multi-Tenant Architecture Overhaul

## Problem Summary

1. `/t/hr-fit/settings` page doesn't exist (404)
2. Tenant admin is mixed inside platform admin (`apps/admin`) - confusing
3. No customer-facing tenant website
4. Role controller is `PlatformAdminGuard` only - tenants can't create their own roles
5. `ContactMessage` has no `tenantId` - no tenant-specific CRM
6. No role-based flows (admin/user/customer see same dashboard)
7. Sidebar menu is hardcoded, not role-aware

---

## Phase 1: Fix Missing Tenant Settings Page (Quick Win)

### `[MODIFY] apps/admin/app/t/[subdomain]/settings/page.tsx` (NEW)
- Create tenant settings page with: Branding (logo, favicon, primary color, site title), Tenant info (name, subdomain), Module toggles, Danger zone (deactivate tenant)
- Uses tenant JWT token from `localStorage`
- Calls `PUT /api/tenants/:id/settings` to save

---

## Phase 2: Schema Changes for Tenant Isolation

### `[MODIFY] prisma/schema.prisma`
- Add `tenantId` to `ContactMessage` model (optional for platform-level messages)
- Add `contactMessages ContactMessage[]` relation to `Tenant` model
- Add `@@index([tenantId])` to `ContactMessage`

---

## Phase 3: Tenant-Specific Roles & Permissions

### `[MODIFY] packages/role/src/role/role.controller.ts`
- Remove `PlatformAdminGuard` from class level
- Add a new `TenantRoleController` or make endpoints tenant-aware:
  - `POST /roles` - Tenant admin can create roles scoped to their tenant
  - `GET /roles` - Returns tenant's own roles + system roles
  - `PUT /roles/:id` - Tenant admin can update their own roles
  - `DELETE /roles/:id` - Tenant admin can delete their own non-system roles
- Use `req.user.tenantId` to scope all role operations
- Platform admin endpoints remain separate (can manage all)

### `[MODIFY] packages/role/src/role/role.service.ts`
- `create()` - Already accepts `tenantId` param, just need controller to pass `req.user.tenantId`
- `findAll()` - Already supports tenant filtering, need controller pass-through
- `update()` / `remove()` - Add tenant ownership validation

---

## Phase 4: Tenant-Specific Contact/CRM

### `[MODIFY] apps/api/src/modules/contact/contact.controller.ts`
- `POST /contact` - Accept optional `subdomain` or `tenantId` to scope message to a tenant
- `GET /contact` - If `req.user.tenantId` exists, filter by tenant; if platform admin, show all
- `GET /contact/stats` - Same tenant scoping
- `GET /contact/:id` - Validate tenant ownership
- `PUT /contact/:id` - Validate tenant ownership
- `POST /contact/:id/reply` - Validate tenant ownership

---

## Phase 5: New Tenant Admin App (Port 4006)

### `[NEW] apps/tenant-admin/` (Next.js app, port 4006)
This replaces the `/t/[subdomain]/` routes inside `apps/admin`.

**Structure:**
```
apps/tenant-admin/
  app/
    layout.tsx              -- Root layout: loads tenant by subdomain param
    [subdomain]/
      layout.tsx            -- Tenant shell: sidebar + topbar (role-aware menu)
      login/page.tsx        -- Tenant login (moved from admin)
      dashboard/page.tsx    -- Role-aware dashboard
      users/page.tsx        -- Tenant user management (moved)
      customers/page.tsx    -- Tenant CRM (moved)
      contacts/page.tsx     -- NEW: Tenant contact messages
      roles/page.tsx        -- NEW: Tenant role management
      settings/page.tsx     -- NEW: Tenant settings
      profile/page.tsx      -- NEW: User profile
  lib/
    api.ts                  -- Tenant-scoped API client (uses tenant JWT)
  package.json              -- port 4006
```

**Key differences from current admin `/t/` routes:**
- Role-aware sidebar (different menu for admin vs staff vs customer)
- Tenant admin sees: Users, Roles, Customers, Contacts, Settings
- Tenant staff sees: Dashboard, Customers, Appointments, Profile
- Tenant customer sees: Dashboard, My Bookings, Profile

---

## Phase 6: New Tenant Website App (Port 4005)

### `[NEW] apps/tenant-website/` (Next.js app, port 4005)
Customer-facing public website for each tenant.

**Structure:**
```
apps/tenant-website/
  app/
    layout.tsx              -- Root layout
    [subdomain]/
      layout.tsx            -- Public site shell (tenant branding)
      page.tsx              -- Landing page / home
      contact/page.tsx      -- Contact us form (submits to tenant-scoped CRM)
      services/page.tsx     -- Services listing
      about/page.tsx        -- About the tenant
      book/page.tsx         -- Booking/appointments
      login/page.tsx        -- Customer login
      register/page.tsx     -- Customer registration
  lib/
    api.ts                  -- Public API client
  package.json              -- port 4005
```

---

## Phase 7: Role-Based Flow Separation

### `[MODIFY] apps/tenant-admin/app/[subdomain]/dashboard/page.tsx`
- Check user role from JWT/localStorage
- **Tenant Admin**: Full dashboard with stats, user management shortcuts, revenue
- **Tenant Staff**: Operational dashboard - appointments, tasks, customers
- **Tenant Customer**: Personal dashboard - bookings, history, profile

### `[MODIFY] apps/tenant-admin/app/[subdomain]/layout.tsx`
- Build sidebar dynamically based on user role
- Tenant Admin: All menu items
- Tenant Staff: Dashboard, Customers, Appointments, Profile
- Tenant Customer: Dashboard, My Bookings, Profile

---

## Files to Create/Modify Summary

| Action | File | Description |
|--------|------|-------------|
| NEW | `apps/admin/app/t/[subdomain]/settings/page.tsx` | Fix missing settings page |
| MODIFY | `prisma/schema.prisma` | Add tenantId to ContactMessage |
| MODIFY | `packages/role/src/role/role.controller.ts` | Tenant-scoped role management |
| MODIFY | `packages/role/src/role/role.service.ts` | Tenant ownership validation |
| MODIFY | `apps/api/src/modules/contact/contact.controller.ts` | Tenant-scoped contacts |
| NEW | `apps/tenant-admin/` | Full new app (port 4006) |
| NEW | `apps/tenant-website/` | Full new app (port 4005) |
| MODIFY | `package.json` | Add workspace scripts |

---

## Execution Order

1. Phase 1: Fix settings page (immediate fix)
2. Phase 2: Schema migration
3. Phase 3: Tenant roles API
4. Phase 4: Tenant contacts API
5. Phase 5: tenant-admin app
6. Phase 6: tenant-website app
7. Phase 7: Role-based flows
