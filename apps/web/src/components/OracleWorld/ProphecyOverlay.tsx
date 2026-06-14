'use client';

import React, { useState, useEffect } from 'react';

interface ProphecyOverlayProps {
  prophecyText: string;
  structuredPrediction?: {
    targetType: string;
    direction: string;
    magnitude: string;
    confidence: number;
  };
  dayIndex: number;
}

export default function ProphecyOverlay({
  prophecyText,
  structuredPrediction,
  dayIndex,
}: ProphecyOverlayProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  const fullText = prophecyText || "The Oracle has not yet spoken today. The chain awaits the dawn.";

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    setIndex(0);
  }, [prophecyText]);

  useEffect(() => {
    if (index >= fullText.length) return;

    const timer = setTimeout(() => {
      setDisplayedText((prev) => prev + fullText.charAt(index));
      setIndex((prev) => prev + 1);
    }, 15); // Adjust typing speed here

    return () => clearTimeout(timer);
  }, [index, fullText]);

  return (
    <div className="flex flex-col p-4 w-full rounded bg-[#0a0d14]/95 border-4 border-[#3a2f1b] shadow-2xl text-stone-200 font-mono text-xs select-none relative shadow-[inset_0_0_15px_black]">
      {/* Scroll/RPG dialog double border decoration */}
      <div className="absolute inset-1 pointer-events-none border border-[#b89c30]/20" />

      {/* Ribbon title */}
      <div className="flex justify-between items-center pb-2 mb-3 border-b border-[#b89c30]/30 z-10">
        <span className="text-[#b89c30] font-bold tracking-widest text-[10px] uppercase">
          📜 THE DAILY PROPHECY — DAY {dayIndex}
        </span>
        <span className="text-[9px] text-[#00ffff] bg-[#00ffff]/10 px-2 py-0.5 rounded border border-[#00ffff]/20">
          ORACLE LOGGED
        </span>
      </div>

      {/* Prophecy Text */}
      <div className="min-h-[50px] mb-3 text-[11px] leading-relaxed text-stone-300 italic pr-2 z-10 relative">
        {displayedText}
        {index < fullText.length && (
          <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#b89c30] animate-pulse align-middle" />
        )}
      </div>

      {/* Structured Prediction display */}
      {structuredPrediction && (
        <div className="mt-2 p-2 rounded bg-[#10141f] border border-[#b89c30]/20 flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-stone-500 uppercase font-bold">ORACLE SEES:</span>
            <span className="px-2 py-0.5 rounded bg-[#ff00ff]/10 border border-[#ff00ff]/20 text-[#ff00ff] font-bold text-[10px] uppercase tracking-wider">
              {structuredPrediction.targetType}
            </span>
            <span className="text-stone-400 font-bold">will</span>
            <span className="px-2 py-0.5 rounded bg-[#00ffff]/10 border border-[#00ffff]/20 text-[#00ffff] font-bold text-[10px] uppercase tracking-wider">
              {structuredPrediction.direction}
            </span>
            <span className="text-stone-400 font-bold">({structuredPrediction.magnitude})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-stone-500 uppercase font-bold">CONFIDENCE:</span>
            <span className="text-[#39ff14] font-bold">
              {Math.round(structuredPrediction.confidence * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
