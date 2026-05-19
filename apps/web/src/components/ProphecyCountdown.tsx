"use client";

import { useEffect, useState } from "react";

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ProphecyCountdown() {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(secondsUntilMidnightUTC());
    const id = setInterval(() => setSecs(secondsUntilMidnightUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  if (secs === null) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--pixel-muted)]">
        Oracle speaks again in
      </p>
      <p className="tabular-nums text-4xl text-[var(--pixel-border)] drop-shadow-[0_0_12px_rgba(200,168,75,0.55)]">
        {fmt(secs)}
      </p>
    </div>
  );
}
