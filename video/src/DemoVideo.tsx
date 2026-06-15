import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Intro, Scene, Outro } from "./Components";
import { SCENES, INTRO_SEC, OUTRO_SEC, FPS } from "./scenes";

const sec = (s: number) => Math.round(s * FPS);

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07070c" }}>
      {/* Background music: drop public/music.mp3, then import Audio + staticFile and uncomment:
      <Audio src={staticFile("music.mp3")} volume={0.45} /> */}
      <Series>
        <Series.Sequence durationInFrames={sec(INTRO_SEC)}>
          <Intro />
        </Series.Sequence>

        {SCENES.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={sec(s.durationSec)}>
            <Scene {...s} index={i} />
          </Series.Sequence>
        ))}

        <Series.Sequence durationInFrames={sec(OUTRO_SEC)}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
