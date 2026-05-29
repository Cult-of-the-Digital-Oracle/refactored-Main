'use client';

import React, { useState, useEffect } from 'react';
import { DIVINE_TOOLS } from '../../lib/simulation/divineTools';

interface CandidateTool {
  id: number;
  weight: number;
}

interface DivineToolsPanelProps {
  candidates: CandidateTool[]; // Array of tool ID + weighted probability
  lastExecutedToolId: number | null;
  balanceHistory: ('good' | 'evil')[]; // Last 10 events polarities
  nextExecutionTime: number; // Unix timestamp in ms
}

export default function DivineToolsPanel({
  candidates = [],
  lastExecutedToolId,
  balanceHistory = [],
  nextExecutionTime,
}: DivineToolsPanelProps) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');

  // Format countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = nextExecutionTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00 - Awaiting Call');
        return;
      }

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      setTimeLeft(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [nextExecutionTime]);

  const goodCount = balanceHistory.filter((h) => h === 'good').length;
  const evilCount = balanceHistory.filter((h) => h === 'evil').length;
  const totalCount = balanceHistory.length || 1;
  const balancePercentage = Math.round((goodCount / totalCount) * 100);

  // Generate mock top candidates if empty to make UI look fully alive and playable immediately
  const activeCandidates = candidates.length > 0 ? candidates : [
    { id: 5, weight: 85 }, // Meteor Strike
    { id: 0, weight: 65 }, // Blessing Rain
    { id: 6, weight: 45 }, // Plague Wave
    { id: 1, weight: 30 }, // Harvest Tide
    { id: 8, weight: 15 }, // Civil War Seed
  ];

  return (
    <div className="flex flex-col p-4 w-full md:w-80 rounded bg-[#10141f]/95 border-2 border-[#3a2f1b] shadow-lg text-stone-200 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#b89c30]/40">
        <span className="text-[#00ffff] font-bold tracking-widest text-[10px] uppercase">🔮 DEMIURGE SECTOR</span>
        <span className="text-[10px] text-stone-400">AI #3</span>
      </div>

      {/* Countdown Timer box */}
      <div className="flex flex-col items-center justify-center p-3 mb-4 rounded bg-[#07090f] border border-[#ff00ff]/30 text-center shadow-[inset_0_0_8px_rgba(255,0,255,0.15)]">
        <span className="text-[9px] text-[#ff00ff] tracking-widest uppercase mb-1">COSMIC TIMER TO ALIGNMENT</span>
        <span className="text-lg font-bold font-mono tracking-widest text-[#e0e0ff] drop-shadow-[0_0_8px_#ff00ff]">
          {timeLeft}
        </span>
      </div>

      {/* Probability Candidates lists */}
      <div className="mb-4">
        <span className="text-[9px] text-stone-400 tracking-wider uppercase block mb-2">
          DARK OMENS — CANDIDATE SELECTION
        </span>
        
        <div className="space-y-3">
          {activeCandidates.map((cand, idx) => {
            const tool = DIVINE_TOOLS[cand.id];
            if (!tool) return null;

            const isGood = tool.polarity === 'good';
            const polarityColor = isGood ? 'text-[#39ff14]' : 'text-[#ff0055]';
            const progressColor = isGood ? 'bg-[#39ff14]/80' : 'bg-[#ff0055]/80';

            // Calculate progress ticks
            const filledBlocks = Math.round(cand.weight / 10);
            const emptyBlocks = 10 - filledBlocks;
            const barString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

            return (
              <div key={cand.id} className="flex flex-col p-1.5 rounded bg-[#0a0d14]/70 border border-[#b89c30]/10 hover:border-[#b89c30]/30 transition-all">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[11px] text-stone-100 flex items-center">
                    <span className="text-stone-500 mr-1.5">{idx + 1}.</span>
                    {tool.name}
                  </span>
                  <span className={`text-[9px] font-bold ${polarityColor} uppercase tracking-wider`}>
                    {tool.polarity}
                  </span>
                </div>
                
                {/* Weight bar */}
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className={`${polarityColor} tracking-tighter opacity-80`}>{barString}</span>
                  <span className="text-stone-400 font-bold">{cand.weight}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance Indicator Slider */}
      <div className="mt-auto border-t border-[#b89c30]/20 pt-3">
        <div className="flex justify-between items-center text-[9px] text-stone-400 mb-1.5 uppercase">
          <span>COSMIC BALANCE</span>
          <span className="text-stone-200 font-bold font-mono">
            {goodCount}G / {evilCount}E
          </span>
        </div>

        {/* Dynamic bar slider */}
        <div className="h-3 w-full bg-[#0a0d14] rounded overflow-hidden border border-[#b89c30]/20 flex">
          <div 
            className="h-full bg-gradient-to-r from-[#ff0055] to-[#ffaa00]" 
            style={{ width: `${100 - balancePercentage}%` }} 
          />
          <div 
            className="h-full bg-gradient-to-r from-[#ffaa00] to-[#39ff14]" 
            style={{ width: `${balancePercentage}%` }} 
          />
        </div>

        <div className="flex justify-between text-[8px] text-stone-500 mt-1 uppercase font-bold">
          <span className="text-[#ff0055]">CHAOS</span>
          <span>EQUALIBRIUM</span>
          <span className="text-[#39ff14]">GRACE</span>
        </div>
      </div>

      {/* Last Executed Tool summary */}
      {lastExecutedToolId !== null && DIVINE_TOOLS[lastExecutedToolId] && (
        <div className="mt-3 p-2 bg-[#090b11] border border-[#b89c30]/20 rounded text-[9px]">
          <span className="text-[#b89c30] uppercase font-bold tracking-wider block mb-1">LAST DIVINE ACTION:</span>
          <span className="text-stone-300">
            "{DIVINE_TOOLS[lastExecutedToolId].name}" ({DIVINE_TOOLS[lastExecutedToolId].polarity})
          </span>
        </div>
      )}
    </div>
  );
}
