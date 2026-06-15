// ── Edit these to match your recorded clips + the demo script ──────────────
// Drop each clip into video/public/clips/ with the matching filename.
// durationSec should roughly match your recorded clip length.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const INTRO_SEC = 4;
export const OUTRO_SEC = 6;

export type SceneDef = {
  title: string;        // big scene label (top-left)
  caption: string;      // lower-third narration line
  clip?: string;        // file in public/clips/ ; omit to preview as a placeholder
  startSec?: number;    // skip into the clip (sec) — jump past slow lead-in to the action. Default 0.
  durationSec: number;  // how long this scene plays. startSec + durationSec must be <= clip length.
};

// clip paths point to clips/clean/* — re-encoded to constant-frame-rate H.264.
//
// TUNE TIMING HERE (live preview in `npm run dev`):
//   startSec    = where in the clip the scene begins (skip slow lead-in to the action)
//   durationSec = how long the scene plays
//   RULE: startSec + durationSec must be <= the clip length below, or it reads past EOF.
//
// Real clip lengths (sec): smite 16.9 · temple 50.9 · hero 12.9 · bless 36.5 · proof 37.2 · mantle 27.3
export const SCENES: SceneDef[] = [
  { title: "THE WRATH",         caption: "A lazy prayer — and the Demiurge smites your hero with lightning.",  clip: "clean/smite.mp4",  startSec: 0, durationSec: 16 },
  { title: "BECOME A DISCIPLE", caption: "Stake USDY (real-world-asset) → mint a soulbound Disciple NFT.",      clip: "clean/temple.mp4", startSec: 0, durationSec: 30 },
  { title: "YOUR HERO",         caption: "Your wallet becomes a named hero in a 15,000-entity living world.",   clip: "clean/hero.mp4",   startSec: 0, durationSec: 12 },
  { title: "THE GRACE",         caption: "A sincere prayer — the AI signs a blessing, real USDY yield lands.",  clip: "clean/bless.mp4",  startSec: 0, durationSec: 36 },
  { title: "ON-CHAIN PROOF",    caption: "Prophecies, snapshots, divine events — all verifiable on Mantlescan.", clip: "clean/proof.mp4",  startSec: 0, durationSec: 30 },
  { title: "WHY MANTLE",        caption: "Sub-cent fees make a self-funding, AI-run economy possible.",          clip: "clean/mantle.mp4", startSec: 0, durationSec: 24 },
];

export const TOTAL_FRAMES =
  Math.round(
    (INTRO_SEC + OUTRO_SEC + SCENES.reduce((s, x) => s + x.durationSec, 0)) * FPS
  );
