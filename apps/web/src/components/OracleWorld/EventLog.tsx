'use client';

import React from 'react';

interface EventLogProps {
  events: string[];
}

export default function EventLog({ events = [] }: EventLogProps) {
  // Fallback default messages to show terminal vitality immediately on page load
  const activeEvents = events.length > 0 ? events : [
    "[01:30:10] Deterministic simulation engines online at 15 Hz.",
    "[01:30:05] Seeding civilization world for Day 20562...",
    "[01:30:00] Initialized world state. Faction balancing coordinates synced.",
    "[01:29:50] Awaiting incoming daily prophecy from AI #1..."
  ];

  return (
    <div className="flex flex-col p-4 w-full h-48 md:h-64 rounded bg-[#07090f]/95 border-2 border-[#3a2f1b] shadow-inner text-[#39ff14] font-mono text-[10px] select-none shadow-[inset_0_0_10px_black]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#39ff14]/30">
        <span className="tracking-widest uppercase font-bold text-[9px]">🖥️ SECURE LOGS CHANNEL</span>
        <span className="animate-pulse text-[#39ff14]">● STREAMING</span>
      </div>

      {/* Terminal lines wrapper */}
      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-[#39ff14]/20 pr-1">
        {activeEvents.map((evt, idx) => {
          // Color code certain events to look highly visual and readable
          let textColor = 'text-[#39ff14]';
          if (evt.includes('DIVINE EVENT')) textColor = 'text-[#ff00ff] font-bold';
          else if (evt.includes('perished') || evt.includes('obliterated')) textColor = 'text-[#ff0040]';
          else if (evt.includes('founded') || evt.includes('found faith')) textColor = 'text-[#00ffff]';
          else if (evt.includes('[') && evt.includes(']')) textColor = 'text-stone-400';

          return (
            <div key={idx} className={`leading-relaxed break-words font-mono ${textColor}`}>
              {evt}
            </div>
          );
        })}
      </div>
    </div>
  );
}
