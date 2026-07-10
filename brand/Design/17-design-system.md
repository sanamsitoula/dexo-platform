# DEXO — Design System ("Dexo UI")

Foundations come from `Brand/03` (color) and `Brand/04` (type). All components use tokens only — no raw hex in components (white-label requirement: swap tokens, rebrand everything).

## Buttons
| Variant | Style | Use |
|---|---|---|
| Primary | Solid Indigo, white text | One per view |
| Secondary | `surface-2` bg, 1px border | Default action |
| Ghost | Transparent, text-color | Toolbars, tertiary |
| Danger | Solid `danger` | Destructive, always with confirm |
Sizes 32/40/48px height · radius 8px · Inter 500 · loading state = spinner replaces label (width locked) · disabled = 45% opacity, no pointer events.

## Inputs & forms
40px height, `surface-1` bg, 1px `border`, radius 8px; focus = 2px Indigo ring. Label above (caption 500), help text below (caption, muted), error = danger border + message with icon. Field groups on an 8pt grid; single-column forms, max 480px.

## Cards
`surface-1`, 1px border, radius 10px, padding 24px, `shadow-sm`; hover on interactive cards = `shadow-md` + border-Indigo at 30%.

## Tables
Header row `surface-2`, caption 600 uppercase; rows 44px, divider borders only; hover `surface-2`; numeric columns mono + right-aligned; sticky header; row actions in trailing kebab menu; bulk-select checkboxes leading. Pagination: "1–25 of 312" + prev/next.

## Charts
Line/bar/area only in product. Series order: Indigo → Lime → Info → neutral-400. Gridlines `border` color; no chart borders; tooltips = `surface-1` card, mono values. Empty chart = illustration `Empty state` (spot size).

## Navigation
- **Sidebar:** 240px (collapsible to 64px icon rail), `surface-0`, sections with caption headers, active item = `surface-2` + Indigo 3px left indicator + filled icon.
- **Topbar:** 56px — breadcrumb, ⌘K search, notifications bell, org switcher, avatar.
- **Org/tenant switcher:** dropdown with avatar-initial chips + "Create organization".
- **Tabs:** underline style, 2px Indigo indicator, 250ms slide.

## Overlays
- **Modal:** center, max 560px, radius 16px, scrim `#09090B` at 60%, 250ms fade+scale-98.
- **Dialog (confirm):** 400px, icon + title + body + right-aligned actions (danger confirms use Danger button).
- **Drawer:** right, 480px, for detail/edit-in-context.
- **Dropdown/menu:** radius 10px, `shadow-lg`, 4px item radius, 32px item height.

## Feedback
- **Toast:** bottom-right, `surface-1` + semantic left bar 3px, auto-dismiss 5s, action link optional.
- **Notifications center:** drawer list, unread dot Indigo.
- **Badges:** 4px radius, semantic tints at 12% bg + 100% text (e.g. success = `#10B981` on `#10B98120`).
- **Chips:** pill, `surface-2`, dismissible ×.
- **Empty states:** spot illustration + one sentence + primary action.
- **Skeleton:** `surface-2` blocks, 1.2s shimmer, match final layout exactly.

## Stepper
Horizontal, numbered circles → check on complete; current = Indigo fill; connector line animates 250ms.

## Token architecture
Three layers: primitive (`indigo-600`) → semantic (`dx-color-primary`) → component (`dx-button-primary-bg`). Shipped as JSON (Style Dictionary) → CSS vars, Tailwind preset, and Figma variables. White-label customers override semantic layer only.
