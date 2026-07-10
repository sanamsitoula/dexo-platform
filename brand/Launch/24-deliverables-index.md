# DEXO — Deliverables Index & Asset Register

Every asset in the system, with filename, purpose, dimensions, format, and where its generation prompt/spec lives. Nothing here is a placeholder — each row points at a complete spec in this package.

## Brand
| Filename | Purpose | Dimensions | Format | Spec/prompt |
|---|---|---|---|---|
| dexo-mark.svg | Master logo symbol | 96×96 vb | SVG | `Brand/07` (SVG included, shipped in `Assets/SVG/`) |
| dexo-logo-horizontal-{light,dark,mono}.svg/png | Lockups | vector / 2048w | SVG+PNG | `Brand/07`, export per `Assets/19` |
| dexo-appicon-1024.png | App/social icon | 1024×1024 | PNG | `Brand/07` Applications |
| favicon set (7 files) | Browser/PWA | 16–512 | ICO/PNG/SVG | `Brand/08` (HTML + manifest included) |

## Web & social
| Filename | Purpose | Dimensions | Format | Spec/prompt |
|---|---|---|---|---|
| og-default.png | Link previews | 1200×630 | PNG | prompt #2 in `Assets/20` + title overlay per `Website/09` |
| banner-x.png / banner-linkedin.png / banner-yt.png … | Profile banners | per table | PNG | `Social/10` specs table |
| carousel-template (6 frames) | IG/LinkedIn | 1080×1080 | Figma/PNG | `Social/10` + Figma page 8 (`Design/22`) |
| ph-gallery-01…06 | Product Hunt | 1270×760 | PNG | `Launch/11` Product Hunt section |

## Illustration
22 scenes (hero → error) — SVG + PNG@2x, light/dark. Prompts: `Brand/06`; AI-tool syntax: `Assets/20`; sizes: spot ≤240px, scene ≤720px.

## Motion & video
| Filename | Purpose | Spec |
|---|---|---|
| dexo-logo-reveal.mov/.json | Intro sting + Lottie | `Motion/13` + AE timing `Motion/21` |
| dexo-promo-30s{,-vertical}.mp4 | Ads/social | script `Motion/14`, export `Assets/19` |
| dexo-promo-60s.mp4 · dexo-overview.mp4 · dexo-launch-ph.mp4 | YouTube/PH | `Motion/14` |
| dx-loading/success/empty.json | Product Lottie | `Motion/13` |

## Documents
One-pager PDF, sales deck, pitch deck, case-study template (`Marketing/18`) · press pack (`Press/12`) · README/CONTRIBUTING/SECURITY/CoC/templates (`OpenSource/15`) · docs IA + quick start (`Documentation/16`) · launch checklist & channel posts (`Launch/11`, `Social/10`).

## Implementation order (recommended)
1. Logo finalization + favicon build (Brand 07–08) → 2. Tokens into code: CSS vars + Tailwind preset (Brand 03–04) → 3. Figma library (Design 22) → 4. Website landing (Website 09 + Marketing 18 copy) → 5. Social profiles + banners (Social 10) → 6. OSS repo files (OpenSource 15) + docs (Documentation 16) → 7. Demo seed (Demo 23) → 8. Motion/video (Motion 13–14, 21) → 9. Launch (Launch 11).
