# DEXO — Brand Asset Export Specifications

## Folder layout
```
Assets/
├─ SVG/    logos, icons, illustrations (web masters)
├─ PNG/    raster exports @1x/@2x/@3x, transparent
├─ AI/     Illustrator masters (live + outlined layers)
├─ Icons/  icon set per 05-icon-system naming
└─ ...
```

## Format matrix
| Format | Use | Spec |
|---|---|---|
| SVG | Logos, icons, illustrations on web | SVGO-optimized, `currentColor` where themable, no embedded rasters |
| PNG | Fallbacks, press, app icons | sRGB, transparent, sizes 512/1024/2048 for logos |
| WEBP | Website imagery, screenshots | q82, max 2560w, lazy-loaded |
| PDF | Print (one-pager, press sheets) | PDF/X-4, CMYK conversion: Indigo → C77 M74 Y0 K0, 3mm bleed |
| AI / EPS | Design masters, vendor hand-off | CC2024-compatible, fonts outlined in EPS |
| Figma | Design source of truth | published library, variables for all tokens |
| Lottie | UI/web animation | < 30KB, shapes only |
| MP4 | Promos, PH, YouTube | H.264, 1080p & 4K masters, 30fps (60fps screen capture), −14 LUFS audio |
| MOV | Master/archival + alpha stings | ProRes 422 HQ (4444 for alpha) |
| GIF | README/social micro-demos | max 480w, ≤ 5MB, ≤ 12s — prefer WebM where supported |
| WebM | Web background/inline video | VP9, muted, ≤ 2MB for heroes |

## Naming convention
`dexo-{asset}-{variant}-{theme}-{size}.{ext}` → `dexo-logo-horizontal-dark-1024.png`, `dexo-illustration-hero-light.svg`, `dexo-promo-30s-vertical.mp4`.

## Delivery packs
- **dexo-logo-pack.zip** — all lockups × themes × SVG/PNG/PDF + usage sheet.
- **dexo-press-pack.zip** — logo pack + 6 screenshots + fact sheet PDF.
- **dexo-social-pack.zip** — avatars + banners per platform, pre-sized.

Checklist before shipping any asset: correct tokens (no off-palette colors) · safe areas respected · light+dark verified · metadata stripped · filename convention.
