# Website Builder / Menu Builder / Page Builder — Final Status

Source spec: the full 22-section Website/Menu/Page Builder prompt. Every
item is now built and end-to-end verified except version control, which
was explicitly descoped per instruction, and a handful of platform-level
items noted below that were never in scope for a per-page/per-tenant system.

## ✅ Complete and working

| Module | Status |
|---|---|
| **Menu Builder** | Tenant-scoped CRUD, nested items, 6 display templates (grid/table/carousel/list/accordion/map), draft/published status, renders live on the public tenant site. `apps/api/src/modules/menu-builder/*`, `apps/tenant-admin/app/(admin)/website/menus/*`. |
| **Rich Text Editor** | contentEditable-based editor — bold/italic/underline/headings/lists/blockquote/links/images, output sanitized with DOMPurify before render. `apps/tenant-admin/components/RichTextEditor.tsx`. |
| **Media Manager** | Upload/browse/delete/rename, tenant-isolated, MinIO/S3-backed, permanent public URLs for content embedding (separate from short-lived signed preview URLs). `packages/files/*`, `apps/tenant-admin/app/(admin)/website/media/page.tsx`, `apps/tenant-admin/components/MediaPicker.tsx`. |
| **AI content assist** (add-on, not a replacement) | "AI Write" button in RichTextEditor drafts section copy via the platform's existing AI Gateway (`/api/ai/chat`, `website.content-writer` agent). No DB write access — tenant reviews/edits before saving. `apps/api/src/modules/website-ai/*`. |
| **Page Builder** | `Page` + `PageSection` models, tenant-scoped CRUD API, reserved-slug guard (admin/portal/api), renders live at `/<slug>` on the public site with per-page SEO metadata. `apps/api/src/modules/page-builder/*`, `apps/tenant-admin/app/(admin)/website/pages/*`, `apps/tenant-website/app/[slug]/page.tsx`. |
| **Component Library** | 12 data-driven component types (Hero, Rich Text, CTA, Features, Testimonials, Pricing, FAQ, Gallery, Team, Contact, Newsletter, Form) — adding a 13th is a data change, not new UI code. `packages/shared/src/page-builder/components.ts`, `apps/tenant-admin/components/ComponentFieldsEditor.tsx`. |
| **Drag-and-drop visual canvas** | `@dnd-kit`-based sortable section list — real drag handle + pointer/keyboard sensors, optimistic reorder, one bulk-persist API call per drop. Up/down buttons kept alongside as an accessible fallback (not removed). `apps/tenant-admin/components/SortableSectionList.tsx`, `PUT /pages/:id/sections/reorder-all`. |
| **Per-page SEO Builder** | Meta title/description, OG image, canonical URL, robots index/follow — editable per page, wired into `generateMetadata` on the public route. |
| **Publishing Workflow** (no version control, per instruction) | Full state machine: `draft → in_review → approved → (published \| scheduled) → archived`, revert-to-draft from any stage. Invalid transitions rejected server-side. Scheduled publishing auto-flips on first public read after `publishAt` passes — no cron job needed. |
| **Forms Builder** | `Form`/`FormField`/`FormSubmission` models, 10 field types, tenant-scoped CRUD + submissions viewer, public fetch/submit endpoints with required-field validation, embeds via the Component Library's `form` entry, renders + accepts real submissions on the live site. Upload/signature/OTP/CAPTCHA field types explicitly not built (each needs its own extra infra). `apps/api/src/modules/forms-builder/*`, `apps/tenant-website/components/PublicFormRenderer.tsx`. |
| **Theme Builder (v1)** | Named, saved, switchable `TenantTheme`s — full color/font/radius token set, optionally seeded from one of the 60 fixed templates, create/duplicate/activate/delete, audit-logged. Layers over (doesn't replace) the older single-color `branding.colorPrimary/colorAccent` override, so nothing broke for tenants who never open it. **Important limitation, not yet fixed:** there is no draft/live isolation — editing an active theme's tokens changes the real, live site instantly for every visitor. See the deep-dive roadmap below (Phase 3) before treating this as safe for a tenant to self-serve without supervision. `apps/api/src/modules/theme-builder/*`, `apps/tenant-admin/app/(admin)/website/theme/page.tsx`. |

## ⚠️ Exists but much smaller than the name implies

| Module | What it actually is | Gap |
|---|---|---|
| **"Website Builder" landing page** | Template-swatch picker (1 of 60 pre-built templates) + tagline/description, now alongside real Pages/Forms/Media/Theme sub-tools. `apps/tenant-admin/app/(admin)/website/page.tsx`. | No global header/footer/nav editor, no site-wide analytics/cookie-consent config, no social-links/contact-info fields at the website level (these live at the tenant-settings level instead). |

## ❌ Still not built — out of scope by explicit instruction or genuinely platform-level

| Item | Why it's not here |
|---|---|
| **Version Control / revision history** | Explicitly descoped per instruction — no versioning, diffing, or restore on any content type. |
| **Multiple websites per tenant** | Architecturally one tenant = one implicit website — a bigger structural change than anything requested this pass. |
| **Responsive breakpoint preview + per-breakpoint visibility rules** | Not requested this pass. |
| **Reusable/importable tenant-saved page templates** (beyond the fixed 60 website templates) | Not requested this pass. |
| **Dynamic content binding** (pages bound directly to Products/Services/Bookings/Orders without custom code) | Not requested this pass. |
| **Sitemap / redirects / 301-302 / custom 404** | Platform-level, cross-tenant concerns — not per-page fields. |
| **Upload / signature / OTP / CAPTCHA form fields** | Each needs distinct extra infrastructure (storage retention rules, canvas capture lib, SMS provider, third-party challenge service) — noted in Forms Builder's own scope comment. |
| **Submission email notifications** | `Form.notifyEmail` field exists and is stored, but isn't yet wired to `TenantMailService` — submissions are safely captured and visible in tenant-admin regardless. |

## What shipped, in build order

1. Media Manager — fixed a broken `FilesController.update()`, added a `MEDIA` file type, tenant-admin Media Library UI.
2. Page Builder + Component Library — `Page`/`PageSection` models, 11→12 component types, non-drag-and-drop canvas, public `/<slug>` rendering.
3. Publishing Workflow — full state machine with server-enforced valid transitions and auto-publish-on-schedule.
4. Forms Builder — `Form`/`FormField`/`FormSubmission`, embeds via Component Library, live public submission tested end-to-end.
5. Theme Builder — `TenantTheme` model, layered token resolution, verified live color changes on the actual rendered site.
6. Drag-and-drop canvas — `@dnd-kit` sortable list, bulk-reorder API, accessible fallback preserved.

Every phase above was tested end-to-end against the live `goldgym` test tenant (create → publish → verify on the real rendered page), not just unit-level.

---

# Theme Builder Deep-Dive — Gap Analysis & Future Roadmap

The Theme Builder shipped above is a real, working **v1**: token storage, activation,
layered resolution over the legacy branding override, audit logging, and verified
live rendering. It is not, however, a production-grade theming platform yet. A
deeper review (merging two independent gap-analysis passes) surfaced everything
below — calibrated against what's *actually* built today, not generic advice.

## What the deep-dive confirms is already done

- **Token-to-CSS strategy is decided and live**: runtime CSS variables, computed
  server-side per request in `apps/tenant-website/lib/site-theme.ts` and injected
  via `themeVars()`. This resolves Phase 0's biggest open decision — no build-time
  per-tenant CSS compilation needed, no per-tenant Tailwind config problem to solve.
- **Audit logging exists**: every `TenantTheme` create/update/duplicate/activate/
  deactivate is logged with a before/after diff, same pattern as Menu Builder.
- **Layered override architecture exists**: legacy template → legacy single-color
  branding override → active `TenantTheme`'s full token set, each layer overriding
  only the tokens it actually sets (not all-or-nothing) — this is the foundation
  §D asks for when deciding how templates and themes relate; today they're
  independent axes (a `TenantTheme.baseTemplateId` is just a seed value at creation,
  not a live dependency).

## The real, unaddressed gap: no draft/live isolation (Phase 3, §B)

This is the most important gap to close before treating Theme Builder as
something a tenant can self-serve without supervision. Today, editing an
**active** theme's tokens changes the real, live site instantly for every
visitor — there is no draft copy, no preview-only mode, and no one-click
revert if a bad color choice ships. Menu Builder and Page Builder both have
this exact protection (draft status, and for pages a full publishing workflow);
Theme Builder currently does not, despite having a larger blast radius (one
theme touches the *whole* site, not one page).

**Recommended next phase, if Theme Builder work continues:** add a `status:
draft | published` field to `TenantTheme` (mirroring `Page`'s `MenuItemStatus`
reuse pattern), an admin-only preview mechanism (a signed preview token in the
URL, checked before the public resolver in `theme-builder.service.ts`'s
`getActiveTheme`), an explicit "Publish theme" action separate from saving
token edits, and a "last known good" snapshot column for one-click revert —
full version history stays out of scope per the earlier instruction, but a
single revert-to-last-published snapshot is a safety feature, not a nice-to-have.

## Remaining gaps, categorized (not yet built)

| Area | Gap | Notes against current code |
|---|---|---|
| **Component-token contract** | No lint/CI rule forbidding hardcoded colors/fonts in components | `TemplateHome.tsx` and friends consume resolved JS values (`p.primary`, `p.background`) via props, not enforced CSS-var-only references — regressions can creep back in as components are added |
| **Custom CSS/JS escape hatch** | Not built | No field, no precedence rule defined |
| **Governance/RBAC** | Single tenant-admin auth gate only | No `Theme Designer` / `Content Editor` / `Publisher` role split — any tenant-admin user can repaint the whole site |
| **Responsive token modifiers** | Not built | `TenantTheme` tokens are single flat values, no desktop/tablet/mobile variants |
| **Interactive state tokens** | Not built | No explicit Hover/Active/Focus/Disabled tokens — Focus states are an accessibility gap, not just style |
| **Per-section theme override ("escape hatch")** | Not built | A `PageSection` can't locally override the active theme (e.g. force one Hero to dark mode) |
| **Image/media treatment tokens** | Not built | No global aspect-ratio/object-fit/overlay defaults — `MediaPicker` images are raw URLs |
| **Z-index/elevation scale** | Not built | No shared stacking scale — future components manage z-index independently |
| **Presets/export/import/clone-across-tenants** | Partially built | `duplicate` exists (tenant-scoped copy) but no JSON export/import, no cross-tenant preset library beyond the 60 fixed templates |
| **Dark mode (Light/Dark/Auto)** | Not built | `TenantTheme` has no light/dark variant pairing |
| **Contrast validation (WCAG)** | Not built | The color pickers in `apps/tenant-admin/app/(admin)/website/theme/page.tsx` accept any hex with no contrast check |
| **`prefers-reduced-motion`** | Not built | No animation-settings concept exists yet at all |
| **RTL layout support** | Not built | No layout-mirroring toggle |
| **Font loading strategy** | Not built | `headingFont`/`bodyFont` are free-text strings with no `<link>`/`@font-face` injection, no subsetting, no FOUT/FOIT handling |
| **Global asset optimization** | Not built | No lazy-loading/WebP-AVIF/compression settings layer (Media Manager stores as-uploaded) |
| **Webhooks/event triggers** | Not built | No `page.published`/`form.submitted`/`theme.updated` event system |
| **Header/Footer/Navigation builder** | Not built | Biggest structural gap — no logo/nav/CTA/sticky-header/mega-menu/footer-columns editor exists; nav today is whatever `NavigationStyle` the chosen template hardcodes |
| **Website Builder hub expansion** | Not built | Still just template picker + tagline/description — no Email/SMTP, Domain SSL/DNS flow, legal-pages generator, site search, redirects, 404, maintenance mode |
| **Forms-Builder theme integration** | Not built | `PublicFormRenderer` takes a raw `colorPrimary` prop today, not the full input/label/validation token set a real integration would need |

## Suggested future build order (dependency-aware, calibrated to current code)

```
Phase 3   Theme draft/preview/publish safety      ← do this FIRST, before anything else below
                                                      (biggest risk given what's already live)
Phase 5   Advanced tokens (responsive/state/
          overrides/z-index/media treatment)
Phase 6   Header/Footer/Navigation builder         (biggest remaining structural gap)
Phase 4   Component-token contract + lint rule      (retrofit onto the 12 existing components)
Phase 7   Presets/export/import/dark mode
Phase 8   Accessibility & RTL
Phase 9   Website Builder hub expansion
Phase 10  Forms Builder theme integration
Phase 11  Builder UX polish (typography visualizer, multi-device preview,
          comments/annotations)                    ← safe to defer indefinitely
```

Reordered from the original submission: Phase 3 (draft safety) moves to the very
front because it's a live risk on code that already shipped, not a future
nice-to-have — everything else can wait, that one probably shouldn't. Each
phase remains its own standalone, multi-day-to-multi-week effort with its own
scoping/confirmation pass, same discipline used for every phase built so far.

---

# Next Session Plan (agreed, not yet started)

Two concrete workstreams for next session, in dependency order. Both are
scoped against the ACTUAL current code (verified this session), not
generic advice.

## A. Site Navigation — currently hardcoded, disconnected from any builder

**Confirmed this session:** `apps/tenant-website/components/SiteNav.tsx` has
a fully hardcoded links array — `About, Services, (Shop), Blog, Book,
Contact` — identical for every tenant regardless of whether they've ever
created a blog post, enabled booking, or even want those pages public.
`TemplateHome.tsx` (the homepage shell) has a **second, separate** hardcoded
nav, per design family, that doesn't share this list at all. Two independent
nav systems, neither connected to Menu Builder or Website Builder.

**Plan:**
1. New `SiteNavigation` concept (either a dedicated model, or a JSON field
   on `Tenant.settings` — decide based on whether per-item ordering/nesting
   is needed) storing which nav items are enabled, their label, order, and
   target (an internal Page slug, a built-in route like `/shop`, or an
   external URL).
2. Tenant-admin UI: a "Navigation" tab (likely under Website Builder, next
   to Theme/Pages/Menus/Forms/Media) to toggle/reorder/rename nav items —
   reusing the drag-and-drop pattern already built for Page sections
   (`@dnd-kit`, already a project dependency).
3. Auto-populate nav items from whatever real Pages exist (About, Services,
   Contact — already seeded per-tenant) plus conditionally Blog (only if the
   tenant has ≥1 published post) and Shop (only if `isEcommerceDomainCode`).
4. Unify `SiteNav.tsx` and `TemplateHome`'s inline nav into ONE component
   reading this new config — currently a template-family styling difference
   (centered/minimal/bottom-bar/classic), not a content difference, so this
   should be very achievable without visual regression per family.
5. Backfill existing tenants the same way `scripts/backfill-homepage.ts`
   backfilled Home/About/Services/Contact pages.

**Depends on:** nothing new — Pages, blog-post-count check, and
`isEcommerceDomainCode` all already exist.

## B. Theme Builder — full template-to-component breakdown

**Goal:** every one of the 60 `WebsiteTemplate` entries (5 design families ×
12 business types, `packages/shared/src/themes/templates.ts`) should have
its nav style, hero layout, footer structure, and card/button styling
exposed as structured, editable Theme Builder data — not hardcoded
conditionals inside `TemplateHome.tsx`/`EcommerceHome.tsx`/`SiteNav.tsx`.

**What exists today (verified, don't rebuild):**
- Color/font/radius tokens — done (`TenantTheme` model, layered resolution).
- Section *content* — done (`Page`/`PageSection` + the 12-component Library,
  real and editable, proven across fitness/ecommerce/salon this session).
- What's still template-hardcoded, not componentized: **hero layout variant**
  (`heroType`: split/fullscreen/floating-cards/editorial/bold-block — 5 fixed
  JSX blocks in `TemplateHome.tsx`), **nav style** (centered/minimal/
  bottom-bar/classic — see Workstream A above), **footer structure**, **card
  style / button style / icon style** (`cardStyle`, `ctaStyle`, `iconStyle`
  fields already exist on `WebsiteTemplate` but are only used as free-text
  labels today, not to drive actual rendering choices).

**Plan (in dependency order):**
1. **Nav + Footer** — folds into Workstream A above; do it first since hero
   layout choice and footer structure are the next two most-visible pieces.
2. **Hero layout as a Theme Builder-editable choice** — turn the 5 fixed
   `heroType` JSX blocks in `TemplateHome.tsx` into a `heroLayout` token on
   `TenantTheme` (enum: split/fullscreen/floating-cards/editorial/bold-block),
   selectable in Theme Builder independent of which of the 60 base templates
   was originally picked — this is the single highest-value item, since
   today heroType is permanently locked to whichever template was chosen at
   signup with no way to change it without recreating the theme from
   scratch.
3. **Footer structure as data** — same treatment: columns/links/social/
   newsletter presence as a `TenantTheme` (or new `SiteFooterConfig`) field,
   rendered by one shared `SiteFooter` component instead of whatever's
   hardcoded per family today.
4. **Card/button/icon style tokens actually wired to rendering** — make
   `cardStyle`/`ctaStyle`/`iconStyle` real Theme Builder-editable enums
   (e.g. card: flat/elevated/bordered/glass; button: solid/outline/ghost)
   that `PageSectionRenderer` and `TemplateHome` both read, instead of the
   current per-family-hardcoded Tailwind classes.
5. **Migration/compatibility decision** (from the earlier deep-dive, still
   open): do the 60 fixed templates become **presets** that populate these
   new structured fields once, or do they stay a separate concept forever?
   Recommend: presets — a template becomes "apply these hero/nav/footer/card
   choices to my TenantTheme," collapsing two systems into one, matching the
   "everywhere should use the same components" direction from this session.
6. **Visual regression safety** — before touching `TemplateHome.tsx`'s hero
   blocks, snapshot-test (even simple screenshot diffing) all 5 heroTypes ×
   a sample of business types, since this file is the production renderer
   for every existing template-based tenant, same caution applied to the
   domain-code/homepage fixes this session.

**Depends on:** Workstream A's nav unification should land first (same file,
`TemplateHome.tsx`, touched by both) to avoid two large refactors colliding
in the same component.

**Not in scope for either workstream:** version control (still explicitly
descoped), full drag-and-drop repositioning of nav items visually on the
live preview (list-based reorder is enough), multi-language nav labels.
