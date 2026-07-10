# DEXO — AI Image Prompt Pack

## Global style block (append to every prompt)
> flat modern vector illustration, selective isometric 30-degree perspective, 2px rounded strokes, palette strictly limited to indigo #4F46E5 and lime #A3E635 accents on near-black #09090B and light gray neutrals, generous negative space, clean geometric tech aesthetic in the style of Linear and Stripe brand illustration, no text, no watermarks, crisp vector edges

## Per-tool syntax
| Tool | Adaptation |
|---|---|
| **Midjourney** | Append `--ar 16:9 --style raw --v 7 --no text,letters,watermark,gradient mesh`; use `--sref` with an approved illustration once one exists for consistency |
| **GPT Image** | Prepend "Vector-style flat illustration, transparent background." — it follows hex colors literally, keep them in |
| **Firefly** | Set style: Vector look, none effects; paste palette hexes into color settings rather than prompt |
| **Ideogram** | Add "MAGIC_PROMPT_OFF"; Ideogram is the only tool allowed for text-bearing assets (banners with tagline) |
| **Flux** | Works best with full-sentence scene description first, style block second; guidance 3.5 |
| **Stable Diffusion (SDXL/SD3)** | Negative prompt: `text, watermark, photo, 3d render, gradient, noise, blurry, extra limbs`; CFG 6 |
| **Illustrator AI (vector gen)** | Use scene sentence only + "flat geometric, 2-color + neutrals"; recolor to tokens after generation |

## Ready prompts (scene + global block)
1. **Hero:** "A large glowing isometric cube separating into three stacked translucent planes, small application windows orbiting it on thin dotted paths, the top plane vivid indigo with a lime edge highlight"
2. **OG default:** "Wide dark composition, faint isometric grid floor, centered stack of three parallelogram planes with indigo top plane, soft indigo radial glow, empty right half for headline text overlay"
3. **Multi-tenant diagram art:** "One wide foundation slab holding six small distinct geometric buildings separated by thin walls, each building a different neutral tone, one lime, connected underground by glowing indigo pipes"
4. **White-label:** "A paint roller rolling a fresh indigo coat across a wireframe dashboard interface, the painted half showing rounded colorful UI, the unpainted half gray outlines"
5. **Security/enterprise:** "A geometric shield assembled from interlocking cube planes with a keyhole of negative space, thin orbit rings with small lock nodes"
6. **Community/open source:** "A large cube with one open face, a dozen tiny geometric figures carrying and inserting small blocks into it, subtle git branch lines etched into the floor"
7. **404:** "A single parallelogram plane drifting away from an incomplete stack, its original position shown as a dotted outline, small stars around"
8. **Blog header (billing):** "A floating bank card passing through a translucent cube and emerging as a stack of neat invoice sheets, coins on a dotted trajectory"

## Consistency workflow
Generate 4 variants → pick best → vectorize/trace in Illustrator → snap all colors to tokens → rebuild strokes at 2px → add to Figma Illustrations page as the new style reference. AI output is a draft, never the shipped asset.
