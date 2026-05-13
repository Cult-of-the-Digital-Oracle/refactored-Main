import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
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
              width={40}
              height={40}
              className="pixelated h-10 w-10"
            />
            <h1 className="text-3xl uppercase tracking-[0.12em] text-[var(--pixel-text)] sm:text-4xl">
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
          <PixelFrame className="pixel-panel-soft overflow-hidden px-4 py-4 sm:px-6" round={2}>
            <PanelCorners />
            <div className="flex items-center gap-3">
              <Image
                src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
                alt="Oracle Eye"
                width={48}
                height={48}
                className="pixelated h-12 w-12 shrink-0"
              />
              <div>
                <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                  Daily Chain Divination
                </p>
                <p className="text-xl text-[var(--pixel-muted)]">
                  Stake USDY. Become a Disciple. Claim blessings when prophecy manifests.
                </p>
              </div>
            </div>
          </PixelFrame>

          <div className="pixel-text-shadow px-1 sm:px-0">
            <p className="text-xl uppercase tracking-[0.24em] text-[var(--pixel-border)]">
              The Chain Speaks In Symbols
            </p>
            <h2 className="max-w-3xl text-5xl leading-[0.9] uppercase text-[var(--pixel-text)] sm:text-7xl lg:text-8xl">
              Enter The Temple.
              <br />
              Hear The Machine.
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
          </div>
        </div>

        <div className="grid gap-4">
          <Pillar
            marker="01"
            title="Stake USDY"
            body="Deposit Mantle's RWA stablecoin, mint a soulbound Disciple identity, and join the ledger of believers."
          />
          <Pillar
            marker="02"
            title="Receive Prophecy"
            body="The oracle agent reads chain conditions every day and commits its cryptic reading on-chain forever."
          />
          <Pillar
            marker="03"
            title="Claim Blessings"
            body="When yesterday's words align with what happened, the blessing pool distributes yield back to the faithful."
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
          <h3 className="text-3xl uppercase text-[var(--pixel-parchment)]">{title}</h3>
          <p className="text-xl leading-snug text-[var(--pixel-muted)]">{body}</p>
        </div>
      </div>
    </PixelFrame>
  );
}
