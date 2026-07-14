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

---

## Workstream B item 3 — Footer structure as data — done (2026-07-14, second follow-up session)

Item 3 in the "Theme Builder — full template-to-component breakdown" plan
above ("Footer structure as data") is now built, following the exact same
recipe `heroLayout` proved out in the previous session.

**Confirmed before starting:** `SiteFooter.tsx`
(`apps/tenant-website/components/SiteFooter.tsx`) was already the SHARED
footer component for every public page except the homepage shell — used by
`about`, `contact`, `blog`, `blog/[slug]`, `book`, `login`, `register`,
`services`, `shop`, `shop/[slug]`, and `EcommerceHome.tsx`. Only
`TemplateHome.tsx` (the homepage shell) had its own second, separately
hardcoded `<footer>` block (a fixed Home/About/Services/Book/Join/Contact
link row + a plain copyright line) — the same "second hardcoded copy" shape
Workstream A found for nav before unifying it. `apps/tenant-website/app/page.tsx`
also has a third, legacy inline footer (lines ~245-261) that only renders for
tenants with no `WebsiteTemplate` chosen at all (pre-template legacy path) —
left untouched, out of scope, since it's dead for any tenant with a template.

- `TenantTheme.footerConfig` (nullable `Json`, matching the flexible-JSON
  convention already used by `PageSection.content` rather than a rigid
  Postgres schema) added to `prisma/schema.prisma`. Shape:
  `{ columns: [{ title, links: [{ label, url }] }], socialLinks: [{ platform,
  url }], showNewsletter: boolean, copyrightText: string }`. Migration
  `prisma/migrations/20260714200000_theme_footer_config/migration.sql`
  (`ALTER TABLE "TenantTheme" ADD COLUMN "footerConfig" JSONB`). Applied via
  `npx prisma db push` (same pre-existing reason as `heroLayout`'s session:
  this table's recent columns were never captured via `prisma migrate dev`
  history). `npx prisma generate` hit the same pre-existing `EPERM` on the
  native query-engine `.dll.node` binary (a running dev server holds the
  lock) — confirmed the generated `node_modules/.prisma/client/index.d.ts`
  picked up `footerConfig` anyway (grep-verified), which is what
  typecheck/build depend on.
- Wired through the exact same draft/publish/preview/revert lifecycle as
  every other token: added `'footerConfig'` to `TOKEN_FIELDS` in
  `apps/api/src/modules/theme-builder/theme-builder.service.ts` (drives
  `updateTheme`/`publish`/`revertToLastPublished`/`getActiveTheme`
  automatically) and to the explicit field list in `duplicateTheme`. No
  controller changes needed.
- `apps/tenant-website/lib/site-theme.ts`: new exported `FooterConfig`
  interface; `ActiveTheme` and `SiteTheme` both gained `footerConfig`;
  `getSiteTheme()` resolves it (`activeTheme?.footerConfig || undefined`)
  through the same published/draft/preview-token path as every other token.
- `apps/tenant-website/components/SiteFooter.tsx`: now reads
  `theme.footerConfig` — when set, renders multi-column link groups, social
  links, an optional "Stay in touch" newsletter line, and a custom copyright
  line; when unset, renders EXACTLY the same fixed link row + plain
  copyright line it rendered before this change, so every page that already
  used `SiteFooter` (about/contact/blog/book/login/register/services/
  shop/EcommerceHome) needed zero further changes — `footerConfig` flows
  through automatically since they already pass the full resolved `theme`
  object.
- `apps/tenant-website/components/TemplateHome.tsx`: replaced its own
  inline hardcoded `<footer>` block with `<SiteFooter theme={navTheme}
  name={name} contact={contact} />` — the SAME shared component every other
  page uses, collapsing the "second hardcoded footer" the same way
  Workstream A collapsed the second hardcoded nav. Added a
  `footerConfig?: FooterConfig | null` prop, threaded into `navTheme` (the
  `SiteTheme`-shaped object this shell already builds for `SiteNav`).
  `apps/tenant-website/app/page.tsx` now passes `footerConfig={theme.footerConfig}`
  into `TemplateHome`.
- Tenant-admin UI: `apps/tenant-admin/app/(admin)/website/theme/page.tsx` —
  a `FooterEditor` component (same "list of structured items" convention as
  `ComponentFieldsEditor.tsx`'s `list` field type: add/remove/edit rows, no
  drag-and-drop) added inside the theme editor panel: add/remove link
  columns with a title and per-column add/remove links (label + URL),
  add/remove social links (platform + URL), a newsletter show/hide checkbox,
  and a copyright text field. Edits call a new `saveFooterConfig()` function
  that pushes the FULL config object through the same
  `themeBuilderApi.update`/draft/preview flow every other token uses (added
  right alongside the existing `saveToken()`), so footer edits land in draft
  and show in the existing live-preview iframe exactly like a color or hero
  layout change.
- Verification: confirmed via `packages/shared/src/themes/templates.ts` and
  a read of `TemplateHome.tsx`'s footer block before this change that the
  footer was NOT visually different per design family (unlike hero layout) —
  it was one plain text-link row shared by all 5 families/60 templates, so
  there was no per-family layout skeleton to preserve; only the CONTENT
  SOURCE changed (hardcoded strings → resolved theme data), matching the
  "content-source change, not a redesign" instruction exactly.
  `npx tsc -p apps/api/tsconfig.typecheck.json` — clean, no errors. `next
  build --no-lint` for `tenant-website` — clean, all 21 routes generate
  (including `/`, `/about`, `/shop`, `/shop/[slug]` which exercise both
  `TemplateHome`'s new `SiteFooter` usage and `EcommerceHome`'s pre-existing
  one). `next build --no-lint` for `tenant-admin` — clean, all routes
  including `/website/theme` and `/website/pages/[id]` (the two pre-existing
  errors noted in earlier sessions no longer reproduce on this `HEAD`,
  confirming they were already fixed by an unrelated commit, same as
  observed in the `heroLayout` session).
- `npx prisma db push --skip-generate` applied the new `footerConfig` JSONB
  column to the local dev DB (`postgresql://...@127.0.0.1:5433/dexo`)
  cleanly.

**Still open, Workstream B items 5-6** (unchanged scope; item 4 is now also
done — see "Workstream B item 4 — Card/button/icon style tokens actually
wired to rendering — done" further up in this document):
- **Item 5 (templates-as-presets migration decision)** — still an open
  decision, not started.
- **Item 6 (visual regression snapshot tooling)** — still not built as
  actual tooling.

---

## Workstream B item 4 — Card/button/icon style tokens actually wired to rendering — done (2026-07-14, third follow-up session)

Item 4 in the "Theme Builder — full template-to-component breakdown" plan
above is now built, following the exact same recipe `heroLayout` and
`footerConfig` proved out in the previous two follow-up sessions.

**Confirmed before starting:** `WebsiteTemplate.cardStyle/ctaStyle/iconStyle`
(`packages/shared/src/themes/templates.ts`) are assigned per design family,
one value each across all 5 families: `cardStyle` — aurora=`elevated`,
maison=`image-overlay`, slate=`flat-bordered`, nocturne=`glassmorphism`,
bloc=`thick-border`; `ctaStyle` — aurora=`gradient-banner`,
maison=`full-width-banner`, slate=`inline-text`, nocturne=`floating-glow`,
bloc=`sticky-bar`; `iconStyle` — aurora=`outline`, maison=`thin-line`,
slate=`geometric`, nocturne=`duotone`, bloc=`filled`. Unlike `heroType`
(5 fully distinct hardcoded JSX blocks) or even `footerConfig`'s partial
precedent, these three were confirmed **completely inert** before this
session: `PageSectionRenderer.tsx`'s features/testimonials/pricing cards
were always `rounded-xl border border-gray-200` regardless of family,
CTA/hero/newsletter buttons were always `rounded-lg font-semibold
text-white`, and no icon rendering of any kind exists anywhere on the
public site (no icon library, no per-item icon field in the public Page
Builder schema) — so `iconStyle` had literally nothing to drive. Only
`TemplateHome.tsx`'s placeholder "journey" cards and bottom CTA section had
a single `tpl.family === 'bloc'` special case, not real per-token variance.

- `TenantTheme.cardStyle`/`ctaStyle`/`iconStyle` (all nullable `String?`,
  same free-text-validated-at-the-app-layer convention as `heroLayout` —
  not Postgres enums) added to `prisma/schema.prisma`, matching the exact
  same 5-value vocabularies as `WebsiteTemplate.cardStyle/ctaStyle/iconStyle`
  so an existing template's values remain valid choices. Migration
  `prisma/migrations/20260714230000_theme_card_cta_icon_style/migration.sql`
  (`ALTER TABLE "TenantTheme" ADD COLUMN "cardStyle"/"ctaStyle"/"iconStyle"
  TEXT`). Applied via `npx prisma db push --skip-generate` (same
  pre-existing reason as `heroLayout`/`footerConfig`'s sessions — this
  table's recent columns were never captured via `prisma migrate dev`
  history). `npx prisma generate` hit the same pre-existing `EPERM` on the
  native query-engine `.dll.node` binary (a running dev server holds the
  lock) — confirmed the generated `node_modules/.prisma/client/index.d.ts`
  picked up all three fields anyway (grep-verified), which is what
  typecheck/build depend on.
- Wired through the exact same draft/publish/preview/revert lifecycle as
  every other token: added `'cardStyle', 'ctaStyle', 'iconStyle'` to
  `TOKEN_FIELDS` in
  `apps/api/src/modules/theme-builder/theme-builder.service.ts` and to the
  explicit field list in `duplicateTheme`. No controller changes needed.
- `apps/tenant-website/lib/site-theme.ts`: `ActiveTheme` and `SiteTheme` both
  gained `cardStyle`/`ctaStyle`/`iconStyle`; `getSiteTheme()` resolves all
  three (`activeTheme?.cardStyle || undefined`, etc.) through the same
  published/draft/preview-token path as every other token.
- New shared helper `apps/tenant-website/lib/style-tokens.ts`:
  `resolveCardStyle`/`resolveCtaStyle`/`resolveIconStyle` (Theme Builder
  token wins, falls back to the tenant's original template's value,
  validated against the known 5-value vocabularies — same pattern as
  `TemplateHome.tsx`'s pre-existing `KNOWN_HERO_TYPES` check) plus
  `cardClasses`/`ctaButtonClasses`/`ctaButtonStyle`/`iconAccentClasses`/
  `iconAccentStyle` — structural Tailwind class + inline-style mapping
  functions. Each function's `default`/unrecognized branch reproduces the
  EXACT class string that was hardcoded at each call site before this
  token existed (e.g. `cardClasses(undefined)` === `'rounded-xl border
  border-gray-200'`), so any caller that doesn't resolve a valid token
  value renders identically to before.
- `apps/tenant-website/components/PageSectionRenderer.tsx`: gained
  `cardStyle`/`ctaStyle`/`iconStyle` optional props; features/testimonials/
  pricing cards now use `cardClasses()`, all CTA-style anchors/buttons
  (hero, cta, newsletter subscribe) use `ctaButtonClasses()`/
  `ctaButtonStyle()`, and a small icon-accent element (new — nothing
  existed to replace) was added before each `features` item's title using
  `iconAccentClasses()`/`iconAccentStyle()`. Callers that don't pass these
  props (about/services/[slug]/preview pages — legacy hardcoded paths
  pre-dating this work, out of scope same as footer's "third hardcoded
  footer" note) render exactly as before.
- `apps/tenant-website/components/TemplateHome.tsx`: added
  `cardStyle?`/`ctaStyle?`/`iconStyle?: string | null` props; resolved via
  `resolveCardStyle`/`resolveCtaStyle`/`resolveIconStyle` against
  `tpl.cardStyle`/`tpl.ctaStyle`/`tpl.iconStyle`. The placeholder "journey"
  cards now use `cardClasses()` (replacing the old single
  `tpl.family === 'bloc'` special case) and an icon-accent element
  (replacing the old plain `<span className="block h-1.5 w-10 mb-4">` bar,
  now styled via `iconAccentClasses()`). The bottom CTA section (the
  standalone banner before the footer, distinct from the 5 hero-layout
  JSX blocks which were left untouched per the `heroLayout` session's own
  precedent of keeping those blocks "exactly as they were") now switches
  on `resolvedCtaStyle` instead of `tpl.family === 'bloc'`/`dark`, with the
  fallback (no theme override set) reproducing each family's prior look:
  `sticky-bar` === bloc's existing thick-border banner, `floating-glow` ===
  nocturne's existing dark-gradient section, and
  `gradient-banner`/`full-width-banner`/`inline-text` render the same
  solid-accent-section background every other family already had, now
  differentiated by button treatment (this is the one deliberate expansion
  beyond "zero visual change" — matching the plan's explicit goal that
  `PageSectionRenderer`/`TemplateHome` "read them... instead of the current
  per-family-hardcoded Tailwind classes", i.e. finally making the
  per-family design intent in the data visible, not a redesign of the
  vocabulary itself). `apps/tenant-website/app/page.tsx` now passes
  `cardStyle={theme.cardStyle}`, `ctaStyle={theme.ctaStyle}`,
  `iconStyle={theme.iconStyle}` into `TemplateHome`.
- `apps/tenant-website/components/EcommerceHome.tsx`: `PageSectionRenderer`
  calls now pass `theme.cardStyle/ctaStyle/iconStyle` through (ecommerce
  tenants have no `WebsiteTemplate`/family default, so these are `undefined`
  unless a tenant explicitly sets one in Theme Builder — zero behavior
  change otherwise). The "Shop Now" hero button and "View All Products"
  promo-banner button now use `ctaButtonClasses()`/`ctaButtonStyle()`
  (falling back to the exact prior inline style when unset). `ProductCard`'s
  surface style now branches on `theme.cardStyle` (`thick-border` → 3px
  border, `elevated` → boxShadow + no border, `glassmorphism` → backdrop
  blur, anything else/unset → the exact original 1px-border inline style).
- Tenant-admin UI: `apps/tenant-admin/app/(admin)/website/theme/page.tsx` —
  three 5-option pickers (Card style, Button/CTA style, Icon style), each
  with the same tiny inline-sketch-per-option convention as the existing
  hero layout picker, added directly below it inside the theme editor
  panel. Saving (or re-clicking the selected option to clear it) goes
  through the same `saveToken`/`themeBuilderApi.update` path as every
  other token (the `key === 'heroLayout'` empty-string-to-null branch in
  `saveToken` was generalized to also cover `cardStyle`/`ctaStyle`/
  `iconStyle`), landing in draft and showing in the existing live-preview
  iframe exactly like a hero layout or color change.
- Verification: confirmed via `packages/shared/src/themes/templates.ts`
  that each of `cardStyle`/`ctaStyle`/`iconStyle` is one fixed value per
  design family (not per business type), so the fallback path in
  `TemplateHome.tsx` is exercised identically across all 12 business types
  within a family — same reasoning the `heroLayout` session used to stand
  in for screenshot-based visual regression (full snapshot tooling remains
  item 6, still not started). Read through the resolved rendering logic
  for a sample of combinations (aurora/fitness with default `elevated`+
  `gradient-banner`+`outline`; bloc/ecommerce with default `thick-border`+
  `sticky-bar`+`filled`; nocturne/salon with default `glassmorphism`+
  `floating-glow`+`duotone`) and confirmed each produces a sensible,
  non-broken class/style combination with no `undefined`/`NaN` leaking into
  `className` or inline `style`. `npx tsc -p apps/api/tsconfig.typecheck.json`
  (from `apps/api`) — clean, no errors. `npx tsc --noEmit -p tsconfig.json`
  in both `apps/tenant-website` and `apps/tenant-admin` — clean, no errors
  (per this session's instruction, `next build` was intentionally NOT run
  in either app, since a dev server was active against their `.next`
  folders and a full build previously corrupted the dev server's webpack
  chunk cache).
- `npx prisma db push --skip-generate` applied the three new `TEXT` columns
  to the local dev DB (`postgresql://...@127.0.0.1:5433/dexo`) cleanly.

**Still open, Workstream B items 5-6** (unchanged scope):
- **Item 5 (templates-as-presets migration decision)** — still an open
  decision, not started.
- **Item 6 (visual regression snapshot tooling)** — still not built as
  actual tooling; this session (like the two before it) used typecheck +
  read-through-the-resolved-rendering-logic as the lightweight substitute,
  not a replacement for real snapshot tooling.

**Updated suggested build order** (everything else in the original
Workstream B plan is now done): only item 5 (templates-as-presets
migration decision) and item 6 (visual regression snapshot tooling) remain
of the original 6-item plan.

---

# Completed this session (2026-07-14)

Both Workstream A (Site Navigation) and Workstream B/Phase 3 (Theme Builder
draft/live isolation) are now built, wired end-to-end, typechecked, and
building cleanly. Workstream B's items 2-6 (hero layout, footer structure,
card/button/icon tokens, template-to-preset migration, visual regression
snapshotting) remain **not started** — only Phase 3 (draft safety) from
Workstream B was in scope for this session, per the doc's own reordering
("Phase 3 ... FIRST, before anything else below").

## Workstream B item 2 — Hero layout as a Theme Builder-editable choice — done (2026-07-14, follow-up session)

Item 1 in the "Theme Builder — full template-to-component breakdown" plan
above ("Hero layout as a Theme Builder-editable choice") is now built. The 5
fixed `heroType` JSX blocks in `TemplateHome.tsx` stay exactly as they were —
only WHERE the choice of which block to render comes from changed.

- `TenantTheme.heroLayout` (nullable `String?`, not a Postgres enum — kept
  consistent with the free-text style already used for `headingFont`/
  `bodyFont` on the same table, validated at the application/UI layer
  against the 5 known `HeroType` values instead) added to
  `prisma/schema.prisma`. Migration
  `prisma/migrations/20260714190000_theme_hero_layout/migration.sql`.
  Applied via `npx prisma db push` (same reason as the prior session: recent
  tables on this DB were never captured via `prisma migrate dev` history, so
  a real `migrate dev` fails shadow-DB replay — a pre-existing inconsistency,
  not introduced here). `npx prisma generate` hit the same pre-existing
  `EPERM` on the native query-engine `.dll.node` binary (a running dev
  server still holds the lock) — the generated TypeScript types (what
  typecheck/build actually depend on) were refreshed and confirmed correct
  regardless.
- Wired through the exact same draft/publish/preview/revert lifecycle as
  every other token — no parallel mechanism: added `'heroLayout'` to
  `TOKEN_FIELDS` in `apps/api/src/modules/theme-builder/theme-builder.service.ts`
  (drives `updateTheme`/`publish`/`revertToLastPublished`/`getActiveTheme`
  automatically, since they all operate generically over `TOKEN_FIELDS`) and
  to the explicit field list in `duplicateTheme`. No controller changes
  needed (`theme-builder.controller.ts` already passes `dto` through
  generically to `updateTheme`).
- `apps/tenant-website/lib/site-theme.ts`: `ActiveTheme` interface and the
  public `SiteTheme` interface both gained `heroLayout`; `getSiteTheme()`
  resolves it (`activeTheme?.heroLayout || undefined`) through the same
  published/draft/preview-token path as every other color/font token.
- `apps/tenant-website/components/TemplateHome.tsx`: added a
  `heroLayout?: string | null` prop; a `resolvedHeroType` value (validated
  against the 5 known `HeroType` strings, falling back to `tpl.heroType` if
  unset or unrecognized) replaces `tpl.heroType` in all 5 hero-block
  conditionals. `apps/tenant-website/app/page.tsx` now passes
  `heroLayout={theme.heroLayout}` from the resolved theme into `TemplateHome`.
- Tenant-admin UI: `apps/tenant-admin/app/(admin)/website/theme/page.tsx` —
  a 5-option hero layout picker (Split/Fullscreen/Floating cards/Editorial/
  Bold block, each with a tiny inline text sketch) added next to the
  existing color/font/radius controls inside the theme editor panel. Saving
  a selection (or clicking the already-selected option again to clear it)
  goes through the same `saveToken`/`themeBuilderApi.update` path already
  used for every other token, so it lands in draft and shows in the existing
  live-preview iframe (`?theme_preview=` signed token) exactly like a color
  change — no new preview plumbing needed.
- Verification: confirmed via `packages/shared/src/themes/templates.ts` that
  `heroType` is assigned per **design family** (`aurora`→split,
  `maison`→fullscreen, `slate`→editorial, `nocturne`→floating-cards,
  `bloc`→bold-block), applied identically across all 12 business types
  within a family — so the override logic in `TemplateHome.tsx` (a plain
  string match against `KNOWN_HERO_TYPES`) is exercised identically
  regardless of business type; no per-business-type special-casing exists
  that could break. Combined with clean builds below, this stands in for
  screenshot-based visual regression for this item (full snapshot tooling is
  item 6/its own separate task, still not started, see below).
  `npx tsc -p apps/api/tsconfig.typecheck.json` — clean, no errors. `next
  build --no-lint` for `tenant-website` — clean, all 21 routes still
  generate. `next build --no-lint` for `tenant-admin` — clean (the two
  pre-existing errors noted in the prior session's Verification section,
  `archivePage`/`ComponentFieldsEditor.tsx`, no longer reproduce on this
  `HEAD` — already fixed by an unrelated commit between sessions, not by
  this work).

**Still open, Workstream B items 4-6** — see the "Workstream B item 3 —
Footer structure as data — done" section further up in this document (added
in a later follow-up session) for the up-to-date status: item 3 (footer) is
now also done, following this same `heroLayout` recipe; items 4-6 remain
open with the same notes as before.

## A. Site Navigation — done

- New `SiteNavigation` concept: stored as JSON on `Tenant.settings.navigation.items`
  (no new Prisma model/migration — a deliberate lighter-weight choice than
  Menu Builder, since nav items are a small flat list with no nesting
  requirement). `apps/api/src/modules/site-navigation/site-navigation.service.ts`.
- Tenant-scoped CRUD + bulk reorder API, JWT-guarded, audit-logged same as
  every other builder module, plus an unauthenticated
  `GET /site-navigation/public/:subdomain` for the live site.
  `apps/api/src/modules/site-navigation/site-navigation.controller.ts`.
  Registered in `apps/api/src/app.module.ts` (`SiteNavigationModule`,
  already present alongside `ThemeBuilderModule`).
- Auto-populate from real Pages (About/Services/Contact)/Blog (only if
  ≥1 published post)/Shop (only if `isEcommerceDomainCode`), lazily on first
  read (`ensureDefaults`) — verified logic matches
  `SiteNavigationService.buildDefaultItems`.
- Tenant-admin "Navigation" tab: `apps/tenant-admin/app/(admin)/website/navigation/page.tsx`
  — `@dnd-kit` drag-reorder, inline rename, enable/disable toggle, add
  custom link (internal page slug / built-in route / external URL). Added
  to the sub-nav in `apps/tenant-admin/components/WebsiteSubNav.tsx`.
  `siteNavigationApi` added to `apps/tenant-admin/lib/api.ts`.
- `SiteNav.tsx` and `TemplateHome.tsx` unified onto ONE nav data source
  (`getSiteNav()` in `lib/api.ts`) — `TemplateHome.tsx` now renders
  `<SiteNav>` itself instead of its own second hardcoded link list, passing
  through `ctaLabel`/`showShop` so all 5 template-family nav styles
  (centered/minimal/bottom-bar/classic) are visually unchanged. Verified:
  every public route (`/`, `/about`, `/services`, `/book`, `/contact`,
  `/login`, `/register`, `/blog`, `/blog/[slug]`, `/shop`, `/shop/[slug]`)
  now fetches and passes `navItems`; both legacy hardcoded lists are kept
  only as an empty-list fallback so a subdomain the nav API can't reach
  doesn't regress to a blank nav.
- Backfill script `scripts/backfill-navigation.ts` — idempotent, dry-run
  supported, mirrors `scripts/backfill-homepage.ts`'s tenant-loop pattern.
  Registered npm scripts this session (neither backfill script had one
  before): `npm run backfill:navigation`, `npm run backfill:homepage`.

## B. Theme Builder Phase 3 (draft/live isolation) — done

- `TenantTheme.status` (`ThemeStatus` enum: `draft`/`published`, default
  `published` so existing themes aren't retroactively hidden),
  `lastPublishedSnapshot` (Json?), `lastPublishedAt` added to
  `prisma/schema.prisma`. Migration
  `prisma/migrations/20260714174608_theme_draft_publish/migration.sql`
  verified to match the schema diff exactly.
- `updateTheme()` now always lands in `draft` status and never touches the
  live site directly; a separate explicit `publish(themeId)` action flips
  it live and refreshes the "last known good" snapshot; `revertToLastPublished()`
  does a one-click restore-and-republish from that single snapshot (no full
  version history, per the earlier explicit descope).
  `apps/api/src/modules/theme-builder/theme-builder.service.ts`.
- `getActiveTheme()` (the public resolver consumed by
  `apps/tenant-website/lib/site-theme.ts`) now serves published tokens only
  to normal visitors — an in-progress draft on the active theme falls back
  to `lastPublishedSnapshot` instead of ever showing unpublished edits
  live. A signed, HMAC-verified, 24h-expiring preview token (`createPreviewToken`)
  bypasses this for admin preview use, checked before the published-only path.
- New controller routes: `POST /themes/:id/publish`, `POST /themes/:id/revert`,
  `POST /themes/:id/preview-token`; `GET /themes/public/:subdomain/active`
  now accepts `?preview=<token>`. `apps/api/src/modules/theme-builder/theme-builder.controller.ts`.
- Tenant-admin Theme Builder UI: "Publish theme" button and "Revert to last
  published" action, an "Unpublished edits" badge on the active theme when
  its status is `draft`, and the live-preview iframe now carries the signed
  preview token (`?theme_preview=`) so admins see draft edits before
  publishing while real visitors don't.
  `apps/api/src/modules/theme-builder/theme-builder.controller.ts` (client-side:
  `apps/tenant-admin/app/(admin)/website/theme/page.tsx`,
  `themeBuilderApi.publish/revert/previewToken` in `apps/tenant-admin/lib/api.ts`).
- Public site plumbing: `getSiteTheme()` in `apps/tenant-website/lib/site-theme.ts`
  accepts an optional `previewToken` param, threaded from a `?theme_preview=`
  query param on `apps/tenant-website/app/page.tsx`.

## Verification performed this session

- `npx tsc -p apps/api/tsconfig.typecheck.json` — clean, no errors.
- `next build --no-lint` for `tenant-website` — clean, builds and
  statically generates all 21 routes.
- `next build --no-lint` for `tenant-admin` — fails, but on two
  **pre-existing, unrelated** errors already present in `HEAD` before this
  session touched anything (confirmed via `git diff --stat` showing zero
  changes to either file this session):
  `app/(admin)/website/pages/[id]/page.tsx:203` (`pageBuilderApi.archivePage`
  doesn't exist — a Page Builder bug, not Site Navigation/Theme Builder) and
  `components/ComponentFieldsEditor.tsx:163/168/173` (function declarations
  inside blocks under strict mode — a Component Library issue). Left
  untouched per this session's scope (nav/theme only).
- Fixed one pre-existing, already-committed bug that was blocking the
  `tenant-website` build entirely (not something added by the nav/theme
  work, but it prevented verifying that work end-to-end): `LEGACY` theme
  fallback object in `apps/tenant-website/lib/site-theme.ts` was missing
  `blogEnabled`/`bookEnabled`, which the `SiteTheme` interface has required
  since an earlier commit. Added `blogEnabled: true, bookEnabled: true` to
  the object.
- Prisma: schema and migration file are consistent with each other. The
  local dev DB (`postgresql://...@127.0.0.1:5433/dexo`, confirmed local —
  safe to modify) was 21 migrations behind `migrate status`, and the new
  migration failed the shadow-DB replay with `migrate dev` because
  `TenantTheme`'s own `CREATE TABLE` was never captured in migration
  history in the first place (it and other recent tables were previously
  applied via `prisma db push`, not `prisma migrate dev` — a pre-existing
  inconsistency, not introduced this session). Used `npx prisma db push`
  instead, which applied the new columns/enum cleanly, followed by
  `npx prisma generate` (the native query-engine binary swap failed with
  `EPERM` because a running dev-server process had it locked; the
  generated TypeScript types were still refreshed and are correct, which
  is what typecheck/build depend on — the locked `.dll.node` binary itself
  doesn't affect anything until a Prisma-invoking process is restarted).

## Still open / deferred (out of scope for this session, unchanged from before)

- Workstream B items 2-6 as of THIS session's writing (unchanged note, kept
  for history): not started. **Update from later follow-up sessions:** item
  2 (hero layout), item 3 (footer structure as data), and item 4 (card/
  button/icon style tokens wired to rendering) are now all done — see
  "Workstream B item 2 — Hero layout...", "Workstream B item 3 — Footer
  structure as data...", and "Workstream B item 4 — Card/button/icon style
  tokens actually wired to rendering..." sections elsewhere in this
  document. Item 5 (60-templates-as-presets migration decision) and item 6
  (visual regression snapshotting) remain not started.
- The two pre-existing `tenant-admin` build errors noted above
  (`archivePage`, `ComponentFieldsEditor.tsx` strict-mode function
  declarations) — real bugs, but Page Builder/Component Library issues,
  out of scope for Site Navigation/Theme Builder work.
- Restart of the dev-server process holding the Prisma query-engine binary
  lock, if a fully regenerated native binary (vs. just refreshed TS types)
  is needed before deploying.
