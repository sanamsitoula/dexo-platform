# DEXO — Motion Design

## Motion guidelines
- **Signature move:** the "stack assemble" — planes slide in from below with 60ms stagger, settling with a soft overshoot (`spring: stiffness 300, damping 24`).
- **Easing tokens:** `--ease-out: cubic-bezier(0.2, 0, 0, 1)` (default) · `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)` (moves) · spring for playful moments only.
- **Duration tokens:** 150ms micro · 250ms component · 400ms page · 800ms brand moments.
- Motion communicates hierarchy and causality; nothing animates on idle. `prefers-reduced-motion` → crossfades only.

## Logo reveal (1.5s master, for video intros)
0.0–0.3s: Ink frame, isogrid fades to 6% · 0.3–0.8s: bottom plane slides up + fades in, middle follows (+120ms), indigo top plane lands with 4px overshoot · 0.8–1.1s: wordmark letters "DEXO" fade-slide in from left, 40ms stagger · 1.1–1.5s: lime edge-glow pulse once, hold. Audio: soft sub-thump on top-plane landing.

## Standard animations
| Asset | Duration | Description |
|---|---|---|
| Intro sting | 1.5s | Logo reveal above |
| Outro | 2.5s | Mark + URL + "MIT licensed" line; glow loop |
| Loading (Lottie) | 1.2s loop | Three planes assemble → breathe → disassemble |
| Button hover | 150ms | Background shift + 1px lift; press = scale 0.98 |
| Feature reveal (scroll) | 400ms | Fade + 16px rise, 80ms stagger per card, once |
| Dashboard promo | 8s loop | Cursor tours the UI: switch tenant → theme flips brand colors live → invoice appears |
| Number counters | 1s | Count-up with `--ease-out`, tabular nums |

## Lottie deliverables
`dx-loading.json` (< 15KB) · `dx-success-check.json` · `dx-empty-box.json` · `dx-logo-reveal.json`. Export via Bodymovin, shapes only (no rasters), colors bound to theme via dynamic properties.

## After Effects hand-off
Comps at 1920×1080/30fps (plus 1080×1920 vertical dupes). See `21-after-effects.md` for project structure.
