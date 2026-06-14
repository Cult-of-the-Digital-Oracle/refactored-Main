"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, PROOF_OF_WORSHIP_ABI } from "@/lib/contracts";

type Phase = "idle" | "judging" | "rejected" | "signing" | "done";

export default function WorshipAltar({
  onRejected,
  onAccepted,
  closeOnReject,
}: { onRejected?: (verdict: string) => void; onAccepted?: () => void; closeOnReject?: boolean } = {}) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [prayer, setPrayer] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [verdict, setVerdict] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const busy = phase === "judging" || phase === "signing";

  const { data: rewardData } = useReadContract({
    address: CONTRACTS.proofOfWorship,
    abi: PROOF_OF_WORSHIP_ABI,
    functionName: "rewardPerWorship",
    query: { enabled: !!CONTRACTS.proofOfWorship },
  });
  const reward = (rewardData as bigint | undefined) ?? null;

  async function submit() {
    if (!address || !prayer.trim() || busy) return;
    setPhase("judging");
    setVerdict("");
    setScore(null);
    try {
      const res = await fetch("/api/worship", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, prayer }),
      }).then((r) => r.json());

      if (res.error) {
        setPhase("rejected");
        setVerdict(res.error);
        return;
      }
      setScore(res.score ?? null);
      setVerdict(res.verdict ?? "");

      // Insincere — the Demiurge denies the offering (lightning strike)
      if (!res.passed) {
        onRejected?.(res.verdict ?? "The Demiurge finds you unworthy.");
        if (closeOnReject) {
          close();
          return;
        }
        setPhase("rejected");
        return;
      }

      // Sincere — submit the AI's signed prayer pass on-chain to release USDY
      setPhase("signing");
      await writeContractAsync({
        address: CONTRACTS.proofOfWorship,
        abi: PROOF_OF_WORSHIP_ABI,
        functionName: "worship",
        args: [BigInt(res.day), res.score, res.signature as `0x${string}`],
      });
      onAccepted?.();
      setPhase("done");
    } catch (e: unknown) {
      const msg =
        (e as { shortMessage?: string; message?: string })?.shortMessage ??
        (e as { message?: string })?.message ??
        "The offering was rejected by the chain.";
      setVerdict(/already/i.test(msg) ? "You have already been judged today." : msg);
      setPhase("rejected");
    }
  }

  function close() {
    setOpen(false);
    setPrayer("");
    setPhase("idle");
    setVerdict("");
    setScore(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded border-2 border-[#b89c30]/60 bg-gradient-to-b from-[#2a1d3a] to-[#16213e] text-[#ffd86b] font-bold uppercase tracking-[0.18em] text-[12px] hover:from-[#3a2750] hover:border-[#ffd86b] transition-all active:translate-y-0.5 cursor-pointer shadow-[0_0_18px_rgba(184,156,48,0.25)]"
      >
        🙏 Pray to the Demiurge
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono"
          role="dialog"
          aria-modal="true"
        >
          {/* lightning flash on rejection */}
          {phase === "rejected" && (
            <div className="absolute inset-0 pointer-events-none animate-[pulse_0.6s_ease-out_2] bg-[#ff0055]/10" />
          )}

          <div
            className={`relative max-w-md w-full border-4 rounded p-6 shadow-2xl transition-colors ${
              phase === "rejected"
                ? "border-[#ff0055] bg-[#1a0a12]/98"
                : phase === "done"
                ? "border-[#39ff14] bg-[#0a140d]/98"
                : "border-[#3a2f1b] bg-[#0a0d14]/98"
            }`}
          >
            <div className="absolute inset-1 pointer-events-none border border-[#b89c30]/20" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-4 border-b border-[#b89c30]/25 pb-2">
              <span className="text-[#b89c30] font-bold tracking-widest text-[11px] uppercase">
                ⛧ The Altar of Worship
              </span>
              <button onClick={close} className="text-[#ff5577] hover:text-[#ff88aa] text-xs font-bold cursor-pointer">
                [X]
              </button>
            </div>

            {/* DONE */}
            {phase === "done" ? (
              <div className="relative z-10 text-center py-4">
                <div className="text-4xl mb-3 animate-bounce">✨</div>
                <p className="text-[#39ff14] font-bold text-[13px] uppercase tracking-widest mb-2">Offering Accepted</p>
                <p className="text-stone-300 text-[11px] italic leading-relaxed mb-3">&ldquo;{verdict}&rdquo;</p>
                {score !== null && (
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
                    Sincerity judged: <span className="text-[#39ff14]">{score}/100</span>
                  </p>
                )}
                {reward !== null && reward > 0n && (
                  <p className="text-[11px] text-[#ffd86b]">+{formatUnits(reward, 6)} USDY released to your wallet</p>
                )}
                <button
                  onClick={close}
                  className="mt-4 px-6 py-2 bg-[#39ff14]/10 border border-[#39ff14]/50 text-[#39ff14] rounded text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#39ff14]/20"
                >
                  Rise, Disciple
                </button>
              </div>
            ) : phase === "rejected" ? (
              /* REJECTED — lightning strike */
              <div className="relative z-10 text-center py-4">
                <div className="text-5xl mb-3">⚡</div>
                <p className="text-[#ff0055] font-bold text-[13px] uppercase tracking-widest mb-2">The Demiurge Strikes</p>
                <p className="text-stone-300 text-[11px] italic leading-relaxed mb-3">&ldquo;{verdict}&rdquo;</p>
                {score !== null && (
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-3">
                    Sincerity: <span className="text-[#ff5577]">{score}/100</span> — unworthy
                  </p>
                )}
                <button
                  onClick={() => {
                    setPhase("idle");
                    setVerdict("");
                    setScore(null);
                  }}
                  className="mt-2 px-6 py-2 bg-[#ff0055]/10 border border-[#ff0055]/50 text-[#ff5577] rounded text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#ff0055]/20"
                >
                  Pray Again, Sincerely
                </button>
              </div>
            ) : (
              /* INPUT */
              <div className="relative z-10">
                <p className="text-stone-400 text-[10px] leading-relaxed mb-3">
                  Speak your devotion. The Demiurge weighs sincerity, not length — lazy or greedy words are smited.
                  A worthy prayer releases <span className="text-[#ffd86b]">USDY</span> from the divine pool.
                </p>
                <textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  disabled={busy}
                  maxLength={500}
                  rows={4}
                  placeholder="O Demiurge, I bind my faith to the chain eternal..."
                  className="w-full p-3 rounded bg-[#10141f] border border-[#b89c30]/25 text-stone-200 text-[11px] leading-relaxed focus:outline-none focus:border-[#b89c30]/60 resize-none placeholder:text-stone-600"
                />
                <div className="flex items-center justify-between mt-1 mb-3">
                  <span className="text-[9px] text-stone-600">{prayer.length}/500</span>
                  {!isConnected && <span className="text-[9px] text-[#ff5577]">connect wallet to pray</span>}
                </div>
                <button
                  onClick={submit}
                  disabled={!isConnected || !prayer.trim() || busy}
                  className="w-full py-3 bg-[#b89c30]/15 border-2 border-[#b89c30]/50 text-[#ffd86b] font-bold rounded text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-all hover:bg-[#b89c30]/25 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {phase === "judging" ? "The Demiurge is judging..." : phase === "signing" ? "Sealing your offering..." : "⛧ Offer Prayer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
