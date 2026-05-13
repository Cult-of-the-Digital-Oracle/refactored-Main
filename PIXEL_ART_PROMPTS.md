# Pixel Art Asset Prompts — Cult of the Digital Oracle

## Style Guide (paste ini di AWAL setiap prompt)

```
16-bit pixel art, RPG/SNES era style, strict pixel grid, no anti-aliasing,
no gradients, limited color palette, hard outlines, isometric or flat 2D perspective.
Dark mystical theme. Color palette STRICTLY:
  - Background: #0d0a06 (warm black)
  - Primary gold: #c8a84b
  - Dark gold: #8b5e3c
  - Parchment: #f0d9a0
  - Highlight: #e8c96a
  - Deep shadow: #3d2810
  - Emerald: #4a9e6b
  - Mystic purple: #6b4a8a
  - Off-white: #f5e6c8
Transparent background unless stated otherwise.
```

---

## BACKGROUNDS

### BG-01 — Landing Page / Temple Exterior [done]

```
[STYLE GUIDE ABOVE] +

Scene: ancient stone temple exterior at night, pixel art, wide landscape (1920x1080).
Tall stone pillars with glowing runes carved in gold. Dark sky with large pixel stars
and a crescent moon. Torches on either side of massive stone gate. Fog/mist at the
bottom in pixel chunks. Mystical green-gold glow emanating from inside the gate.
Stone steps leading up to the entrance. Background mountains in silhouette.
Solid background (no transparency). Tileable horizontally optional.
```

### BG-02 — Temple Interior (for /temple page) [done]

```
[STYLE GUIDE ABOVE] +

Scene: interior of an ancient digital temple, pixel art, wide (1920x1080).
Stone floor with glowing circuit-like runes etched in gold. Tall stone walls with
pixel torches. Central altar glowing with emerald light. Stained glass windows in
pixel art showing blockchain symbols (chain links, blocks). Candles on the floor.
Mystical fog near the ground. Dark ceiling with stars visible through an open oculus.
Solid background, no transparency.
```

### BG-03 — Prophecy Scroll Hall (for /prophecies page) [done]

```
[STYLE GUIDE ABOVE] +

Scene: ancient library/archive hall, pixel art, wide (1920x1080).
Rows of stone shelves filled with glowing scrolls. Each scroll emits a faint golden
light. Stone columns. Candlelight casting long pixel shadows. A large circular window
at the far end showing a starfield. Dusty atmosphere with pixel particles floating.
Dark and mysterious mood. Solid background.
```

---

## CHARACTERS & SPRITES

### CHAR-01 — The Oracle (AI figure) [done]

```
[STYLE GUIDE ABOVE] +

Character sprite: a floating ethereal figure, 64x64 pixels, facing forward.
Hooded robe in deep purple-black. Face is a glowing circuit board pattern in gold.
Eyes are two bright emerald dots. Hands extend forward with golden energy emanating
from fingertips. Faint pixel aura/glow around the body in gold and purple.
Idle pose, floating 2px above ground. Transparent background.
Multiple frames hint: design for 4-frame idle animation (slight bob up/down).
```

### CHAR-02 — Disciple (generic staked user) [done]

```
[STYLE GUIDE ABOVE] +

Character sprite: a robed disciple, 32x48 pixels, facing forward.
Simple hooded robe in dark brown with gold trim at edges. No face visible inside hood
(just shadow). Holding a small glowing scroll in one hand. Pixel belt with a pouch.
Standing idle pose. Transparent background.
Clean, simple silhouette readable at small sizes.
```

### CHAR-03 — Disciple Card Portrait (for NFT card) [done]

```
[STYLE GUIDE ABOVE] +

Portrait art for an NFT card: a disciple bust/portrait, 120x120 pixels.
Hooded figure, upper body only. Hood has gold celestial symbols embroidered.
Face partially visible — glowing eyes in emerald green, rest in shadow.
Background: a circular halo of pixel stars and golden circuit lines.
Card-art style: slightly more detailed than walking sprite.
Transparent background.
```

---

## Style Guide (paste ini di AWAL setiap prompt)

```
16-bit pixel art, RPG/SNES era style, strict pixel grid, no anti-aliasing,
no gradients, limited color palette, hard outlines, isometric or flat 2D perspective.
Dark mystical theme. Color palette STRICTLY:
  - Background: #0d0a06 (warm black)
  - Primary gold: #c8a84b
  - Dark gold: #8b5e3c
  - Parchment: #f0d9a0
  - Highlight: #e8c96a
  - Deep shadow: #3d2810
  - Emerald: #4a9e6b
  - Mystic purple: #6b4a8a
  - Off-white: #f5e6c8
Transparent background unless stated otherwise.
```

---

## UI ELEMENTS

### UI-01 — Pixel Frame / Panel Border (dark gold theme) [done]

```
[STYLE GUIDE ABOVE] +

UI panel border/frame texture, 256x256 pixel art tileable frame.
Thick pixel border in gold (#c8a84b) with corner ornaments — small pixel skulls
or sun/moon symbols at each corner. Inner border has a subtle darker gold line.
Shadow side (bottom-right) in dark brown (#3d2810), 4px offset.
Fill area: very dark warm black (#0d0a06), slightly transparent feel.
This is a 9-slice frame — corners are 32x32, edges tile. Export as single sheet.
```

### UI-02 — Pixel Button (primary — gold/green) [done]

```
[STYLE GUIDE ABOVE] +

UI button, 200x48 pixels. Pixel art style.
Raised button look: gold top face (#c8a84b to #e8c96a gradient in pixel steps),
dark gold side face giving 3D depth (4px thick).
Text area is flat. Hard pixel shadow bottom-right in #3d2810.
Hover state variation: slightly brighter.
Pressed state: button shifted down 4px, shadow removed.
Transparent background, export all 3 states in one horizontal strip.
```

### UI-03 — Pixel Button (danger — red/leave) [done]

```
[STYLE GUIDE ABOVE] +

Same as UI-02 but color scheme: deep red (#8b2020) top face, dark red side (#3d0808).
Shadow in near-black. 3 states (normal / hover / pressed) in one horizontal strip.
Transparent background.
```

### UI-04 — USDY Coin Icon [done]

```
[STYLE GUIDE ABOVE] +

Icon: 32x32 pixel art coin.
Gold coin face with a yin-yang-like "U" symbol or simple "U$" in pixel font on face.
Pixel shading: bright highlight top-left, shadow bottom-right.
Spinning animation variant hint: design for 4-frame spin (front, slight left, edge, slight right).
Transparent background.
```

### UI-05 — Chain Link / MNT Icon [done]

```
[STYLE GUIDE ABOVE] +

Icon: 32x32 pixel art blockchain symbol.
Two interlocked chain links in metallic silver-gold. Clean pixel grid.
Subtle glow effect (1-2px outer glow in gold).
Transparent background.
```

### UI-06 — Scroll / Prophecy Icon [done]

```
[STYLE GUIDE ABOVE] +

Icon: 32x32 pixel art scroll.
Rolled parchment scroll, slightly unrolled showing a line of mystic symbols.
Parchment color #f0d9a0, roller ends in dark wood (#3d2810).
Glowing rune symbol visible on the parchment in gold.
Transparent background.
```

### UI-07 — Star / Karma Icon [done]

```
[STYLE GUIDE ABOVE] +

Icon: 16x16 pixel art 4-pointed star (like ✦ diamond star shape).
Bright gold center (#e8c96a) with white highlight pixel at top-left.
Dark gold outline. Simple, clean, readable at tiny size.
Transparent background.
```

### UI-08 — Checkmark / Fulfilled Badge [done]

```
[STYLE GUIDE ABOVE] +

Badge icon: 24x24 pixel art.
Circle background in emerald green (#4a9e6b). White pixel checkmark inside.
Pixel-perfect, no anti-aliasing. Small 1px dark outline around circle.
Transparent background.
```

### UI-09 — Hourglass / Pending Badge

```
[STYLE GUIDE ABOVE] +

Badge icon: 24x24 pixel art.
Circle background in muted gold (#8b5e3c). White pixel hourglass/clock symbol inside.
Same style as UI-08 for consistency.
Transparent background.

```

---

## Style Guide (paste ini di AWAL setiap prompt)

```
16-bit pixel art, RPG/SNES era style, strict pixel grid, no anti-aliasing,
no gradients, limited color palette, hard outlines, isometric or flat 2D perspective.
Dark mystical theme. Color palette STRICTLY:
  - Background: #0d0a06 (warm black)
  - Primary gold: #c8a84b
  - Dark gold: #8b5e3c
  - Parchment: #f0d9a0
  - Highlight: #e8c96a
  - Deep shadow: #3d2810
  - Emerald: #4a9e6b
  - Mystic purple: #6b4a8a
  - Off-white: #f5e6c8
Transparent background unless stated otherwise.
```

---

## DECORATIVE ELEMENTS

### DECO-01 — Horizontal Divider [done]

```
[STYLE GUIDE ABOVE] +

Horizontal divider/separator, 512x16 pixels.
Pixel art ornamental line. Center has a small diamond/eye symbol in gold.
Line extends left and right with a repeating chain-link or rune pattern.
Designed to tile or stretch horizontally. Transparent background.
```

### DECO-02 — Corner Ornament [done]

```
[STYLE GUIDE ABOVE] +

Decorative corner piece, 48x48 pixels.
Pixel art ornament for panel corners: interlocked lines meeting at corner,
small gold pixel diamond/star at the intersection point.
Design for top-left — rotate for other 3 corners.
Transparent background.
```

### DECO-03 — Floating Particle / Rune [done]

```
[STYLE GUIDE ABOVE] +

Ambient particle sprite sheet, 8x8 pixels per frame, 4 frames horizontal.
Glowing pixel rune character — a single abstract symbol (like ᚱ or ∞ simplified to pixels).
Animation: appears → glows bright → fades.
Gold color (#e8c96a) with transparent background.
Used for floating ambiance on pages.
```

### DECO-04 — Oracle Eye Symbol (logo) [done]

```
[STYLE GUIDE ABOVE] +

Logo/symbol: 128x128 pixels.
An eye shape made of pixel blocks. Iris is a glowing circuit board pattern in gold.
Pupil is an emerald green pixel square. Outer eye is dark stone/black.
Small pixel "chain links" or rune marks surrounding the eye in a circle.
This is the main logo/mascot symbol for the project.
Transparent background.
```

---

## EFFECTS / ANIMATIONS

### FX-01 — Claim / Blessing Burst [done]

```
[STYLE GUIDE ABOVE] +

Sprite sheet: 64x64 pixels per frame, 6 frames horizontal.
Effect: gold coin/blessing burst animation — coins or sparkles emanating outward
from center point. Starts with a small flash, expands outward, fades.
Gold and white pixel sparkles on transparent background.
Used when user claims USDY blessing.
```

### FX-02 — Transaction Pending Spinner [done]

```
[STYLE GUIDE ABOVE] +

Sprite sheet: 32x32 pixels per frame, 8 frames in a row.
Pixel art loading spinner — rotating gold ring with one bright segment.
Style: chain links rotating in a circle, or a simple pixel arc spinner.
8 frames = full rotation. Transparent background.
```

---

## NOTES FOR CONSISTENCY

- **Always** use the color palette above. Do not introduce new colors unless replacing an existing one.
- **Resolution**: all sprites should be exported at 1x (native pixel size), then scaled up 2x or 3x via `image-rendering: pixelated` in CSS.
- **Outline**: always 1px dark outline (#3d2810 or #0d0a06) around characters and icons.
- **Shadow**: hard drop shadow only, never soft/blurred. 4px offset at `#3d2810`.
- **Font in assets**: if text appears inside pixel art, use a pixel font style (VT323 or Press Start 2P visual equivalent), all caps.
- **Export format**: PNG with transparency (except solid backgrounds which are JPG).

---

## QUICK REFERENCE — Asset Checklist

| ID      | Asset                     | Size       | Priority |
| ------- | ------------------------- | ---------- | -------- |
| BG-01   | Temple Exterior (landing) | 1920×1080  | HIGH     |
| BG-02   | Temple Interior (/temple) | 1920×1080  | HIGH     |
| BG-03   | Scroll Hall (/prophecies) | 1920×1080  | MEDIUM   |
| CHAR-01 | Oracle figure             | 64×64      | HIGH     |
| CHAR-02 | Disciple sprite           | 32×48      | MEDIUM   |
| CHAR-03 | Disciple card portrait    | 120×120    | HIGH     |
| UI-01   | Pixel panel frame         | 256×256    | HIGH     |
| UI-02   | Button (primary)          | 200×48 × 3 | HIGH     |
| UI-03   | Button (danger)           | 200×48 × 3 | LOW      |
| UI-04   | USDY coin icon            | 32×32      | MEDIUM   |
| UI-05   | Chain/MNT icon            | 32×32      | LOW      |
| UI-06   | Scroll icon               | 32×32      | MEDIUM   |
| UI-07   | Star/karma icon           | 16×16      | MEDIUM   |
| UI-08   | Fulfilled badge           | 24×24      | MEDIUM   |
| UI-09   | Pending badge             | 24×24      | MEDIUM   |
| DECO-01 | Horizontal divider        | 512×16     | LOW      |
| DECO-02 | Corner ornament           | 48×48      | LOW      |
| DECO-03 | Floating rune particle    | 8×8 × 4    | LOW      |
| DECO-04 | Oracle Eye logo           | 128×128    | HIGH     |
| FX-01   | Claim burst effect        | 64×64 × 6  | MEDIUM   |
| FX-02   | Loading spinner           | 32×32 × 8  | LOW      |
