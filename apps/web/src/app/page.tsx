import Image from "next/image";
import { ConnectButton } from "@/components/ConnectButton";
import { TodaysProphecy } from "@/components/TodaysProphecy";
import { AmbientRunes } from "@/components/AmbientRunes";
import { OracleButton } from "@/components/OracleButton";
import { ProphecyCountdown } from "@/components/ProphecyCountdown";
import { PanelCorners } from "@/components/PanelCorners";
import PixelFrame from "@/components/PixelFrame";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

export default function Home() {
  return (
    <main className="pixel-grid relative flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeExterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-28"
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.18),rgba(13,10,6,0.85))]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(74,158,107,0.22),transparent_65%)]" />
        <div className="absolute left-6 top-10 h-3 w-3 bg-[var(--pixel-border)] shadow-[28px_16px_0_0_rgba(200,168,75,0.8),140px_8px_0_0_rgba(240,217,160,0.9),260px_34px_0_0_rgba(200,168,75,0.7)]" />
        <div className="absolute right-10 top-16 h-2 w-2 bg-[var(--pixel-parchment)] shadow-[-42px_18px_0_0_rgba(240,217,160,0.85),-170px_40px_0_0_rgba(200,168,75,0.75)]" />
      </div>
      <AmbientRunes />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3 pixel-text-shadow">
          <Image
            src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
            alt="Oracle Eye"
            width={40}
            height={40}
            className="pixelated drop-shadow-[0_0_8px_rgba(200,168,75,0.7)]"
          />
          <h1 className="text-sm uppercase tracking-[0.08em] text-[var(--pixel-text)] sm:text-base">
            Cult Of The Digital Oracle
          </h1>
        </div>
        <PixelFrame className="pixel-panel-soft px-3 py-2" round={1}>
          <ConnectButton />
        </PixelFrame>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 py-8 text-center">

        {/* Oracle eye — visual anchor */}
        <Image
          src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
          alt=""
          width={64}
          height={64}
          className="pixelated drop-shadow-[0_0_20px_rgba(200,168,75,0.55)] opacity-90"
        />

        {/* Eyebrow */}
        <p className="text-sm uppercase tracking-[0.28em] text-[var(--pixel-muted)]">
          The Oracle Speaks Daily · On-Chain · Immutable
        </p>

        {/* Prophecy — the centerpiece */}
        <div className="w-full">
          <TodaysProphecy />
        </div>

        {/* Countdown */}
        <ProphecyCountdown />

        {/* CTA */}
        <div className="flex flex-col items-center gap-2">
          <OracleButton href="/temple">Enter The Temple</OracleButton>
          <p className="text-lg text-[var(--pixel-muted)]">
            Stake USDY · Mint Disciple NFT · Earn Yield
          </p>
        </div>
      </section>

      {/* Below fold — how it works */}
      <section className="relative z-10 mx-auto w-full max-w-3xl pb-8">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Step marker="01" title="Stake" body="Deposit USDY, mint soulbound Disciple NFT" />
          <Step marker="02" title="Oracle Speaks" body="AI reads chain data, posts prophecy on-chain" />
          <Step marker="03" title="Truth Is Judged" body="AI scores itself. Score ≥70 triggers yield" />
          <Step marker="04" title="Earn & Rank" body="Claim USDY yield, climb the leaderboard" />
        </div>

        <div className="mt-3 flex justify-center gap-3">
          <a href="/prophecies" className="pixel-button pixel-button-dark inline-flex min-h-9 items-center px-4 py-2 text-lg uppercase tracking-[0.1em]">
            Prophecy Archive
          </a>
          <a href="/leaderboard" className="pixel-button pixel-button-dark inline-flex min-h-9 items-center px-4 py-2 text-lg uppercase tracking-[0.1em]">
            Leaderboard
          </a>
        </div>
      </section>
    </main>
  );
}

function Step({ marker, title, body }: { marker: string; title: string; body: string }) {
  return (
    <PixelFrame className="pixel-panel overflow-hidden px-5 py-4" round={2}>
      <PanelCorners />
      <p className="text-sm text-[var(--pixel-border)]">{marker}</p>
      <p className="mt-1 text-2xl uppercase text-[var(--pixel-parchment)]">{title}</p>
      <p className="mt-1 text-lg leading-snug text-[var(--pixel-muted)]">{body}</p>
    </PixelFrame>
  );
}
