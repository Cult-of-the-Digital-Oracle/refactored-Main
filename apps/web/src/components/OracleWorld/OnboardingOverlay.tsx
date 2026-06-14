'use client';

import React from 'react';

interface OnboardingOverlayProps {
  open: boolean;
  onClose: () => void;
}

const ROWS: { icon: string; label: string; color: string; desc: string }[] = [
  {
    icon: '🔮',
    label: 'THE ORACLE · AI #1',
    color: '#00ffff',
    desc: 'Reads live Mantle chain data every day and writes a cryptic prophecy on-chain, then scores its own fulfillment.',
  },
  {
    icon: '🌍',
    label: 'THE CIVILIZATION · AI #2',
    color: '#39ff14',
    desc: 'A living continent of NPCs — simulated each day and committed on-chain as a verifiable state snapshot.',
  },
  {
    icon: '⚡',
    label: 'THE DEMIURGE · AI #3',
    color: '#ff00ff',
    desc: 'Reads the prophecy and unleashes a divine event — a blessing or a cataclysm — that you watch play out in the world.',
  },
  {
    icon: '⚜',
    label: 'YOUR HERO',
    color: '#ffd86b',
    desc: 'Stake USDY in the Temple and your wallet becomes a named, glowing hero NPC living in this world.',
  },
];

export default function OnboardingOverlay({ open, onClose }: OnboardingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to The Oracle Civilization"
    >
      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-15" />

      <div className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto border-4 border-[#3a2f1b] bg-[#0a0d14]/98 rounded shadow-2xl shadow-[inset_0_0_18px_black] p-6">
        <div className="absolute inset-1 pointer-events-none border border-[#b89c30]/20" />

        {/* Header */}
        <div className="relative z-10 text-center mb-5">
          <div className="text-4xl mb-2">🏛️</div>
          <h2 className="text-[13px] font-bold tracking-[0.2em] text-[#b89c30] uppercase">
            The Oracle Civilization
          </h2>
          <p className="mt-2 text-[10px] leading-relaxed text-stone-400 uppercase tracking-wider">
            A world run by <span className="text-[#00ffff]">3 autonomous AI agents</span> on Mantle.
            <br />No human in the loop — they read the chain, decide, and act on-chain every day.
          </p>
        </div>

        {/* Agent rows */}
        <div className="relative z-10 flex flex-col gap-2.5 mb-5">
          {ROWS.map((r) => (
            <div
              key={r.label}
              className="flex items-start gap-3 p-2.5 rounded bg-[#10141f] border border-[#b89c30]/15"
            >
              <span className="text-xl leading-none mt-0.5">{r.icon}</span>
              <div className="flex flex-col">
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: r.color }}
                >
                  {r.label}
                </span>
                <span className="text-[10px] leading-snug text-stone-300 mt-0.5">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <p className="relative z-10 text-[9px] leading-relaxed text-stone-500 text-center mb-5 px-2">
          💡 Hover any unit or hero to inspect it. Watch the{' '}
          <span className="text-[#b89c30]">Cosmic Alignment</span> (top) and{' '}
          <span className="text-[#ff00ff]">Demiurge Sector</span> (right) — they show the AI&apos;s
          real on-chain decisions, not mock data.
        </p>

        {/* CTA */}
        <button
          onClick={onClose}
          className="relative z-10 w-full py-3 bg-[#39ff14]/10 hover:bg-[#39ff14]/25 border-2 border-[#39ff14]/50 text-[#39ff14] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[11px] uppercase tracking-[0.2em]"
        >
          ▶ Enter the World
        </button>
      </div>
    </div>
  );
}
