# DEXO — Logo Design

## Five concepts

| # | Concept | Idea | Verdict |
|---|---|---|---|
| 1 | **Tenant Cube** ✅ | Three stacked isometric planes forming a negative-space D — tenants on one core | **Chosen.** Ownable, scales to 16px, tells the multi-tenant story |
| 2 | Split D | A bold D sliced into vertical tenant "slats" | Strong but reads as a generic letterform at small sizes |
| 3 | Hex Core | Hexagon with a D knocked out, plugin nodes at vertices | Too close to many infra logos (e.g. hex-mania in dev tools) |
| 4 | Layer Flag | Three offset rounded rectangles like cascading windows | Clean but abstract — no D, weak recall |
| 5 | Orbit D | D with an orbital ring (API/ecosystem) | Feels dated, science-y rather than platform-y |

## Chosen mark — construction rules
- 24×24 grid, isometric 30°, three parallelogram planes stacked with 2-unit vertical offset.
- Top plane = accent (Indigo on light, Lime on dark). Middle + bottom = ink color.
- Negative space between the planes' left edges forms the counter of the **D**.
- Stroke-free (solid planes) so it holds at favicon size.

## Reference SVG (symbol, light background)
Saved at `../Assets/SVG/dexo-mark.svg`:
```svg
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <!-- bottom plane -->
  <path d="M16 62 48 46l32 16-32 16z" fill="#09090B"/>
  <!-- middle plane -->
  <path d="M16 48 48 32l32 16-32 16z" fill="#09090B" opacity="0.7"/>
  <!-- top plane (accent) -->
  <path d="M16 34 48 18l32 16-32 16z" fill="#4F46E5"/>
</svg>
```
Wordmark: **DEXO** in Space Grotesk Bold, all caps, +2% tracking, optically aligned to the mark's baseline.

## Generation prompts
- **AI image prompt:** "Minimal geometric logo mark: three stacked isometric parallelogram planes with a subtle negative-space letter D between their edges, top plane vivid indigo #4F46E5, lower planes near-black, flat vector, white background, no text, no gradients, no shadows, centered, style of Vercel and Linear logos"
- **Illustrator prompt/steps:** 24pt isometric grid (SSR 30°); draw one 32×16pt parallelogram; duplicate twice with 14pt vertical offset; fill per palette; unite lower two at 100%/70% K; expand; convert wordmark to outlines; save master `.ai` with live + outlined layers.
- **Figma prompt/steps:** 96 frame, 30° skewed rectangles via vector network, component with `theme` (light/dark/mono) and `lockup` (symbol/horizontal/vertical) variants.

## Applications
| Asset | Spec |
|---|---|
| App icon | Mark (Paper planes, Lime top) centered at 60% on Indigo→Violet `#4F46E5→#7C3AED` gradient, 22% radius, 1024px master |
| Social avatar | Same as app icon but full-bleed circle-safe (mark at 55%) |
| GitHub avatar | Mark only on Ink `#09090B`, 500×500 PNG |
| OG watermark | Mono Paper mark at 12% opacity, bottom-right, 24px margin |

## Icon rules
Never pair the mark with other logos closer than its safe area; in partner lockups use a 1px neutral divider with equal optical weight.
