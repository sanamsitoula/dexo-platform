# DEXO — Typography

## Font stack
| Role | Font | Fallback | Why |
|---|---|---|---|
| Display / headlines / wordmark | **Space Grotesk** | system-ui | Technical character, distinctive without being loud |
| UI & body | **Inter** | -apple-system, Segoe UI, sans-serif | Best-in-class screen legibility, huge weight range |
| Code / data / tokens | **JetBrains Mono** | ui-monospace, Consolas | Developer-native, clear zero/O distinction |

All three are open source (OFL) — consistent with the brand. Load via self-hosted woff2, `font-display: swap`.

**Pairing rule:** Space Grotesk only at 24px+ and only for headlines/stat numbers. Never for paragraphs or UI controls.

## Type scale (1.25 ratio, 16px base)
| Token | Size / line | Weight | Font | Use |
|---|---|---|---|---|
| `display-xl` | 64/68 | 700 | Space Grotesk | Hero headline (desktop) |
| `display` | 48/52 | 700 | Space Grotesk | Section headlines |
| `h1` | 36/44 | 700 | Space Grotesk | Page titles |
| `h2` | 28/36 | 600 | Space Grotesk | Section titles |
| `h3` | 20/28 | 600 | Inter | Card titles |
| `body-lg` | 18/28 | 400 | Inter | Marketing body |
| `body` | 16/24 | 400 | Inter | Default |
| `body-sm` | 14/20 | 400 | Inter | Dashboard default, table cells |
| `caption` | 12/16 | 500 | Inter | Labels, meta |
| `code` | 14/22 | 400 | JetBrains Mono | Code blocks, IDs, API keys |

Responsive: `display-xl → 40px`, `display → 32px`, `h1 → 28px` below 768px.

## Weights
Inter: 400 / 500 / 600. Space Grotesk: 500 / 700. JetBrains Mono: 400 / 700. Never use 300 or below.

## Component typography
- **Buttons:** Inter 500, 14px (sm) / 15px (md) / 16px (lg), sentence case, no letterspacing.
- **Navigation:** Inter 500 14px; active item 600.
- **Cards:** title `h3`, meta `caption` in `text-muted`.
- **Tables:** header `caption` 600 uppercase +4% tracking in `text-muted`; cells `body-sm`; numeric columns JetBrains Mono, right-aligned, `font-variant-numeric: tabular-nums`.
- **Display numerals** (pricing, stats): Space Grotesk 700 with Lime or Indigo accent.

## Rules
- Max line length 68ch for prose. Paragraph spacing 1em; no first-line indents.
- Headlines: sentence case, no periods, no widows (use `text-wrap: balance`).
- Links: Indigo, underline on hover only (marketing) / always underlined (docs).
