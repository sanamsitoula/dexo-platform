# DEXO — Visual Brand Guidelines

## Logo philosophy
The DEXO mark is the **Tenant Cube**: three stacked isometric planes forming a negative-space **D**. Each plane is a tenant; the shared edge is the core platform. It reads as: many products, one foundation. Geometry over ornament — the mark must survive at 16px and on a conference banner.

## Logo construction
- Built on a 24×24 grid; stroke weight = 2 grid units; corner radius = 1 unit.
- **Safe area:** clear space equal to the height of the cube's top plane (25% of mark height) on all sides.
- **Minimum sizes:** symbol 16px digital / 8mm print; horizontal lockup 96px / 24mm.
- **Lockups:** horizontal (symbol + wordmark, gap = 0.5× symbol width) and vertical (symbol above wordmark, gap = 0.4× symbol height). Wordmark is Space Grotesk Bold, all-caps, +2% tracking.

## Versions
| Context | Version |
|---|---|
| Light backgrounds | Ink symbol `#09090B` + Indigo accent plane |
| Dark backgrounds | Paper symbol `#FAFAFA` + Volt Lime accent plane |
| Monochrome | Single color, no accent plane |
| App icon | Symbol on Indigo→Violet gradient, 22% corner radius |
| Favicon / GitHub avatar | Symbol only, no wordmark |

Never: rotate, outline, add shadows to, recolor outside the palette, or place the logo on busy imagery without a scrim.

## Brand patterns
- **Isogrid:** faint isometric grid lines (`border` color at 40%) used as section backgrounds.
- **Tenant stack:** repeating offset rounded rectangles at 8% opacity — used on covers and social banners.
- Patterns never exceed 10% visual weight of a composition.

## Illustration style
Flat-modern with depth: 2px consistent strokes, geometric shapes, isometric 30° for system diagrams, flat front-on for people/UI scenes. Palette limited to Indigo, Lime, and 4 neutrals. Rounded terminals. Subtle grain texture at 5% on hero art only. No gradients inside illustrations except the hero glow. (Full system: `06-illustration-system.md`.)

## Photography style
Rare — used only for team/careers/press. Natural light, desaturated 15%, Indigo-tinted shadows, real workspaces, no stock-photo posing. Duotone (Ink/Indigo) for editorial headers.

## Iconography style
24px grid, 1.75px stroke, rounded caps and joins, 2px corner radius on rectangles. Outline by default; filled variant reserved for active/selected states. (Full spec: `05-icon-system.md`.)

## Shadows & elevation
```css
--dx-shadow-sm: 0 1px 2px rgb(9 9 11 / 0.06);
--dx-shadow-md: 0 4px 12px rgb(9 9 11 / 0.08);
--dx-shadow-lg: 0 12px 32px rgb(9 9 11 / 0.12);
--dx-glow: 0 0 48px rgb(79 70 229 / 0.25); /* dark theme feature cards */
```
Dark theme prefers 1px borders + glow over drop shadows.

## Corner radius scale
4px (chips, badges) · 8px (inputs, buttons) · 10px (cards — the signature radius) · 16px (modals, panels) · 22% (app icons) · full (avatars, pills).

## Grid system
- Web: 12-column, 1200px max content, 24px gutters, 8pt spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Marketing sections: 96px vertical rhythm desktop / 64px mobile.

## Component style
Quiet surfaces, 1px borders, strong type hierarchy. Primary actions solid Indigo; everything else neutral. One accent moment (lime) per screen maximum. Density: comfortable in marketing, compact in dashboard tables.

## Animation principles
1. **Purposeful** — motion explains hierarchy or state, never decorates idle screens.
2. **Fast** — 150ms micro, 250ms component, 400ms page; `cubic-bezier(0.2, 0, 0, 1)`.
3. **Spatial** — elements enter from where they logically originate (8–16px travel max).
4. **Respectful** — honor `prefers-reduced-motion` everywhere.

## Accessibility
WCAG 2.2 AA minimum. Focus rings: 2px Indigo offset 2px (Lime on dark). Touch targets ≥ 44px. All meaning carried by color is duplicated in text or iconography. Motion, contrast, and font-size preferences respected at the token level.
