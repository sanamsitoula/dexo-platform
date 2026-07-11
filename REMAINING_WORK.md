# Dexo Platform — Remaining Work Audit (updated 2026-07-11, session 2)

Consolidated from all planning .md docs, cross-checked against actual code. Items completed 2026-07-10/11 (blogs, roles matrix, CRM channels, subscription modules + guard, pagination, billing seed, tenant login) are excluded.

## ✅ Completed this session (2026-07-11)

1. ~~**Marketplace**~~ — DONE: MarketplaceItem/Install/Review models + migration, marketplace API module, platform-web /marketplace pages, seed (08-marketplace.ts).
2. ~~**Platform (Dexo→tenant) billing engine**~~ — DONE: orphaned `packages/finance` wired into apps/api (`@dexo/finance` dep + PlatformBillingModule/IrdModule in app.module). Monthly billing cron, deferred-revenue release, IRD print/reprint watermark, revenue dashboard endpoints now live under /api/platform-billing and /api/ird. Runtime-verified.
3. ~~**MFA**~~ — DONE: TOTP (RFC 6238, node:crypto), /auth/mfa/setup|verify|enable|disable, backup codes, mfa-scoped login token.
4. ~~**Auth hardening**~~ — DONE: login-attempt lockout, refresh-token rotation with reuse detection (kills all sessions), logout revocation. Migration 20260711013158.
5. ~~**CI/CD**~~ — DONE: .github/workflows/ci.yml.
6. **CBMS/IRD live sync** — retry cron (every 30 min) + manual retryOne endpoint added; live mode activates via CBMS_API_URL/USERNAME/PASSWORD env. STILL PENDING: real IRD creds, signed payloads/cert auth (post-MVP TODO in cbms-sync.service.ts).
7. ~~**Report exports**~~ — DONE: xlsx/pdf/xml via report-export.util.ts (?format= on finance/reports).
9. **tenant-website public pages** — services, about, book (BookingForm) built. Register page routes to :4007 member app. STILL PENDING: full customer onboarding wizard inside :4007.
10. ~~**tenant-admin middleware**~~ — DONE: apps/tenant-admin/middleware.ts (hostname→tenant resolution).
11. **Non-fitness domains** — Salon (services/stylists/appointments + double-booking guard) and School (students/teachers/classes/enrollment/exams/results) API modules built and wired (/api/salon, /api/school; gated by RequireModule). STILL PENDING: tenant-admin UI for both; Restaurant/Hotel/Healthcare/Ecommerce/Logistics/Tailor/NGO/SME still descriptor-only.
12. ~~**Theme/branding UI**~~ — CONFIRMED BUILT: /settings/theme (templates + custom colors + layout) and /settings/branding (logo/favicon/OG + preview) in platform-admin.
13. ~~**Plugin system decision**~~ — DECIDED: deprecated (packages/plugin-system/DEPRECATED.md); superseded by Domain architecture + Marketplace + ModuleAccessGuard.
14. ~~**Blog write-guard**~~ — DONE: ModuleAccessGuard moved to @dexo/shared (apps/api guard file is a re-export shim); blog POST/PUT/DELETE/publish gated with @RequireModule('blog').
15. ~~**Debit notes**~~ — DONE: /api/finance/bills (purchase bills, AP) + /api/finance/bills/:id/debit-note (purchase return), GL postings (DR/CR AP 2010, expense, VAT input 2302), PDN numbering via BillSequence.
16. **Fitness finance automation** — deferred membership revenue recognition cron built (FitnessFinanceService, monthly, idempotent, DR 2400/CR 4030). BLOCKED ON SCHEMA: PT per-session revenue (TrainingSession has no price field) and depreciation (no FixedAsset model).

**NEW — Signup journey revamp (user request 2026-07-11)**: /signup/create rebuilt — industry step now feeds a theme-gallery step using the 10 `industryThemes` from `@dexo/shared/src/themes` (recommended-first sort, color swatches, premium badges, live hero preview that adapts colors/branding/layout), per-step validation, owner password field, theme-aware wizard chrome. `POST /api/tenants/provision` now accepts `themeId` + `branding` and persists them to `Tenant.settings`. platform-web build verified.


## ✅ Completed this session (2026-07-11, session 3)

A. **Template ecosystem (60 templates)** — `packages/shared/src/themes/templates.ts`: 12 business types x 5 design families (Aurora/Maison/Slate/Nocturne/Bloc), each with palette, fonts, hero type, nav style, journey sections, forms, admin theme. Signup wizard shows 5 structurally different template thumbnails per industry; `templateId` persists via provision `branding`.
B. **Template rendering site-wide** — tenant-website renders the chosen family full-size (`components/TemplateHome.tsx`); ALL public pages (about/services/book/contact/login/register) now theme via layout-level CSS vars (`lib/site-theme.ts`, SiteNav/SiteFooter, `.site-*` utilities). No hardcoded palettes remain.
C. **Domain rebrand + resolution** — all user-facing URLs onedexo.com; public `GET /api/tenants/resolve?host=` (subdomain / custom domain / bare slug); tenant-app + tenant-website middlewares resolve custom domains (cookie-cached) and trust nginx `X-Tenant-Slug`; `docs/CUSTOM_DOMAINS.md` (Namecheap/Hostinger/Mercantile/own-VM DNS flows).
D. **Dynamic nginx** — `infra/nginx/dexo.conf` rebuilt for onedexo.com: wildcard server blocks (zero per-tenant config for subdomains), `include /etc/nginx/dexo-tenants/*.conf` for per-custom-domain fragments, default_server fallback → tenant-website. `scripts/nginx-tenant-sync.ts` generates/removes only changed fragments (fractional rebuild) + graceful reload, optional certbot issuance.
E. **Canonical member-portal URL** — `portal.<tenant>.onedexo.com` everywhere (`apps/tenant-website/lib/portal.ts`, NEXT_PUBLIC_TENANT_APP_URL `{slug}` template); middleware understands `portal.<t>` / `admin.<t>` hosts.
F. **9b DONE — business-type-aware customer portal (:4007)** — `lib/vertical.ts` registry (fitness/salon/school/restaurant/generic: copy, onboarding preferences, dashboard quick actions) + `lib/tenant-info.tsx` (resolve-based branding context). Login/register branded per tenant + vertical copy. Onboarding router: fitness keeps full goals/BMI/plan/payment flow; other verticals get registry-driven flow. Dashboard router: FitnessHome (fitness API data) vs GenericHome (registry-driven). BottomNav vertical-aware. Mobile tab journey aligned (Home/Workouts/Diet/My Plan/Profile) + connect-by-domain + favorites.
G. **Misc** — branded 404/error pages in all 5 Next apps; platform-admin sidebar rebuilt (theme+branding-driven, grouped, flex layout); signup success URLs port-free in prod; `*.pem/*.key` gitignored (azure/key.pem untracked — ROTATE THE KEY, it was pushed).

### Still pending from F (next session)
- Sync GenericOnboarding preferences to per-vertical customer profile APIs (salon/school/restaurant customer "me" endpoints don't exist yet — currently localStorage).
- Mobile forgot-password flow (web has it, mobile doesn't).
- Web tenant-app notifications page (mobile has one).
- Salon/school/restaurant dashboard live-data widgets once customer APIs land.

## P1 — Still open

8. **Website builder** — cms page-builder + builder/[subdomain] page exist (~20%); no drag-and-drop editor or component library.
~~9b. Customer onboarding wizard~~ — DONE session 3 (vertical-aware, fitness full flow + registry-driven others).
11b. **Salon/School tenant-admin UI**; remaining 8 domain verticals.
16b. **PT session revenue + depreciation** — needs schema: price on TrainingSession (or session package model), FixedAsset register.

## P2 — Planned, not started (Phase 2/3 roadmap)

17. Launch essentials: ToS/Privacy/DPA legal docs, beta program, go-to-market (todo 4.1 — 0%).
18. Knowledge Base, Support Tickets, Live Chat/AI chatbot — no code.
19. Enterprise: SSO (SAML/OIDC), SCIM provisioning — no code.
20. Ops: Prometheus/Grafana monitoring, ELK, backup/restore procedures, blue-green deploys, load testing, CDN.
21. Security/compliance: formal OWASP review, pen test, GDPR export/deletion, dependency scanning, SOC 2/ISO/HIPAA groundwork, Postgres Row-Level Security (isolation today is app-layer tenantId only).
22. Usage-based billing, visual workflow builder, predictive analytics, GraphQL API, A/B testing (09 §2.5).
23. Phase-2 horizontal modules: Chat, Video, Doc Collab, Project Mgmt, Marketing Automation, HR/Payroll, POS, AI layer.
24. V3-era data models never built (superseded by v5 — confirm before discarding): TenantMember (multi-tenant-per-user), Website/WebsitePage/MediaItem, platform-level Package tiers.
25. Testing: no meaningful automated test coverage; v5 Phase 11 (smoke tests, verify-seed) unbuilt.

## Docs that are complete/obsolete (safe to archive)
- implementation_plan_4_6_ird_reports.md, system_architecture_4_6_ird_reports.md (delivered)
- V3_REFACTOR_PLAN.md (superseded by v5)
- implementation_plan.md / task.md (2026-07-10 batch — delivered)

## Notes for next session
- Typecheck the API with `npx tsc -p apps/api/tsconfig.typecheck.json` (rootDir/declaration overrides for the monorepo).
- Root tsconfig now maps `@dexo/blog` and `@dexo/finance` paths.
- ESLint in platform-web references a missing tsconfig.eslint.json (pre-existing); `next build --no-lint` works.
