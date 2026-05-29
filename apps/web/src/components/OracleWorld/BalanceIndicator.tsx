'use client';

import React from 'react';

interface BalanceIndicatorProps {
  balanceHistory: ('good' | 'evil')[]; // Last 10 polarities
}

export default function BalanceIndicator({ balanceHistory = [] }: BalanceIndicatorProps) {
  // Pad history with default elements to always show 10 slots
  const fullHistory: ('good' | 'evil' | 'empty')[] = [...balanceHistory];
  while (fullHistory.length < 10) {
    fullHistory.push('empty');
  }

  const goodCount = balanceHistory.filter(h => h === 'good').length;
  const evilCount = balanceHistory.filter(h => h === 'evil').length;

  return (
    <div className="flex flex-col p-4 w-full rounded bg-[#10141f]/95 border-2 border-[#3a2f1b] shadow-lg text-stone-200 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#b89c30]/40">
        <span className="text-[#39ff14] font-bold tracking-widest text-[9px] uppercase">⚖️ COSMIC ALIGNMENT INDEX</span>
        <span className="text-[9px] text-[#ff00ff] font-bold">50/50 STRICT</span>
      </div>

      {/* History Grid */}
      <span className="text-[9px] text-stone-400 uppercase block mb-2 tracking-wider">
        ROLLING WINDOW (LAST 10 ENFORCED ACTIONS)
      </span>

      <div className="grid grid-cols-10 gap-1.5 mb-4">
        {fullHistory.map((status, index) => {
          let symbol = '—';
          let bgColor = 'bg-[#0a0d14] border-stone-800';
          let textColor = 'text-stone-600';
          let glowClass = '';

          if (status === 'good') {
            symbol = '🌟';
            bgColor = 'bg-[#39ff14]/10 border-[#39ff14]/30';
            textColor = 'text-[#39ff14]';
            glowClass = 'shadow-[0_0_8px_rgba(57,255,20,0.4)]';
          } else if (status === 'evil') {
            symbol = '💀';
            bgColor = 'bg-[#ff0055]/10 border-[#ff0055]/30';
            textColor = 'text-[#ff0055]';
            glowClass = 'shadow-[0_0_8px_rgba(255,0,85,0.4)]';
          }

          return (
            <div
              key={index}
              className={`h-9 flex items-center justify-center rounded border font-bold text-sm ${bgColor} ${textColor} ${glowClass} transition-all duration-300`}
              title={`Action #${index + 1}: ${status.toUpperCase()}`}
            >
              {symbol}
            </div>
          );
        })}
      </div>

      {/* Ratios & Enforcer State */}
      <div className="p-2.5 rounded bg-[#07090f] border border-[#b89c30]/20 text-[10px]">
        <div className="flex justify-between mb-1.5">
          <span className="text-stone-400">GOOD ALIGNED ACTIONS:</span>
          <span className="text-[#39ff14] font-bold">{goodCount} / 10</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-stone-400">EVIL ALIGNED ACTIONS:</span>
          <span className="text-[#ff0055] font-bold">{evilCount} / 10</span>
        </div>

        {/* Dynamic Warning Alert depending on balance */}
        {Math.abs(goodCount - evilCount) >= 2 ? (
          <div className="border border-[#ffaa00]/30 bg-[#ffaa00]/5 p-1.5 text-center text-[#ffaa00] text-[9px] font-bold rounded animate-pulse">
            ⚠️ COSMIC BOUNDS VIOLATED: OPPOSITE ALIGNMENT WILL BE ENFORCED ON THE NEXT ROLL!
          </div>
        ) : (
          <div className="border border-[#39ff14]/20 bg-[#39ff14]/5 p-1.5 text-center text-[#39ff14] text-[9px] font-bold rounded">
            ✓ LAWS OF EQUALIBRIUM HOLD: DEMIURGE IN STANDARD ROTATION STATE.
          </div>
        )}
      </div>
    </div>
  );
}
