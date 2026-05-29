'use client';

import React from 'react';
import { SimEntity, SimRegion } from '../../lib/simulation/types';

interface EntityInfoCardProps {
  hoveredEntity: SimEntity | null;
  hoveredRegion: SimRegion | null;
}

export default function EntityInfoCard({
  hoveredEntity,
  hoveredRegion,
}: EntityInfoCardProps) {
  // Helper to draw segmented progress bars [■■■■■□□□□□]
  const renderProgressBar = (value: number, colorClass: string) => {
    const filled = Math.round(value / 10);
    const empty = 10 - filled;
    return (
      <div className="flex justify-between items-center font-mono text-[10px] mt-1.5">
        <span className={`${colorClass} tracking-tighter`}>
          {'█'.repeat(filled)}
          <span className="opacity-20 text-stone-600">{'█'.repeat(empty)}</span>
        </span>
        <span className="text-stone-400 font-bold ml-2">{Math.round(value)}%</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col p-4 w-full h-48 md:h-64 rounded bg-[#10141f]/95 border-2 border-[#3a2f1b] shadow-lg text-stone-200 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#b89c30]/40">
        <span className="text-[#00ffff] font-bold tracking-widest text-[9px] uppercase">🔎 SECTOR ANALYSIS INFOCARD</span>
        <span className="text-[9px] text-[#b89c30] font-bold">SCANNER V1</span>
      </div>

      {/* Render Region Node details */}
      {hoveredRegion && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-stone-100 uppercase">
                Settlement Node #{hoveredRegion.id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                hoveredRegion.faction === 'believer' ? 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]' :
                hoveredRegion.faction === 'apostate' ? 'bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055]' :
                'bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[#ffaa00]'
              }`}>
                {hoveredRegion.faction} dominated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-[10px]">
              <div>
                <span className="text-stone-500 uppercase block">POPULATION:</span>
                <span className="text-stone-200 font-bold font-mono">{hoveredRegion.population} NPCs</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block">FOUNDED DAY:</span>
                <span className="text-stone-200 font-bold font-mono">Day #{hoveredRegion.foundedAt}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#b89c30]/10 pt-2.5">
            <div>
              <span className="text-stone-500 text-[9px] uppercase font-bold block">REGIONAL RESOURCES INVENTORY</span>
              {renderProgressBar(hoveredRegion.resources, 'text-[#00ffff]')}
            </div>
            <div>
              <span className="text-stone-500 text-[9px] uppercase font-bold block">REGIONAL FAITH LEVEL</span>
              {renderProgressBar(hoveredRegion.faith, hoveredRegion.faction === 'believer' ? 'text-[#39ff14]' : hoveredRegion.faction === 'apostate' ? 'text-[#ff0055]' : 'text-[#ffaa00]')}
            </div>
          </div>
        </div>
      )}

      {/* Render NPC Details */}
      {hoveredEntity && (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-stone-100">
                NPC Unit #{hoveredEntity.id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                hoveredEntity.type === 'believer' ? 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]' :
                hoveredEntity.type === 'apostate' ? 'bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055]' :
                'bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[#ffaa00]'
              }`}>
                {hoveredEntity.type}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
              <div>
                <span className="text-stone-500 uppercase block">STATE:</span>
                <span className="text-stone-200 font-bold font-mono uppercase">{hoveredEntity.behavior}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block">REGION REF:</span>
                <span className="text-stone-200 font-bold font-mono">Node #{hoveredEntity.regionId}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block">KARMA INDEX:</span>
                <span className="text-stone-200 font-bold font-mono">{hoveredEntity.karma}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#b89c30]/10 pt-2.5">
            <div>
              <span className="text-stone-500 text-[9px] uppercase font-bold block">UNIT VITAL HEALTH STATUS</span>
              {renderProgressBar(hoveredEntity.health, 'text-[#ff0055]')}
            </div>
            <div>
              <span className="text-stone-500 text-[9px] uppercase font-bold block">PERSONAL FAITH LEVEL</span>
              {renderProgressBar(hoveredEntity.faith, 'text-[#39ff14]')}
            </div>
          </div>
        </div>
      )}

      {/* Render Empty State */}
      {!hoveredEntity && !hoveredRegion && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 flex items-center justify-center text-xl animate-pulse text-[#b89c30] mb-2">
            📡
          </div>
          <p className="text-stone-400 text-[10px] uppercase leading-relaxed tracking-wider">
            SYSTEM SCANNING STABLE.
            <br />
            HOVER OVER A TOWNSHIP OR NPC UNIT ON THE MAP SENSOR TO ANALYZE THEIR LIVE TELEMETRY STATE.
          </p>
        </div>
      )}
    </div>
  );
}
