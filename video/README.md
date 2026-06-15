# 🎥 Oracle Demo Video (Remotion)

Build the 3-min demo video **as code** — no timeline editing. You record short
gameplay clips; Remotion adds the animated intro, scene titles, captions,
transitions, and outro, then renders one clean `.mp4`.

## 1. Install (one-time)
```bash
cd video
npm install      # also downloads a headless Chromium (~a few minutes)
```

## 2. Record the 6 clips (OBS, 1080p60)
Save each into `public/clips/` with these exact names (see `public/clips/README.txt`):
`smite.mp4` · `temple.mp4` · `hero.mp4` · `bless.mp4` · `proof.mp4` · `mantle.mp4`

Each scene previews as a labelled placeholder until its clip exists — so you can
design timing/captions first, record after.

## 3. Preview in Remotion Studio
```bash
npm run dev      # opens the Studio at http://localhost:3000
```
Scrub the timeline, check captions + timing live.

## 4. Tune (optional)
Everything lives in **`src/scenes.ts`** — scene order, titles, captions, and
`durationSec` (match your clip lengths). Intro/outro length too. No other file
needs touching.

## 5. Render the final video
```bash
npm run render   # → out/demo.mp4 (h264, CRF 18)
```
Upload `out/demo.mp4` to YouTube/Loom → paste the link in your DoraHacks BUIDL.

## Optional: music
Drop `public/music.mp3`, then in `src/DemoVideo.tsx` import `Audio` + `staticFile`
and uncomment the `<Audio>` line.

---
**Files:** `src/scenes.ts` (the config you edit) · `src/Components.tsx` (Intro/Scene/Outro
visuals) · `src/DemoVideo.tsx` (assembly) · `src/Root.tsx` (composition). On-brand
pixel/CRT styling, gold + cyan, matching the app.
