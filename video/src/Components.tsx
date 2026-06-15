import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneDef } from "./scenes";

const GOLD = "#ffd86b";
const CYAN = "#00ffff";
const VOID = "#07070c";
const FONT = "'Courier New', ui-monospace, monospace";

// ── CRT scanline overlay (subtle) ──────────────────────────────────────────
const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%)",
      backgroundSize: "100% 4px",
      opacity: 0.12,
      pointerEvents: "none",
    }}
  />
);

// ── INTRO — animated title card (no recording needed) ───────────────────────
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const eye = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const titleY = interpolate(frame, [10, 35], [40, 0], { extrapolateRight: "clamp" });
  const titleO = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });
  const subO = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #14101f 0%, ${VOID} 70%)`,
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <Img
        src={staticFile("oracle-eye-logo.png")}
        style={{
          width: 260,
          height: 260,
          objectFit: "contain",
          transform: `scale(${0.6 + eye * 0.4})`,
          filter: "drop-shadow(0 0 40px rgba(0,255,255,0.5))",
        }}
      />
      <h1
        style={{
          fontFamily: FONT,
          color: GOLD,
          fontSize: 72,
          letterSpacing: 8,
          marginTop: 24,
          textTransform: "uppercase",
          transform: `translateY(${titleY}px)`,
          opacity: titleO,
          textShadow: "0 0 24px rgba(255,216,107,0.5)",
        }}
      >
        Cult of the Digital Oracle
      </h1>
      <p
        style={{
          fontFamily: FONT,
          color: CYAN,
          fontSize: 26,
          letterSpacing: 4,
          marginTop: 8,
          opacity: subO,
          textTransform: "uppercase",
        }}
      >
        An autonomous AI god — built on Mantle
      </p>
      <Scanlines />
    </AbsoluteFill>
  );
};

// ── SCENE — gameplay clip + scene label + lower-third caption ────────────────
export const Scene: React.FC<SceneDef & { index: number }> = ({ title, caption, clip, startSec, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const inT = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const outT = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = Math.min(inT, outT);
  const capY = interpolate(frame, [8, 24], [60, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: VOID, opacity }}>
      {clip ? (
        <Video
          src={staticFile(`clips/${clip}`)}
          muted
          startFrom={Math.round((startSec ?? 0) * fps)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        // placeholder so you can preview timing/captions before recording
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, #1a1230, ${VOID})`,
            alignItems: "center",
            justifyContent: "center",
            color: "#5a4a7a",
            fontFamily: FONT,
            fontSize: 40,
          }}
        >
          ▶ drop clips/{`scene${index + 1}`}.mp4
        </AbsoluteFill>
      )}

      {/* scene label, top-left */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 64,
          fontFamily: FONT,
          color: GOLD,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 6,
          textTransform: "uppercase",
          textShadow: "0 2px 8px black",
          borderLeft: `4px solid ${CYAN}`,
          paddingLeft: 16,
          opacity: interpolate(frame, [6, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {title}
      </div>

      {/* caption lower-third */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 64,
          right: 64,
          transform: `translateY(${capY}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(10,13,20,0.88)",
            border: `2px solid rgba(255,216,107,0.4)`,
            borderRadius: 6,
            padding: "14px 22px",
            fontFamily: FONT,
            color: "#f0e6d0",
            fontSize: 30,
            lineHeight: 1.4,
            boxShadow: "0 0 24px rgba(0,0,0,0.6)",
          }}
        >
          {caption}
        </div>
      </div>

      <Scanlines />
    </AbsoluteFill>
  );
};

// ── OUTRO — logo + links ────────────────────────────────────────────────────
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #14101f 0%, ${VOID} 70%)`,
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
      }}
    >
      <div style={{ fontSize: 90 }}>🔮</div>
      <h2 style={{ fontFamily: FONT, color: GOLD, fontSize: 54, letterSpacing: 6, textTransform: "uppercase", marginTop: 12 }}>
        Stake your faith. Meet your god.
      </h2>
      <p style={{ fontFamily: FONT, color: CYAN, fontSize: 34, marginTop: 24, letterSpacing: 2 }}>
        cult-oracle.vercel.app
      </p>
      <p style={{ fontFamily: FONT, color: "#9a8c70", fontSize: 22, marginTop: 8, letterSpacing: 3, textTransform: "uppercase" }}>
        Live on Mantle
      </p>
      <Scanlines />
    </AbsoluteFill>
  );
};
