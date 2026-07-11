# Implementation Plan: Multi-Part Platform Update (2026-07-10)

Nine work items across platform-web (3001), platform-admin (3002), api (4000), tenant-website (4005), tenant-admin (4006), tenant-app (4007).

---

## 1. Duplicate footer on platform-web index (3001)

**Finding:** Source has exactly ONE footer (`apps/platform-web/components/Footer.tsx`, rendered from `app/layout.tsx:36`). The visible second footer text "© 2026 Dexo Platform · Pricing · Industries" does not exist anywhere in source — it is a stale build artifact or injected by `PlatformHeader`/another shared element at runtime.

- [VERIFY] Open http://localhost:3001 in browser, inspect DOM to locate the second footer's origin.
- [MODIFY] Remove the offending element wherever it is found (likely a leftover in a shared component or `.next` cache — if cache, clear `.next` and rebuild).

## 2. Roles & permissions — granular management (3002 + tenant-admin)

**Current:** `Role.permissions` is a JSON string-glob array; Permission catalog table exists; platform-admin has roles list + editor with resource-grouped checkboxes; tenant-admin has NO roles UI; system roles are SuperAdmin/Admin/Manager/User/Viewer (not admin/staff/customer).

- [MODIFY] `packages/role/src/role/role.service.ts` — extend `seedSystemRoles()`: platform-level roles stay; add per-tenant default roles **admin / staff / customer** (isSystem, tenantId-scoped) seeded on tenant creation.
- [MODIFY] `packages/permission/src/permission/permission.controller.ts` — add `JwtAuthGuard` (currently unguarded!) and seed a full module-based permission catalog: resource = module (crm, blog, billing, attendance, subscriptions, website_builder, roles, users, settings...), action = view/create/edit/delete/manage.
- [MODIFY] `apps/platform-admin/app/roles/page.tsx` — proper table with headings (Name, Scope, Type, Permissions count, Users, Created, Actions) + **(i) info button** per row opening a details drawer showing full CRUD permission matrix (resource rows × view/create/edit/delete/manage columns).
- [MODIFY] `apps/platform-admin/app/roles/[id]/page.tsx` — replace checkbox list with a granular resource×action matrix grid.
- [NEW] `apps/tenant-admin/app/(admin)/roles/page.tsx` + `roles/[id]/page.tsx` — tenant-scoped role CRUD (same matrix UI), restricted to modules the tenant's plan enables (see item 7). Tenant-admin can create roles ("their root") within their tenant only — enforced by existing tenant scoping in `role.controller.ts`.
- [MODIFY] `apps/tenant-admin` sidebar/menu — add Roles entry.

## 3. Blog system (3002 + tenant-admin + platform-web index)

**Current:** Blog/BlogCategory/BlogTag/BlogComment models exist with slug, SEO fields, featuredImage, viewCount. No template field, no tenant-admin blog UI, no blog section on platform-web index, no rich-text editor.

- [MODIFY] `prisma/schema.prisma` — add `Blog.template String @default("standard")` (values: standard | feature | minimal), `BlogCategory.thumbnail String?`. New migration.
- [MODIFY] `packages/blog` DTOs + service — accept `template`, category `thumbnail`; add `POST /blogs/slug-suggest` (AI-ish slugify from title: transliterate, dedupe, keyword-trim); tag create-on-the-fly (`tagNames[]` in create DTO → upsert BlogTag); `GET /blogs/:slug` already increments views — verify, add per-blog stats endpoint `GET /blogs/:id/stats`.
- [MODIFY] `apps/platform-admin/app/blogs/new/page.tsx` + `[id]/page.tsx` — rich text editor (contentEditable-based toolbar component, no new deps), template picker (3 visual options), tags input with suggestions + auto/AI slug button, SEO panel (metaTitle/metaDescription with preview), category select with thumbnail, featured-image URL + preview.
- [NEW] `apps/platform-admin/app/blogs/categories/page.tsx` — category CRUD with thumbnail.
- [MODIFY] `apps/platform-admin/app/blogs/page.tsx` — add Views column (exists) + (i) details.
- [NEW] tenant-admin: `apps/tenant-admin/app/(admin)/blogs/` (list, new, [id], categories) — same features, tenant-scoped (own categories/tags/thumbnails via existing `tenantId` on models; BlogTag lacks tenantId → [MODIFY] add `tenantId?` to BlogTag + migration).
- [NEW] `apps/platform-web/components/BlogSection.tsx` + wire into `app/page.tsx` — latest published platform blogs (tenantId null), card grid with thumbnail (default placeholder SVG when featuredImage missing), view counts.
- [NEW] `apps/platform-web/app/blog/page.tsx` + `app/blog/[slug]/page.tsx` — public blog list + detail rendering per template type.

## 4. CRM channel setup — granular integration config

**Current:** `ContactMessage.channel` + inbound webhook `POST /contact/inbound/:channel` exist; no persisted channel config, no auth on webhook, tenant-admin setup panel is display-only, platform-admin has none.

- [MODIFY] `prisma/schema.prisma` — new model `ChannelConfig { id, tenantId?, channel, enabled, webhookSecret, credentials Json?, displayName?, createdAt, updatedAt, @@unique([tenantId, channel]) }` + migration.
- [MODIFY] `apps/api/src/modules/contact/` — new `channel-config.controller/service`: CRUD `GET/PUT /contact/channels`, secret generation; `POST /contact/inbound/:channel` verifies `?secret=` (or header) against ChannelConfig when one exists and rejects disabled channels.
- [NEW] `apps/platform-admin/app/crm/channels/page.tsx` — platform-level channel setup (enable/disable, webhook URL + secret, credential fields per channel: whatsapp, tiktok, instagram, facebook, email, website, viber, sms).
- [MODIFY] `apps/tenant-admin/app/(admin)/contacts/page.tsx` — replace read-only panel with real per-channel config (enable toggle, copyable webhook URL incl. secret, credential fields), server-side channel filter instead of client-side `limit:100`.
- [MODIFY] `apps/platform-admin/app/crm/page.tsx` — title text update; link to channel setup.

## 5. Demo billing seed (tenant → platform, NFRS/reports data)

**Current:** `scripts/seed/07-billing-demo.ts` drafted (plans w/ `features.modules`, subscriptions, payments); wired into `scripts/seed/index.ts`.

- [MODIFY] `scripts/seed/07-billing-demo.ts` — extend: tenant-customer→tenant invoices (sales invoices w/ items, VAT), payments received + allocations, a few journal entries/chart-of-accounts rows so NFRS reports (balance sheet, income statement, VAT return, AR aging) show real data; platform-level subscription invoices (tenant-admin→dexo) for platform-admin `/billing`.
- [RUN] `npm run db:seed:v5` (or targeted ts-node of 07) and verify tenant-admin finance reports + platform-admin billing show data.

## 6. Server-side pagination (platform-admin)

Attendance already fixed. Add real server-side pagination (page/limit params + Pager) to:
- [MODIFY] `apps/platform-admin/app/users/page.tsx` + `usersApi.list` + `/users/tenant` endpoint (accept page/limit, return {items,total}).
- [MODIFY] `apps/platform-admin/app/tenants/page.tsx` (API already supports page/limit).
- [MODIFY] `apps/platform-admin/app/branches/page.tsx` + branches endpoint.
- [MODIFY] `apps/platform-admin/app/roles/page.tsx` + roles endpoint.
- [MODIFY] `apps/platform-admin/app/notifications/page.tsx` + endpoint.
- Shared `Pager` component extracted to `apps/platform-admin/components/Pager.tsx`.

## 7. Subscriptions — module packages tied to plans + enforcement

**Current:** Plan.features Json; subscriptions UI edits generic flags only; seed 07 introduces `features.modules` (crm, blog, billing_invoice, invoice_print, attendance, website_builder, payments_online, reports_nfrs, announcements) that nothing reads; module access is domain+role driven, independent of plan. Also a changePlan param mismatch bug.

- [MODIFY] `apps/platform-admin/app/subscriptions/page.tsx` — add "Modules" section to plan editor: toggle per module (matching seed 07 keys), shown on plan cards (free vs paid modules); fix `changePlan(planId, tenantId)` arg mismatch (`lib/api.ts:283` / controller `newPlanId`).
- [MODIFY] `packages/subscription` — plan DTO passes `features.modules` through (Json already, verify).
- [NEW] `apps/api/src/common/guards/module-access.guard.ts` (or middleware in contact/blog/finance controllers): resolve tenant's plan → `features.modules`; deny module routes for disabled modules (403 with clear message). Wire on blog, contact/CRM, finance/billing, attendance, website-builder controllers for tenant-scoped requests. Platform admin bypasses.
- [MODIFY] tie to RBAC: effective access = plan module enabled AND role permission grants (item 2 catalog uses same module keys) — tenant-admin roles UI only offers modules the plan enables.
- [MODIFY] `GET /subscriptions/tenant/:tenantId` (or new `/me/modules`) so tenant-admin UI can hide disabled modules in its sidebar.

## 8. Tenant customer web login missing (4005)

**Finding:** Member login is a nav link to tenant-app `http://{slug}.localhost:4007/login`; `NEXT_PUBLIC_TENANT_APP_URL` is unset so the link can break, and there's no `/login` route on 4005 itself.

- [MODIFY] `apps/tenant-website/.env.local` — set `NEXT_PUBLIC_TENANT_APP_URL=http://localhost:4007`.
- [NEW] `apps/tenant-website/app/login/page.tsx` — redirect page (or lightweight login that posts to `/auth/login` and forwards to member portal) so `/login` on 4005 always works; make "Member Login" nav link point to local `/login`.
- [VERIFY] with tenant-app running on 4007.

## 9. Class creation failure (4006 /classes)

**Finding:** Root causes (missing endTime → Invalid Date 500; invalid `classType: 'GROUP'`) were already fixed in commit `4dec9ce` (server derives endTime, whitelists classType; form defaults YOGA + duration).

- [VERIFY] runtime test: create a class at http://localhost:4006/classes while logged in. If it still fails, capture the network error (likely 401 expired JWT or trainer scoping) and fix.

---

## Execution order
1 (footer verify) → 9 (classes verify) → 8 (login) → 6 (pagination) → 5 (billing seed) → 4 (CRM channels) → 7 (subscription modules + guard) → 2 (roles/permissions) → 3 (blogs) — schema migrations batched where possible (Blog.template, BlogCategory.thumbnail, BlogTag.tenantId, ChannelConfig in one or two migrations).

## Verification
- `npm run type-check` after each phase; targeted runtime checks in browser for items 1, 8, 9; seed run for item 5.
