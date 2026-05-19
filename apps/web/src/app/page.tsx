import Image from "next/image";
import { ConnectButton } from "@/components/ConnectButton";
import { TodaysProphecy } from "@/components/TodaysProphecy";
import { AmbientRunes } from "@/components/AmbientRunes";
import { OracleButton } from "@/components/OracleButton";
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

      {/* Hero — above fold */}
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 py-8 text-center">

        {/* Tagline */}
        <div className="pixel-text-shadow space-y-2">
          <p className="text-xl uppercase tracking-[0.2em] text-[var(--pixel-border)]">
            Every Day. On-Chain. Immutable.
          </p>
          <h2 className="text-2xl uppercase text-[var(--pixel-text)] sm:text-3xl lg:text-4xl">
            An AI Oracle Watches The Chain.
            <br />
            Stake To Become A Believer.
          </h2>
        </div>

        {/* Prophecy — the centerpiece */}
        <div className="w-full">
          <TodaysProphecy />
        </div>

        {/* Single primary CTA */}
        <div className="flex flex-col items-center gap-3">
          <OracleButton href="/temple">Enter The Temple</OracleButton>
          <p className="text-xl text-[var(--pixel-muted)]">
            Stake USDY → get a Disciple NFT → earn yield when prophecy fulfills
          </p>
        </div>
      </section>

      {/* Below fold — how it works */}
      <section className="relative z-10 mx-auto w-full max-w-4xl pb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Step marker="01" title="Stake" body="Deposit USDY, mint soulbound Disciple NFT" />
          <Step marker="02" title="Oracle Speaks" body="AI reads chain data, posts prophecy on-chain" />
          <Step marker="03" title="Truth Is Judged" body="AI scores itself. Score ≥70 triggers yield" />
          <Step marker="04" title="Earn & Rank" body="Claim USDY yield, climb the leaderboard" />
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <a href="/prophecies" className="pixel-button pixel-button-dark inline-flex min-h-10 items-center px-4 py-2 text-lg uppercase tracking-[0.1em]">
            Prophecy Archive
          </a>
          <a href="/leaderboard" className="pixel-button pixel-button-dark inline-flex min-h-10 items-center px-4 py-2 text-lg uppercase tracking-[0.1em]">
            Leaderboard
          </a>
        </div>
      </section>
    </main>
  );
}

function Step({ marker, title, body }: { marker: string; title: string; body: string }) {
  return (
    <PixelFrame className="pixel-panel overflow-hidden px-3 py-3" round={2}>
      <PanelCorners />
      <p className="text-sm text-[var(--pixel-border)]">{marker}</p>
      <h3 className="mt-1 text-xs uppercase text-[var(--pixel-parchment)]">{title}</h3>
      <p className="mt-1 text-lg leading-snug text-[var(--pixel-muted)]">{body}</p>
    </PixelFrame>
  );
}
