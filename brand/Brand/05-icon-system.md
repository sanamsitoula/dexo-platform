# DEXO — Icon System

## Base
Recommended library: **Lucide** (open source, matches brand geometry), extended with custom DEXO icons drawn to the same spec.

## Specification
- **Grid:** 24×24, 1px padding keep-out (live area 22×22).
- **Stroke:** 1.75px, rounded caps, rounded joins. Scale stroke with size: 16px→1.5px, 32px→2px.
- **Corners:** 2px radius on rectangles; circles and 45°/isometric angles preferred.
- **Styles:** Outline (default) and Filled (active/selected states only). Filled uses the outline silhouette with `currentColor` fill and knocked-out inner detail.
- **Color:** always `currentColor`; icons inherit text color. Accent icons (feature grids) may use Indigo stroke + 10% Indigo circular backplate (40px).

## Sizes
16 (inline/table) · 20 (buttons, inputs) · 24 (default, nav) · 32 (feature cards) · 48 (empty states).

## Custom DEXO icon set (draw these to spec)
tenant-cube, organization, white-label (paint-roller + square), rbac-shield, billing-card, webhook-bolt, custom-domain (globe + check), tenant-isolation (walled squares), theme-engine (swatches), plugin (puzzle-node), api-braces, storage-stack.

## Export
| Format | Spec |
|---|---|
| SVG | `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, no ids, optimized with SVGO |
| PNG | 1×/2×/3× at 16/20/24/32/48 on transparent |
| AI | one artboard per icon, outlined strokes on export layer, live strokes on source layer |
| Figma | one component per icon with `size` and `style` (outline/filled) variants; auto-layout backplate variant |

Naming: `dx-icon-{name}-{style}-{size}.svg` → `dx-icon-webhook-bolt-outline-24.svg`.

## Usage rules
- Never mix stroke weights in one view. Never scale non-integer sizes. Pair every icon-only button with `aria-label`.
