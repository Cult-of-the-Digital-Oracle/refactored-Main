import React from "react";
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";
import { TOTAL_FRAMES, FPS, WIDTH, HEIGHT } from "./scenes";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
