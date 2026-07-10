# DEXO — Illustration System

## Language
**"Isoflat":** flat-modern shapes + selective 30° isometric depth for anything architectural. 2px strokes, rounded terminals, palette locked to Indigo `#4F46E5`, Lime `#A3E635`, and neutrals (`#09090B`, `#52525B`, `#E4E4E7`, `#FAFAFA`). Backgrounds transparent or Isogrid pattern. No faces with detailed features — simple geometric people. Subtle 5% grain on hero art only.

**Base style string (append to every prompt below):**
> flat modern vector illustration, isometric 30 degree perspective for structures, 2px rounded strokes, limited palette of indigo #4F46E5 and lime #A3E635 accents on near-black and light gray neutrals, generous negative space, geometric abstract shapes, clean tech aesthetic like Linear and Stripe illustrations, no text, no gradients, transparent background, SVG-style crispness

## Prompt library
| Asset | Scene prompt (prepend to base style) |
|---|---|
| Hero | A glowing isometric cube split into three stacked translucent planes, small product windows orbiting it, one lime plane highlighted |
| Dashboard | Isometric admin dashboard panels floating in layers: chart card, table card, metric tiles connected by thin lines |
| Analytics | Rising bar and line charts on floating panels, one lime data point highlighted with a small flag |
| Security | Geometric shield formed by interlocking cube planes, keyhole negative space, orbiting lock nodes |
| Cloud | Isometric cloud made of rounded cubes, containers docking into it on thin rails |
| Developers | Simple geometric figure at a floating terminal window, code lines as abstract dashes, lime cursor |
| API | Curly-brace portals exchanging small geometric packets along a curved dotted path |
| Storage | Stacked rounded discs (database) with files sliding into slots, one drawer open glowing lime |
| Billing | Floating credit card passing through a cube, coins converting to invoice sheets on the far side |
| Teams | Circle of simple geometric avatars connected by lines to a central cube, one avatar lime |
| Open Source | A cube with one face open, small figures adding blocks into it, git-branch lines beneath |
| Automation | Conveyor of small cubes passing through a machine arch, entering gray and exiting indigo |
| Multi-tenant | One large foundation slab supporting many small distinct houses/blocks, each a different neutral, one lime |
| White-label | A paint roller rolling indigo over a wireframe dashboard, changing it to a custom color |
| Integrations | Central cube with plug sockets on each face, cables connecting to floating app tiles |
| Support | Chat bubble and lifebuoy ring intersecting, tiny figure waving from a panel |
| Landing page | Wide composition: tenant cube center, orbiting feature panels, isogrid floor fading out |
| 404 | A lone cube plane detached and floating away from its stack, dotted outline where it belongs |
| Empty state | An open, clean isometric box with a single dotted-outline document hovering above it |
| Loading | Three cube planes assembling in sequence (also the Lottie loop reference) |
| Success | Cube stack complete with a lime checkmark plane snapping onto the top |
| Warning | Cube stack with one amber plane slightly ajar, small exclamation flag |
| Error | Cube stack with one red plane fractured into two clean geometric halves |

## Production rules
- Master files in Figma/AI at 1600×1200; export SVG (web), PNG @2x (fallback), and cropped 1:1 versions for cards.
- Every illustration must work on both Paper and Ink backgrounds (swap neutral fills via CSS variables in SVG).
- Spot illustrations (empty states) max 240px; scene illustrations (heroes) max 720px wide.
