# Pixel-Art Asset Pack

The whole product speaks one visual language: **16-bit, SNES-era pixel art, dark and mystical.** There are two distinct asset packs, both built to the same grid discipline.

***

## Two packs, one aesthetic

| Pack | Lives in | Purpose | Source |
|---|---|---|---|
| **Oracle UI pack** | `public/assets/oracle/` | The dApp's chrome — oracle figure, disciples, temple backgrounds, buttons, icons, badges, effects | `PIXEL_ART_PROMPTS.md` |
| **Oracle World atlas pack** | `public/oracle-world/*.webp` | The God Simulator's units, buildings, VFX, and biomes (140 frames) | atlas build pipeline |

***

## The palette (strict)

Every asset in the UI pack uses one fixed palette — no new colors, ever:

| Swatch | Hex | Use |
|---|---|---|
| Warm black | `#0d0a06` | Backgrounds |
| Primary gold | `#c8a84b` | Borders, primary accents |
| Dark gold | `#8b5e3c` | Shadowed gold, pending states |
| Parchment | `#f0d9a0` | Scrolls, light surfaces |
| Highlight | `#e8c96a` | Glints, stars, runes |
| Deep shadow | `#3d2810` | 1px outlines, 4px hard drop shadows |
| Emerald | `#4a9e6b` | The Oracle's eyes, "fulfilled" badges |
| Mystic purple | `#6b4a8a` | The Oracle's robe, arcane accents |
| Off-white | `#f5e6c8` | Text on dark |

**Discipline rules:** strict pixel grid, no anti-aliasing, no gradients (only pixel-stepped shading), 1px dark outline on every sprite, hard 4px drop shadows (never blurred). Assets are authored at 1× and scaled up with CSS `image-rendering: pixelated`.

***

## The Oracle UI pack

Authored from the prompt set in `PIXEL_ART_PROMPTS.md`. Highlights:

**Backgrounds** (1920×1080, solid): Temple Exterior (landing), Temple Interior (`/temple`), Prophecy Scroll Hall (`/prophecies`).

**Characters:** The Oracle (64×64, hooded figure with a glowing circuit face and emerald eyes, 4-frame idle bob), the generic Disciple sprite (32×48), and the Disciple card portrait (120×120) used on shareable NFT cards.

**UI chrome:** a 9-slice pixel panel frame, primary/danger buttons (3 states each), and icons — USDY coin, chain/MNT, scroll, karma star, fulfilled checkmark, pending hourglass.

**Decorative & FX:** horizontal dividers, corner ornaments, floating rune particles, the Oracle Eye logo (128×128), a claim/blessing burst (6-frame), and a transaction spinner (8-frame).

Fonts in-app match the assets: **Press Start 2P** for headings, **VT323** for body.

***

## The Oracle World atlas pack

The God Simulator can't load hundreds of individual PNGs at 60fps, so sprites are packed into **WebP atlases** described by `public/oracle-world/manifest.json` (`spriteSize: 64`, `tileSize: 16`, **140 frames**):

| Atlas | Frames |
|---|---|
| `units.webp` | NPCs — villager, knight, archer, mage, king, queen, ninja, priest, farmer, general; orcs; elves; land & water fauna |
| `buildings.webp` | 20 building subtypes per race (primitive → modern) + walls, monuments, great halls |
| `vfx.webp` | magic bolt, meteor, lightning, raindrop, snowflake, explosion, arrow, axe |
| `env.webp` | 7 biomes (+ sand variants), boats, docks, trees, grass |

`scripts/build-atlas.mjs` assembles the atlases (with smart chroma-keying to clean sprite backgrounds), and `atlas-loader.ts` maps every `EntityTypeId` and building subtype to a frame, with per-subtype scale factors (a campfire is tiny; a great hall is large). This is the pack referenced in the project's asset encyclopedia — the ~133 god-sim creatures and structures themed for the isekai/anime prediction-market world.

***

## Why it matters for a viral DApp

The aesthetic *is* the marketing. A glowing pixel oracle, a soulbound Disciple card, and a living god-game continent are all inherently **screenshot-worthy** — which is the entire growth strategy for a Consumer & Viral submission (see [Virality Plan](../launch/virality.md)). Consistency across both packs — one palette, one grid, one mood — is what makes the whole thing read as a single, deliberate world rather than assembled clip-art.

***

## Regenerating / extending assets

* **UI pack:** follow `PIXEL_ART_PROMPTS.md` — paste the style-guide block at the top of each prompt, keep to the palette, export PNG with transparency (JPG for solid backgrounds).
* **Atlas pack:** add source sprites, then run `node scripts/build-atlas.mjs` in `apps/web/` to rebuild the WebP atlases and refresh the manifest.
