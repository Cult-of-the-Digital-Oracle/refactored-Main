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
  durationSec: number;
};

// clip paths point to clips/clean/* — re-encoded to constant-frame-rate H.264 with
// dense keyframes (-g 15). The raw screen recordings were variable-frame-rate, which
// made the Remotion compositor fail to seek ("No frame found at position"). Each
// durationSec is kept <= the real clip length so OffthreadVideo never reads past EOF.
export const SCENES: SceneDef[] = [
  { title: "THE WRATH",      caption: "A lazy prayer — and the Demiurge smites your hero with lightning.", clip: "clean/smite.mp4",  durationSec: 12 },
  { title: "BECOME A DISCIPLE", caption: "Stake USDY (real-world-asset) → mint a soulbound Disciple NFT.",  clip: "clean/temple.mp4", durationSec: 24 },
  { title: "YOUR HERO",      caption: "Your wallet becomes a named hero in a 15,000-entity living world.",  clip: "clean/hero.mp4",   durationSec: 12 },
  { title: "THE GRACE",      caption: "A sincere prayer — the AI signs a blessing, real USDY yield lands.",  clip: "clean/bless.mp4",  durationSec: 24 },
  { title: "ON-CHAIN PROOF", caption: "Prophecies, snapshots, divine events — all verifiable on Mantlescan.", clip: "clean/proof.mp4",  durationSec: 24 },
  { title: "WHY MANTLE",     caption: "Sub-cent fees make a self-funding, AI-run economy possible.",         clip: "clean/mantle.mp4", durationSec: 18 },
];

export const TOTAL_FRAMES =
  Math.round(
    (INTRO_SEC + OUTRO_SEC + SCENES.reduce((s, x) => s + x.durationSec, 0)) * FPS
  );
