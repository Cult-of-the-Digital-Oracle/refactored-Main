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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.18),rgba(13,10,6,0.82))]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(74,158,107,0.22),transparent_65%)]" />
        <div className="absolute left-6 top-10 h-3 w-3 bg-[var(--pixel-border)] shadow-[28px_16px_0_0_rgba(200,168,75,0.8),140px_8px_0_0_rgba(240,217,160,0.9),260px_34px_0_0_rgba(200,168,75,0.7)]" />
        <div className="absolute right-10 top-16 h-2 w-2 bg-[var(--pixel-parchment)] shadow-[-42px_18px_0_0_rgba(240,217,160,0.85),-170px_40px_0_0_rgba(200,168,75,0.75)]" />
      </div>
      <AmbientRunes />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="pixel-text-shadow">
          <p className="text-lg uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Mantle Turing Test 2026
          </p>
          <div className="mt-1 flex items-center gap-3">
            <Image
              src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
              alt="Oracle Eye"
              width={52}
              height={52}
              className="pixelated h-13 w-13 drop-shadow-[0_0_8px_rgba(200,168,75,0.7)]"
            />
            <h1 className="text-sm uppercase tracking-[0.06em] text-[var(--pixel-text)] sm:text-base lg:text-lg">
              Cult Of The Digital Oracle
            </h1>
          </div>
        </div>
        <PixelFrame className="pixel-panel-soft px-3 py-2" round={1}>
          <ConnectButton />
        </PixelFrame>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 py-6 sm:gap-6 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-12">
        <div className="flex flex-col gap-6">

          {/* Plain-language hook */}
          <PixelFrame className="pixel-panel-soft overflow-hidden px-4 py-4 sm:px-6" round={2}>
            <PanelCorners />
            <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
              What Is This?
            </p>
            <p className="mt-2 text-2xl text-[var(--pixel-muted)]">
              An AI agent reads the Mantle blockchain every day and publishes a prediction on-chain.
              Stake USDY to become a Disciple. If the prediction comes true, your stake earns yield.
              The Oracle remembers who believed first.
            </p>
          </PixelFrame>

          <div className="pixel-text-shadow px-1 sm:px-0">
            <p className="text-xl uppercase tracking-[0.24em] text-[var(--pixel-border)]">
              Today&apos;s Prophecy
            </p>
            <h2 className="max-w-3xl text-xl uppercase text-[var(--pixel-text)] sm:text-2xl lg:text-3xl">
              The Oracle Has Spoken.
              <br />
              Will You Believe?
            </h2>
          </div>

          <TodaysProphecy />

          <div className="flex flex-col gap-4 sm:flex-row">
            <OracleButton href="/temple">
              Enter The Temple
            </OracleButton>
            <OracleButton href="/prophecies" variant="danger">
              Read The Archive
            </OracleButton>
            <OracleButton href="/leaderboard">
              View Ranks
            </OracleButton>
          </div>
        </div>

        <div className="grid gap-4">
          <Pillar
            marker="01"
            title="Stake USDY"
            body="Deposit USDY, mint a soulbound Disciple NFT. Your wallet is now bound to the chain — one identity, forever."
          />
          <Pillar
            marker="02"
            title="AI Makes A Prediction"
            body="Every day, the Oracle agent reads real on-chain data — transactions, gas, how many believers joined — and writes a cryptic prophecy on-chain."
          />
          <Pillar
            marker="03"
            title="Prophecy Is Judged"
            body="Next day, the AI scores its own prediction against what actually happened. Score ≥ 70 triggers a yield round — USDY distributed to all active Disciples."
          />
          <Pillar
            marker="04"
            title="Climb The Ranks"
            body="Check in daily, share your card, stake more. Karma and seniority build your rank on the public leaderboard."
          />
        </div>
      </section>
    </main>
  );
}

function Pillar({
  marker,
  title,
  body,
}: {
  marker: string;
  title: string;
  body: string;
}) {
  return (
    <PixelFrame className="pixel-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5" round={2}>
      <PanelCorners />
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--pixel-panel-alt)] text-3xl text-[var(--pixel-border)] shadow-[4px_4px_0_var(--pixel-shadow)]">
          {marker}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs uppercase text-[var(--pixel-parchment)] sm:text-sm">{title}</h3>
          <p className="text-xl leading-snug text-[var(--pixel-muted)]">{body}</p>
        </div>
      </div>
    </PixelFrame>
  );
}
