# DEXO — Figma File Structure

One team library file **"DEXO Design System"** + separate **"DEXO Marketing"** and **"DEXO Product"** files that subscribe to it.

## DEXO Design System — pages
1. **📖 Cover & Changelog** — file cover (Ink, mark, version), changelog table.
2. **🎨 Foundations / Colors** — variable collections: `primitive` (full scales), `semantic` (light+dark modes), `component`. Contrast-check annotations.
3. **🔤 Typography** — text styles matching the type scale tokens; responsive variants.
4. **⚙️ Icons** — every icon as component with `style` (outline/filled) + `size` variants; keep-out guides on the master grid.
5. **🧩 Components** — buttons, inputs, cards, tables, nav, overlays, feedback — each with all variants/states via component properties; auto-layout throughout; documented with usage notes in component descriptions.
6. **📐 Templates** — dashboard shell, settings page, auth screens, marketing section blocks (hero, feature grid, pricing, CTA band), responsive frames (1440/768/390).
7. **🖼 Illustrations** — Isoflat library as components with light/dark variable-bound fills.
8. **📣 Marketing** — OG image template, social banners per platform, carousel 6-slide template, PH gallery frames.
9. **🎬 Motion Specs** — easing/duration token sheet, stack-assemble storyboard frames, prototype flows demonstrating standard transitions.

## Conventions
- Naming: `Category/Component/Variant` (`Button/Primary/Default`).
- All colors and radii via variables — zero detached fills (audit with a lint plugin before publish).
- Modes: `Light`/`Dark` on semantic collection; `Default`/`Whitelabel-demo` mode on component collection to prove rebrandability.
- Publish cadence: weekly; breaking changes announced in #design.
