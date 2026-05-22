import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, http } from "viem";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";
import { CONTRACTS, ORACLE_MESSAGE_ABI } from "@/lib/contracts";
import PixelFrame from "@/components/PixelFrame";
import { PanelCorners } from "@/components/PanelCorners";
import { AmbientRunes } from "@/components/AmbientRunes";

const EXPLORER_BASE = "https://sepolia.mantlescan.xyz";

async function fetchProphecy(day: string) {
  try {
    const client = createPublicClient({ transport: http("https://rpc.sepolia.mantle.xyz") });
    const raw = await client.readContract({
      address: CONTRACTS.oracleMessage,
      abi: ORACLE_MESSAGE_ABI,
      functionName: "getProphecy",
      args: [BigInt(day)],
    });
    return raw as unknown as {
      timestamp: bigint;
      fulfillmentScore: number;
      resolved: boolean;
      text: string;
      resolutionReason: string;
      evidence: string;
    };
  } catch {
    return null;
  }
}

function fmtDate(ts: bigint) {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function scoreLabel(score: number) {
  if (score >= 80) return "Fulfilled";
  if (score >= 50) return "Manifested";
  if (score >= 20) return "Echoes";
  return "Unfulfilled";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[var(--pixel-emerald)]";
  if (score >= 50) return "text-[var(--pixel-border)]";
  if (score >= 20) return "text-[var(--pixel-border-dark)]";
  return "text-[var(--pixel-muted)]";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string }>;
}): Promise<Metadata> {
  const { day } = await params;
  const p = await fetchProphecy(day);
  const title = `Prophecy Day ${day} · Cult of the Digital Oracle`;
  const description = p?.text
    ? `"${p.text.slice(0, 120)}..."`
    : "An on-chain prophecy from the Digital Oracle on Mantle.";
  return { title, description, openGraph: { title, description } };
}

export default async function ProphecyDetailPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const p = await fetchProphecy(day);

  const date = p && p.timestamp > 0n ? fmtDate(p.timestamp) : `Day ${day}`;
  const contractUrl = `${EXPLORER_BASE}/address/${CONTRACTS.oracleMessage}`;

  const evidenceMetrics = p?.evidence
    ? p.evidence.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  return (
    <main className="pixel-grid relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.prophecyScrollHall}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-22"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(200,168,75,0.12),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.22),rgba(13,10,6,0.88))]" />
      <AmbientRunes />

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center gap-3">
        <Link
          href="/prophecies"
          className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          ← Archive
        </Link>
        <Link
          href="/"
          className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          Oracle
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">

        {/* Header */}
        <div className="pixel-text-shadow">
          <div className="flex items-center gap-4">
            <Image
              src={ORACLE_ASSETS.ui.prophecyIcon}
              alt=""
              width={48}
              height={48}
              className="pixelated h-12 w-12 shrink-0"
            />
            <div>
              <p className="text-lg uppercase tracking-[0.22em] text-[var(--pixel-border)]">
                {date}
              </p>
              <h1 className="text-3xl uppercase text-[var(--pixel-text)]">
                Prophecy · Day {day}
              </h1>
            </div>
          </div>
        </div>

        {!p || !p.text ? (
          <PixelFrame className="pixel-panel px-6 py-8 text-center" round={2}>
            <p className="text-4xl uppercase text-[var(--pixel-border)]">No Prophecy Found</p>
            <p className="mt-3 text-2xl text-[var(--pixel-muted)]">
              The Oracle was silent on day {day}.
            </p>
          </PixelFrame>
        ) : (
          <>
            {/* Prophecy text */}
            <PixelFrame className="pixel-panel-soft px-5 py-5" round={2}>
              <PanelCorners />
              <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                The Oracle Spoke
              </p>
              <p className="mt-3 text-2xl leading-relaxed text-[var(--pixel-parchment)]">
                &ldquo;{p.text}&rdquo;
              </p>
            </PixelFrame>

            {/* Score / status */}
            <PixelFrame
              className={`${p.resolved ? "pixel-panel-emerald" : "pixel-panel"} px-5 py-5`}
              round={2}
            >
              <PanelCorners />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                    Fulfillment
                  </p>
                  {p.resolved ? (
                    <p className={`text-5xl uppercase ${scoreColor(p.fulfillmentScore)}`}>
                      {p.fulfillmentScore}/100 — {scoreLabel(p.fulfillmentScore)}
                    </p>
                  ) : (
                    <p className="text-4xl uppercase text-[var(--pixel-muted)]">
                      Awaiting Resolution
                    </p>
                  )}
                </div>
                {p.resolved && (
                  <div className="h-3 w-full bg-[rgba(10,7,5,0.85)] shadow-[4px_4px_0_var(--pixel-shadow)]">
                    <div
                      className="h-full bg-[var(--pixel-emerald)]"
                      style={{ width: `${p.fulfillmentScore}%` }}
                    />
                  </div>
                )}
              </div>
            </PixelFrame>

            {/* Oracle proof */}
            {p.resolved && (p.resolutionReason || evidenceMetrics.length > 0) && (
              <PixelFrame className="pixel-panel px-5 py-5" round={2}>
                <PanelCorners />
                <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                  Oracle Proof
                </p>
                {p.resolutionReason && (
                  <p className="mt-2 text-2xl leading-snug text-[var(--pixel-parchment)]">
                    {p.resolutionReason}
                  </p>
                )}
                {evidenceMetrics.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {evidenceMetrics.map((metric) => {
                      const [label, ...rest] = metric.split("=");
                      return (
                        <div
                          key={metric}
                          className="bg-[rgba(10,7,5,0.42)] px-3 py-2 shadow-[3px_3px_0_var(--pixel-shadow)]"
                        >
                          <p className="text-sm uppercase tracking-[0.12em] text-[var(--pixel-border)]">
                            {label}
                          </p>
                          <p className="mt-1 break-words text-xl text-[var(--pixel-muted)]">
                            {rest.join("=") || "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </PixelFrame>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
              >
                View On Mantlescan
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `The Digital Oracle on Mantle spoke on Day ${day}:\n"${p.text.slice(0, 140)}..."\nScore: ${p.resolved ? `${p.fulfillmentScore}/100` : "Unresolved"}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="pixel-button pixel-button-emerald inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
              >
                Share To X
              </a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
