"use client";

import Image from "next/image";
import { useMemo } from "react";
import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, ORACLE_MESSAGE_ABI, TEMPLE_VAULT_ABI } from "@/lib/contracts";
import { AmbientRunes } from "@/components/AmbientRunes";
import { PanelCorners } from "@/components/PanelCorners";
import PixelFrame from "@/components/PixelFrame";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

type Prophecy = {
  text: string;
  timestamp: bigint;
  fulfillmentScore: number;
  resolutionReason: string;
  evidence: string;
  resolved: boolean;
};

type ProphecyEntry = Prophecy & { day: number };

function scoreLabel(score: number): string {
  if (score >= 80) return "Fulfilled";
  if (score >= 50) return "Manifested";
  if (score >= 20) return "Echoes";
  return "Unfulfilled";
}

function fmtDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scoreTheme(score: number) {
  if (score >= 80) {
    return {
      panel: "pixel-panel-emerald",
      text: "text-[var(--pixel-parchment)]",
      bar: "bg-[var(--pixel-emerald)]",
      badge: "bg-[rgba(74,158,107,0.16)] text-[var(--pixel-parchment)]",
    };
  }
  if (score >= 50) {
    return {
      panel: "pixel-panel-soft",
      text: "text-[var(--pixel-parchment)]",
      bar: "bg-[var(--pixel-border)]",
      badge: "bg-[rgba(200,168,75,0.16)] text-[var(--pixel-parchment)]",
    };
  }
  if (score >= 20) {
    return {
      panel: "pixel-panel-soft",
      text: "text-[var(--pixel-parchment)]",
      bar: "bg-[var(--pixel-border-dark)]",
      badge: "bg-[rgba(139,94,60,0.22)] text-[var(--pixel-parchment)]",
    };
  }
  return {
    panel: "pixel-panel",
    text: "text-[var(--pixel-muted)]",
    bar: "bg-[var(--pixel-shadow)]",
    badge: "bg-[rgba(61,40,16,0.4)] text-[var(--pixel-muted)]",
  };
}

export default function PropheciesPage() {
  const { data: totalCount } = useReadContract({
    address: CONTRACTS.oracleMessage,
    abi: ORACLE_MESSAGE_ABI,
    functionName: "totalProphecies",
  });

  const { data: totalFaith } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "totalFaith",
  });

  const prophecyIndexes = useMemo(
    () =>
      Array.from({ length: Number(totalCount ?? 0n) }, (_, i) =>
        BigInt(Number(totalCount ?? 0n) - 1 - i)
      ),
    [totalCount]
  );

  const dayContracts = useMemo(
    () =>
      prophecyIndexes.map((index) => ({
        address: CONTRACTS.oracleMessage,
        abi: ORACLE_MESSAGE_ABI,
        functionName: "prophecyDays" as const,
        args: [index] as const,
      })),
    [prophecyIndexes]
  );

  const { data: dayResults, isLoading: isLoadingDays } = useReadContracts({
    contracts: dayContracts,
    query: { enabled: dayContracts.length > 0 },
  });

  const prophecyDays = useMemo(
    () =>
      (dayResults ?? [])
        .map((item) => (item.status === "success" ? (item.result as bigint) : null))
        .filter((day): day is bigint => day !== null),
    [dayResults]
  );

  const prophecyContracts = useMemo(
    () =>
      prophecyDays.map((day) => ({
        address: CONTRACTS.oracleMessage,
        abi: ORACLE_MESSAGE_ABI,
        functionName: "getProphecy" as const,
        args: [day] as const,
      })),
    [prophecyDays]
  );

  const { data: prophecyResults, isLoading: isLoadingProphecies } = useReadContracts({
    contracts: prophecyContracts,
    query: { enabled: prophecyContracts.length > 0 },
  });

  const prophecies: ProphecyEntry[] = useMemo(() => {
    if (!prophecyResults) return [];
    return prophecyResults
      .map((item, i) => {
        if (item.status !== "success" || !item.result) return null;
        const p = item.result as unknown as Prophecy;
        if (!p.text) return null;
        return { ...p, day: Number(prophecyDays[i]) };
      })
      .filter((p): p is ProphecyEntry => p !== null);
  }, [prophecyDays, prophecyResults]);

  const isLoading = isLoadingDays || isLoadingProphecies;

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
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.22),rgba(13,10,6,0.86))]" />
      <AmbientRunes />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Back To Oracle
          </Link>
          <Link
            href="/leaderboard"
            className="pixel-button pixel-button-emerald inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Leaderboard
          </Link>
        </div>
        <PixelFrame className="pixel-panel-soft px-3 py-2" round={1}>
          <ConnectKitButton />
        </PixelFrame>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 py-6 sm:gap-6 sm:py-8">
        <div className="pixel-text-shadow">
          <p className="text-xl uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Immutable Records
          </p>
          <div className="mt-2 flex items-center gap-4">
            <Image
              src={ORACLE_ASSETS.ui.prophecyIcon}
              alt="Prophecy icon"
              width={56}
              height={56}
              className="pixelated h-12 w-12 shrink-0"
            />
            <h1 className="text-2xl uppercase text-[var(--pixel-text)] sm:text-3xl lg:text-4xl">
              The Archive
            </h1>
          </div>
          <p className="mt-3 max-w-3xl text-2xl text-[var(--pixel-muted)]">
            Every word the Oracle has spoken, preserved on Mantle with its fulfillment score.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatPanel
            label="Total Prophecies"
            value={totalCount !== undefined ? totalCount.toString() : "-"}
            detail="Words etched into the ledger"
          />
          <StatPanel
            label="Total Faith"
            value={
              totalFaith !== undefined
                ? `${Number(formatUnits(totalFaith, 6)).toFixed(2)} USDY`
                : "-"
            }
            detail="Current belief inside the Temple"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <PixelFrame key={i} className="pixel-panel h-44 animate-pulse" round={2}>
                <div className="h-full w-full bg-[rgba(240,217,160,0.05)]" />
              </PixelFrame>
            ))}
          </div>
        ) : prophecies.length === 0 ? (
          <PixelFrame className="pixel-panel px-6 py-8 text-center" round={2}>
            <p className="text-4xl uppercase text-[var(--pixel-border)]">No Prophecies Yet</p>
            <p className="mt-3 text-2xl text-[var(--pixel-muted)]">
              The Oracle has not spoken. Return after the next cycle.
            </p>
          </PixelFrame>
        ) : (
          <div className="grid gap-4">
            {prophecies.map((p) => (
              <ProphecyCard key={p.day} entry={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatPanel({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <PixelFrame className="pixel-panel-soft overflow-hidden px-4 py-4 sm:px-5 sm:py-5" round={2}>
      <PanelCorners />
      <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-2 text-5xl uppercase text-[var(--pixel-parchment)]">{value}</p>
      <p className="mt-2 text-xl text-[var(--pixel-muted)]">{detail}</p>
    </PixelFrame>
  );
}

function ProphecyCard({ entry }: { entry: ProphecyEntry }) {
  const date = fmtDate(entry.timestamp);
  const isToday = entry.day === Math.floor(Date.now() / 1000 / 86400);
  const theme = scoreTheme(entry.fulfillmentScore);

  return (
    <PixelFrame className={`${theme.panel} overflow-hidden px-4 py-4 sm:px-6 sm:py-5`} round={2}>
      <PanelCorners />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-lg uppercase tracking-[0.14em] text-[var(--pixel-muted)]">
            {isToday && (
              <span className="bg-[rgba(74,158,107,0.18)] px-2 py-1 text-[var(--pixel-parchment)]">
                Today
              </span>
            )}
            <span>{date}</span>
            <span className="text-[var(--pixel-border)]">Day {entry.day}</span>
          </div>
        </div>

        {entry.resolved ? (
          <div className={`flex items-center gap-2 px-3 py-2 text-lg uppercase tracking-[0.12em] ${theme.badge}`}>
            <Image
              src={ORACLE_ASSETS.ui.checkmark}
              alt=""
              width={20}
              height={20}
              className="pixelated h-5 w-5"
            />
            <span>{entry.fulfillmentScore}/100 - {scoreLabel(entry.fulfillmentScore)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[rgba(61,40,16,0.32)] px-3 py-2 text-lg uppercase tracking-[0.12em] text-[var(--pixel-muted)]">
            <Image
              src={ORACLE_ASSETS.ui.hourglass}
              alt=""
              width={20}
              height={20}
              className="pixelated h-5 w-5"
            />
            <span>Awaiting Resolution</span>
          </div>
        )}
      </div>

      <p className={`mt-5 text-3xl leading-relaxed sm:text-4xl ${theme.text}`}>
        &ldquo;{entry.text}&rdquo;
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `The Digital Oracle scored prophecy day ${entry.day} at ${entry.fulfillmentScore}/100 on Mantle.`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          Share Prophecy
        </a>
      </div>

      {entry.resolved && (
        <>
          <div className="mt-5">
            <div className="h-4 w-full bg-[rgba(10,7,5,0.85)] shadow-[4px_4px_0_var(--pixel-shadow)]">
              <div
                className={`h-full ${theme.bar}`}
                style={{ width: `${entry.fulfillmentScore}%` }}
              />
            </div>
          </div>
          <OracleProof reason={entry.resolutionReason} evidence={entry.evidence} />
        </>
      )}
    </PixelFrame>
  );
}

function OracleProof({ reason, evidence }: { reason: string; evidence: string }) {
  const metrics = evidence
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <PixelFrame className="pixel-panel-soft mt-5 px-4 py-4" round={1}>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
            Oracle Proof
          </p>
          <p className="mt-1 text-2xl leading-snug text-[var(--pixel-parchment)]">
            {reason || "No resolution reason was recorded for this prophecy."}
          </p>
        </div>

        {metrics.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {metrics.map((metric) => {
              const [label, ...valueParts] = metric.split("=");
              const value = valueParts.join("=") || "-";
              return (
                <div
                  key={metric}
                  className="bg-[rgba(10,7,5,0.42)] px-3 py-2 shadow-[3px_3px_0_var(--pixel-shadow)]"
                >
                  <p className="text-sm uppercase tracking-[0.12em] text-[var(--pixel-border)]">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-xl text-[var(--pixel-muted)]">{value}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PixelFrame>
  );
}
