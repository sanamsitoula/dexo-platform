# DEXO — Color System

## Core palette

| Token | Name | HEX | RGB | HSL |
|---|---|---|---|---|
| `primary` | Dexo Indigo | `#4F46E5` | 79 70 229 | 243° 75% 59% |
| `primary-hover` | Indigo 700 | `#4338CA` | 67 56 202 | 245° 58% 51% |
| `accent` | Volt Lime | `#A3E635` | 163 230 53 | 83° 78% 55% |
| `ink` | Ink (canvas dark) | `#09090B` | 9 9 11 | 240° 10% 4% |
| `paper` | Paper (canvas light) | `#FAFAFA` | 250 250 250 | 0° 0% 98% |

Accent is for highlights, glows, and data accents only — never large fills, never text on white.

## Neutral scale (zinc-based)
`#FAFAFA` 50 · `#F4F4F5` 100 · `#E4E4E7` 200 · `#D4D4D8` 300 · `#A1A1AA` 400 · `#71717A` 500 · `#52525B` 600 · `#3F3F46` 700 · `#27272A` 800 · `#18181B` 900 · `#09090B` 950

## Semantic

| Role | HEX | On-dark variant |
|---|---|---|
| Success | `#10B981` | `#34D399` |
| Warning | `#F59E0B` | `#FBBF24` |
| Danger | `#EF4444` | `#F87171` |
| Info | `#0EA5E9` | `#38BDF8` |

## Surfaces

| Token | Light | Dark |
|---|---|---|
| `surface-0` (page) | `#FAFAFA` | `#09090B` |
| `surface-1` (card) | `#FFFFFF` | `#18181B` |
| `surface-2` (raised) | `#F4F4F5` | `#27272A` |
| `border` | `#E4E4E7` | `#27272A` |
| `text-primary` | `#18181B` | `#FAFAFA` |
| `text-secondary` | `#52525B` | `#A1A1AA` |

## Gradient system
- **Hero:** `linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A3E635 130%)` (lime only bleeds at the edge).
- **Glow:** radial `#4F46E5` at 20% opacity behind product shots on Ink.
- **Border shimmer:** 1px conic gradient `#4F46E5 → #A3E635 → #4F46E5` for premium cards.

## CSS variables
```css
:root {
  --dx-primary: #4F46E5;
  --dx-primary-hover: #4338CA;
  --dx-accent: #A3E635;
  --dx-success: #10B981;
  --dx-warning: #F59E0B;
  --dx-danger: #EF4444;
  --dx-info: #0EA5E9;
  --dx-surface-0: #FAFAFA;
  --dx-surface-1: #FFFFFF;
  --dx-surface-2: #F4F4F5;
  --dx-border: #E4E4E7;
  --dx-text: #18181B;
  --dx-text-muted: #52525B;
  --dx-radius: 10px;
}
[data-theme="dark"] {
  --dx-surface-0: #09090B;
  --dx-surface-1: #18181B;
  --dx-surface-2: #27272A;
  --dx-border: #27272A;
  --dx-text: #FAFAFA;
  --dx-text-muted: #A1A1AA;
}
```

## Tailwind config
```js
// tailwind.config.js (excerpt)
theme: {
  extend: {
    colors: {
      dexo: {
        DEFAULT: '#4F46E5', hover: '#4338CA', accent: '#A3E635',
        ink: '#09090B', paper: '#FAFAFA',
      },
      success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#0EA5E9',
    },
    borderRadius: { dexo: '10px' },
  },
}
```

## Token naming convention
`dx-{category}-{role}-{state}` → e.g. `dx-color-primary-hover`, `dx-surface-1`, `dx-text-muted`. Material Design 3 mapping: `primary → md.sys.color.primary`, `surface-1 → md.sys.color.surface-container`.

## Accessibility
- Body text is always ≥ 4.5:1 (Ink on Paper = 19.3:1; `#FAFAFA` on `#18181B` = 16.9:1).
- Dexo Indigo on white = 6.3:1 → safe for text. Volt Lime is decorative only (2.0:1 on white — never text).
- Never encode meaning by color alone; pair with icon or label.
