# DEXO Brand Guide for Developers

> Source of truth: `brand/` (strategy, color, typography, logo, design system).
> This doc translates those guidelines into **rules you follow while writing code**,
> and defines the boundary between the **Dexo platform brand** and a **tenant's own brand**.

---

## 1. The two-brand model

Dexo is a white-label platform. Two identities coexist and must never be confused:

| | Dexo platform brand | Tenant brand |
|---|---|---|
| Where | platform-web (:3001), platform-admin (:3002), docs, emails sent by the platform | tenant-website (:4005), tenant-admin (:4006) accents, tenant-app (:4007), tenant emails |
| Primary color | **Dexo Indigo `#4F46E5`** — fixed | Tenant's own (`DomainTheme` / `BusinessTypeTemplate.colorPrimary`) |
| Accent | Volt Lime `#A3E635` (decorative only) | Tenant's own accent |
| Logo | Tenant Cube mark + DEXO wordmark | Tenant's logo; Dexo appears only as **"Powered by DEXO"** attribution |
| Typography | Space Grotesk / Inter / JetBrains Mono — fixed | Same type foundation (tenants may override via website templates) |
| Neutrals, radius, shadows, motion | Dexo foundation — fixed everywhere | Inherited from the foundation |

**The rule:** tenants customize the **semantic layer only** (their primary color, logo, name,
website content). The foundation — neutrals, type stack, spacing, radius, shadows, motion,
component behavior — is Dexo and is shared by every tenant. A tenant can *enhance their own
identity*; they cannot *restyle the platform*.

## 2. Token architecture (how white-labeling works in code)

Three layers (`brand/Design/17-design-system.md`):

```
primitive        →  semantic            →  component
indigo-600          --dx-primary           dx-button-primary-bg
zinc-200            --dx-border            card border
```

- **Primitives** live in `packages/ui/tailwind-preset.js` (Tailwind) and are never used
  directly in components.
- **Semantic tokens** live in `packages/ui/src/styles/dexo-brand.css` as `--dx-*` CSS
  variables (light + dark). **Components reference only these.**
- **Tenant override**: set `--dx-primary` (and optionally `--dx-primary-hover`) on a wrapper
  element at runtime — see `TenantSidebar.tsx`, which applies the tenant theme color as
  `style={{ '--dx-primary': theme.primary }}`. Nothing else changes; the whole UI rebrands.

**Never hardcode hex values in components.** If you need a color, use a `--dx-*` var or a
preset utility (`bg-dexo`, `text-danger`, `bg-surface-1`, …).

## 3. Using the foundation in an app

Every Next.js app already wires the foundation:

1. **Tokens** — `app/globals.css` imports `packages/ui/src/styles/dexo-brand.css`.
2. **Fonts** — the root layout loads Inter (`--font-inter`), Space Grotesk (`--font-grotesk`)
   and JetBrains Mono (`--font-jbmono`) via `next/font`.
   - Tailwind v4 apps (platform-web, platform-admin, tenant-admin, tenant-website): mapped in
     `@theme inline` in `globals.css` → `font-sans`, `font-display`, `font-mono` utilities.
   - Tailwind v3 apps (tenant-app): mapped by the shared preset
     `presets: [require('../../packages/ui/tailwind-preset')]` in `tailwind.config.ts`.
3. **Logo** — `import { DexoLogo, DexoMark } from '@dexo/ui'` (variants: `light`, `dark`,
   `mono`). Favicon: `app/icon.svg` = the Tenant Cube mark.

## 4. Hard rules (from `brand/Brand/*`)

- **Color**
  - Dexo Indigo `#4F46E5` for primary actions; one solid primary button per view.
  - Volt Lime is **decorative only** — glows, highlights, data accents. Never large fills,
    **never text on white** (2.0:1 contrast — fails WCAG).
  - Neutrals are the zinc scale; body text ≥ 4.5:1 contrast; never encode meaning by color
    alone.
- **Typography**
  - Space Grotesk **only at 24px+** and only for headlines/stat numerals — never paragraphs
    or UI controls. Inter 400/500/600 for everything else. JetBrains Mono for code, IDs, API
    keys and **numeric table columns** (right-aligned, `tabular-nums` → `.dx-tabular`).
  - No font weights below 400. Headlines: sentence case, no periods.
- **Shape & elevation** — 4px chips · 8px inputs/buttons · **10px cards (signature)** ·
  16px modals · full pills/avatars. Light theme uses `--dx-shadow-*`; dark theme prefers
  1px borders + `--dx-glow`.
- **Motion** — 150ms micro / 250ms component / 400ms page, `cubic-bezier(0.2,0,0,1)`
  (`--dx-ease`), 8–16px travel max, always honor `prefers-reduced-motion` (the brand CSS
  zeroes durations automatically).
- **Logo** — never rotate, outline, shadow, recolor outside the palette, or place on busy
  imagery without a scrim. Minimum 16px for the mark, 96px for the lockup. Clear space =
  25% of mark height.
- **Accessibility** — WCAG 2.2 AA. Focus ring 2px Indigo offset 2 (Lime on dark — provided
  globally by the brand CSS). Touch targets ≥ 44px.

## 5. What a tenant MAY and MAY NOT change

**May (self-service, no code):**
- Primary/accent colors, logo, business name, website hero/sections, fonts on their public
  website (`BusinessTypeTemplate` / tenant branding settings).
- Their transactional email identity (from-name/address via tenant SMTP settings).

**May (with development, on their tenant surface):**
- Add pages/modules to tenant-admin & tenant-app that follow the Dexo component patterns
  (`_ui.tsx` primitives, token-driven styling).

**May not:**
- Use or modify the Dexo logo/wordmark as their own, or remove "Powered by DEXO" attribution.
- Restyle the platform apps (:3001/:3002) or the shared component foundation.
- Introduce raw hex colors into shared components (breaks every other tenant's white-label).
- Use Dexo Indigo + Volt Lime together as *their* brand palette — that combination **is** the
  Dexo identity; a tenant brand must be visually distinct from it.

## 6. Checklist for every PR that touches UI

- [ ] No raw hex in components — tokens/utilities only
- [ ] Primary action styled from `--dx-primary` (so tenant override works)
- [ ] Headlines ≥24px use `font-display`; body uses Inter; numbers in tables use mono
- [ ] Card radius 10px, inputs/buttons 8px
- [ ] Focus visible, contrast ≥ 4.5:1, meaning not carried by color alone
- [ ] Works in both light and dark token sets (`[data-theme="dark"]`)
- [ ] Tenant surfaces show tenant brand; platform surfaces show Dexo brand; no cross-bleed
