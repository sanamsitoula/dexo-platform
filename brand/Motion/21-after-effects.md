# DEXO — After Effects Project Spec

## Project structure
```
DEXO_Motion.aep
├─ 01_Comps_Master/        DX_LogoReveal_1080_30, DX_Promo30_16x9, DX_Promo30_9x16, DX_Outro
├─ 02_Precomps/            planes, wordmark, glow, isogrid, ui-mockups
├─ 03_Assets/
│   ├─ AI/                 dexo-logo-layers.ai (plane1/plane2/plane3/wordmark as layers)
│   ├─ SVG_PNG/            illustrations, screenshots @2x
│   └─ Audio/              music beds, SFX (thump, clicks)
├─ 04_Solids_Nulls/
└─ 05_Renders/             (output module targets)
```

## Naming
Comps `DX_{Name}_{WxH or ratio}_{fps}` · layers `type_name_variant` (`shp_plane_top`, `txt_tagline`). One master color-control null with brand hexes wired via expressions so a rebrand re-colors every comp.

## Animation timing (logo reveal, 30fps)
| Frames | Action | Ease |
|---|---|---|
| 0–9 | isogrid fade to 6% | linear |
| 9–17 | bottom plane: y +40→0, opacity 0→100 | ease-out 75/25 |
| 13–21 | middle plane same, offset +4f | ease-out |
| 17–27 | top plane lands, 4px overshoot | overshoot (2 keys + graph editor bump) |
| 27–36 | wordmark letters slide-in x −24→0, 1.2f stagger | ease-out |
| 36–45 | lime edge glow pulse (opacity 0→60→0) | ease-in-out |

Standard transitions between scenes: 8f cross-dissolve or 12f "plane wipe" (parallelogram matte sweeping 30°). Never straight cuts inside a section, never longer than 12f.

## Keyframe rules
Graph editor always; default influence 75% out / 25% in (matches `cubic-bezier(0.2,0,0,1)`). Position animated in separate dimensions. Motion blur on for moves > 20px/frame.

## Fonts
Space Grotesk 700 (headlines), Inter 500 (captions) — convert to shapes in delivery comps to avoid font sync issues.

## Exports
| Target | Settings |
|---|---|
| Master | ProRes 422 HQ MOV, source resolution |
| Web/social | H.264 MP4 via Media Encoder, VBR 2-pass 10 Mbps (1080p), −14 LUFS |
| Alpha stings | ProRes 4444 MOV |
| Lottie | duplicate comps rebuilt shapes-only → Bodymovin, no effects/expressions except color bindings |
