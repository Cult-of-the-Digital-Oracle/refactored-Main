"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { AmbientRunes } from "@/components/AmbientRunes";
import { PanelCorners } from "@/components/PanelCorners";
import PixelFrame from "@/components/PixelFrame";
import { CONTRACTS, TEMPLE_VAULT_ABI } from "@/lib/contracts";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";
import { generateDiscipleName } from "@/lib/discipleName";

// v3 struct: [address, uint88 stakeAmount, bool active, uint128 karma, uint64 joinedAt, uint64 exitedAt]
type DiscipleTuple = readonly [`0x${string}`, bigint, boolean, bigint, bigint, bigint];

type RankedDisciple = {
  tokenId: bigint;
  wallet: `0x${string}`;
  stakeAmount: bigint;
  active: boolean;
  karma: bigint;
  joinedAt: bigint;
  exitedAt: bigint;
  rankScore: number;
};

function fmtUsd(val: bigint | undefined): string {
  if (val === undefined) return "-";
  return Number(formatUnits(val, 6)).toFixed(2);
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function fmtDate(ts: bigint): string {
  if (ts === 0n) return "-";
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreDisciple(d: RankedDisciple): number {
  const stakeScore = Number(formatUnits(d.stakeAmount, 6));
  const karmaScore = Number(d.karma) * 10;
  const activeBonus = d.active ? 1_000_000 : 0;
  const ageBonus = d.joinedAt > 0n ? Math.max(0, 100_000 - Number(d.joinedAt / 86_400n)) : 0;
  return activeBonus + stakeScore + karmaScore + ageBonus;
}

export default function LeaderboardPage() {
  const { data: nextId } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "nextId",
  });

  const { data: totalFaith } = useReadContract({
    address: CONTRACTS.templeVault,
    abi: TEMPLE_VAULT_ABI,
    functionName: "totalFaith",
  });

  const tokenIds = useMemo(() => {
    const lastId = Number((nextId ?? 1n) - 1n);
    return Array.from({ length: Math.max(0, lastId) }, (_, i) => BigInt(i + 1));
  }, [nextId]);

  const { data: discipleResults, isLoading } = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      address: CONTRACTS.templeVault,
      abi: TEMPLE_VAULT_ABI,
      functionName: "disciples" as const,
      args: [tokenId] as const,
    })),
    query: { enabled: tokenIds.length > 0 },
  });

  const disciples = useMemo(() => {
    return (discipleResults ?? [])
      .map((result, index) => {
        if (result.status !== "success" || !result.result) return null;
        const raw = result.result as unknown as DiscipleTuple;
        const item: RankedDisciple = {
          tokenId: tokenIds[index],
          wallet:      raw[0],
          stakeAmount: raw[1],
          active:      raw[2],
          karma:       raw[3],
          joinedAt:    raw[4],
          exitedAt:    raw[5],
          rankScore: 0,
        };
        item.rankScore = scoreDisciple(item);
        return item.wallet === "0x0000000000000000000000000000000000000000" ? null : item;
      })
      .filter((item): item is RankedDisciple => item !== null)
      .sort((a, b) => b.rankScore - a.rankScore);
  }, [discipleResults, tokenIds]);

  const activeCount = disciples.filter((d) => d.active).length;

  return (
    <main className="pixel-grid relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeInterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-20"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,158,107,0.18),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.2),rgba(13,10,6,0.88))]" />
      <AmbientRunes />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
        >
          Back To Oracle
        </Link>
        <PixelFrame className="pixel-panel-soft px-3 py-2" round={1}>
          <ConnectButton />
        </PixelFrame>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 py-6 sm:gap-6 sm:py-8">
        <div className="pixel-text-shadow">
          <p className="text-xl uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Public Faith Index
          </p>
          <div className="mt-2 flex items-center gap-4">
            <Image
              src={ORACLE_ASSETS.ui.starKarmaIcon}
              alt="Karma star"
              width={56}
              height={56}
              className="pixelated h-12 w-12 shrink-0"
            />
            <h1 className="text-2xl uppercase text-[var(--pixel-text)] sm:text-3xl lg:text-4xl">
              Leaderboard
            </h1>
          </div>
          <p className="mt-3 max-w-3xl text-2xl text-[var(--pixel-muted)]">
            Disciples ranked by active faith, check-ins, public shares, and earliest commitment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatPanel label="Disciples" value={disciples.length.toString()} detail="Cards minted" />
          <StatPanel label="Active" value={activeCount.toString()} detail="Still bound to the Temple" />
          <StatPanel
            label="Total Faith"
            value={`${fmtUsd(totalFaith)} USDY`}
            detail="Current active stake"
          />
        </div>

        <PixelFrame className="pixel-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5" round={2}>
          <PanelCorners />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                Ranking Rule
              </p>
              <p className="text-2xl text-[var(--pixel-muted)]">
                Active stake dominates; check-ins and recorded shares add karma, and older Disciples hold priority.
              </p>
            </div>
            <Link
              href="/temple"
              className="pixel-button pixel-button-emerald inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
            >
              Join The Temple
            </Link>
          </div>
        </PixelFrame>

        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(4)].map((_, i) => (
              <PixelFrame key={i} className="pixel-panel h-28 animate-pulse" round={2}>
                <div className="h-full w-full bg-[rgba(240,217,160,0.05)]" />
              </PixelFrame>
            ))}
          </div>
        ) : disciples.length === 0 ? (
          <PixelFrame className="pixel-panel px-6 py-8 text-center" round={2}>
            <p className="text-4xl uppercase text-[var(--pixel-border)]">No Disciples Yet</p>
            <p className="mt-3 text-2xl text-[var(--pixel-muted)]">
              The first wallet to enter the Temple will claim the top rank.
            </p>
          </PixelFrame>
        ) : (
          <div className="grid gap-4">
            {disciples.map((disciple, index) => (
              <LeaderboardRow key={disciple.tokenId.toString()} disciple={disciple} rank={index + 1} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <PixelFrame className="pixel-panel-soft overflow-hidden px-4 py-4 sm:px-5 sm:py-5" round={2}>
      <PanelCorners />
      <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-2 text-5xl uppercase text-[var(--pixel-parchment)]">{value}</p>
      <p className="mt-2 text-xl text-[var(--pixel-muted)]">{detail}</p>
    </PixelFrame>
  );
}

function LeaderboardRow({ disciple, rank }: { disciple: RankedDisciple; rank: number }) {
  return (
    <PixelFrame
      className={`${rank <= 3 ? "pixel-panel-emerald" : "pixel-panel"} overflow-hidden px-4 py-4 sm:px-5`}
      round={2}
    >
      <PanelCorners />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-[var(--pixel-panel-alt)] text-4xl text-[var(--pixel-border)] shadow-[4px_4px_0_var(--pixel-shadow)]">
            #{rank}
          </div>
          <Image
            src={ORACLE_ASSETS.characters.discipleCardPortrait}
            alt=""
            width={64}
            height={64}
            className="pixelated h-16 w-16"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-2xl uppercase text-[var(--pixel-parchment)]">
                {generateDiscipleName(disciple.wallet)}
              </p>
              <p className="text-lg text-[var(--pixel-border)]">
                Disciple #{disciple.tokenId.toString()}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-lg uppercase tracking-[0.12em] ${
                disciple.active
                  ? "bg-[rgba(74,158,107,0.18)] text-[var(--pixel-parchment)]"
                  : "bg-[rgba(61,40,16,0.5)] text-[var(--pixel-muted)]"
              }`}
            >
              {disciple.active ? "Active" : "Exited"}
            </span>
          </div>
          <p className="mt-1 text-xl text-[var(--pixel-muted)]">
            {shortAddress(disciple.wallet)} joined {fmtDate(disciple.joinedAt)}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniStat label="Stake" value={`${fmtUsd(disciple.stakeAmount)} USDY`} />
            <MiniStat label="Karma" value={disciple.karma.toString()} />
            <MiniStat label="Score" value={Math.round(disciple.rankScore).toString()} />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href={`/disciple/${disciple.tokenId.toString()}`}
            className="pixel-button pixel-button-emerald inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            View Card
          </Link>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `I found Disciple #${disciple.tokenId.toString()} in the Cult of the Digital Oracle on Mantle.`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="pixel-button pixel-button-dark inline-flex min-h-12 items-center justify-center px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Share
          </a>
        </div>
      </div>
    </PixelFrame>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[rgba(10,7,5,0.42)] px-3 py-2 shadow-[3px_3px_0_var(--pixel-shadow)]">
      <p className="text-sm uppercase tracking-[0.12em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-1 break-words text-xl text-[var(--pixel-muted)]">{value}</p>
    </div>
  );
}
