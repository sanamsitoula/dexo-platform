# DEXO — Favicon & App Icon System

Source: `Assets/SVG/dexo-mark.svg` (simplify to two planes below 24px — drop the middle 70% plane, keep bottom + indigo top).

## Deliverables
| File | Size | Format | Notes |
|---|---|---|---|
| `favicon.svg` | vector | SVG | `prefers-color-scheme` media query inside SVG flips ink↔paper |
| `favicon.ico` | 16+32+48 | ICO | 2-plane simplified mark |
| `favicon-16.png` `favicon-32.png` `favicon-48.png` `favicon-64.png` | as named | PNG | transparent |
| `apple-touch-icon.png` | 180 | PNG | mark at 60% on Indigo gradient, **no** transparency, square (iOS rounds it) |
| `icon-192.png` `icon-512.png` | 192 / 512 | PNG | PWA standard icons |
| `maskable-512.png` | 512 | PNG | mark within central 40% safe zone on solid `#4F46E5` |

## HTML
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#4F46E5">
```

## site.webmanifest
```json
{
  "name": "DEXO",
  "short_name": "DEXO",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#4F46E5",
  "background_color": "#09090B",
  "display": "standalone"
}
```

Build command (from SVG master): use `sharp`/`resvg` to rasterize, `png-to-ico` for the ICO. Verify at 16px on both a light and dark browser tab before shipping.
