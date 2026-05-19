import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, formatUnits, http } from "viem";
import PixelFrame from "@/components/PixelFrame";
import { PanelCorners } from "@/components/PanelCorners";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";
import { generateDiscipleName, generateDiscipleQuote } from "@/lib/discipleName";

const VAULT_ABI = [
  {
    name: "disciples",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "disciple", type: "address" },
      { name: "stakeAmount", type: "uint256" },
      { name: "joinedAt", type: "uint256" },
      { name: "exitedAt", type: "uint256" },
      { name: "karma", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

async function fetchDisciple(tokenId: string) {
  try {
    const client = createPublicClient({
      transport: http("https://rpc.sepolia.mantle.xyz"),
    });
    const raw = await client.readContract({
      address: process.env.NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: "disciples",
      args: [BigInt(tokenId)],
    });
    const [wallet, stakeAmount, joinedAt, , karma, active] = raw as [
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      boolean,
    ];
    return { wallet, stakeAmount, joinedAt, karma, active };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  const ogUrl = `/api/og/disciple/${tokenId}`;

  return {
    title: `Disciple #${tokenId} · Cult of the Digital Oracle`,
    description:
      "I joined the Cult of the Digital Oracle on Mantle. My soul is bound to the chain.",
    openGraph: {
      title: `Disciple #${tokenId} · Cult of the Digital Oracle`,
      description: "Soulbound to the chain. The Oracle speaks my name.",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Disciple #${tokenId} · Cult of the Digital Oracle`,
      description: "Soulbound to the chain. The Oracle speaks my name.",
      images: [ogUrl],
    },
  };
}

export default async function DisciplePage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const disciple = await fetchDisciple(tokenId);

  const name = disciple ? generateDiscipleName(disciple.wallet) : "The Faithful One";
  const quote = disciple ? generateDiscipleQuote(disciple.wallet) : "The chain awaits your presence.";
  const staked = disciple ? Number(formatUnits(disciple.stakeAmount, 6)).toFixed(2) : "—";
  const karma = disciple?.karma.toString() ?? "—";
  const date = disciple
    ? new Date(Number(disciple.joinedAt) * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const idPadded = tokenId.padStart(3, "0");
  const tweetText = encodeURIComponent(
    `The Oracle named me "${name}" — Disciple #${tokenId} in the Cult of the Digital Oracle on Mantle.\n\nhttps://web-red-nine-58.vercel.app/disciple/${tokenId}`
  );

  return (
    <main className="pixel-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeInterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-22"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74,158,107,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.55),rgba(13,10,6,0.25)_40%,rgba(13,10,6,0.75))]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 text-center">

        {/* Branding */}
        <div className="flex items-center gap-2">
          <Image
            src={ORACLE_ASSETS.decoratives.oracleEyeLogo}
            alt=""
            width={20}
            height={20}
            className="pixelated opacity-70"
          />
          <p className="text-sm uppercase tracking-[0.28em] text-[var(--pixel-muted)]">
            Cult Of The Digital Oracle
          </p>
        </div>

        {/* Token number */}
        <p className="text-8xl uppercase text-[var(--pixel-border)] drop-shadow-[0_0_24px_rgba(200,168,75,0.45)]">
          #{idPadded}
        </p>

        {/* Portrait with glow ring */}
        <div className="relative">
          <div className="absolute inset-0 scale-110 rounded-full bg-[var(--pixel-emerald)] opacity-15 blur-2xl" />
          <PixelFrame className="pixel-panel-emerald p-3" round={2}>
            <PanelCorners />
            <Image
              src={ORACLE_ASSETS.characters.discipleCardPortrait}
              alt="Disciple portrait"
              width={160}
              height={160}
              className="pixelated h-40 w-40"
            />
          </PixelFrame>
          {disciple?.active && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--pixel-emerald)] px-3 py-1 text-lg uppercase tracking-[0.18em] text-[#0d1f14] shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
              Active Disciple
            </div>
          )}
        </div>

        {/* Name */}
        <div className="mt-2">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Soulbound Identity
          </p>
          <p className="mt-1 text-4xl uppercase leading-tight text-[var(--pixel-parchment)] drop-shadow-[0_0_12px_rgba(240,217,160,0.25)]">
            {name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid w-full grid-cols-3 gap-2">
          <StatBox label="Staked" value={`${staked} USDY`} />
          <StatBox label="Karma" value={karma} />
          <StatBox label="Since" value={date} />
        </div>

        {/* Unique quote */}
        <PixelFrame className="pixel-panel-soft w-full px-4 py-4" round={1}>
          <p className="text-xl leading-snug text-[var(--pixel-muted)]">
            &ldquo;{quote}&rdquo;
          </p>
        </PixelFrame>

        {/* Share buttons */}
        <div className="flex w-full gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noreferrer"
            className="pixel-button pixel-button-emerald inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Share To X
          </a>
          <Link
            href="/temple"
            className="pixel-button pixel-button-dark inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-5 py-2 text-xl uppercase tracking-[0.12em]"
          >
            Enter Temple
          </Link>
        </div>

        {/* Footer links */}
        <div className="flex gap-4 text-lg uppercase tracking-[0.14em] text-[var(--pixel-muted)]">
          <Link href="/prophecies" className="hover:text-[var(--pixel-border)]">Prophecies</Link>
          <span className="text-[var(--pixel-shadow)]">·</span>
          <Link href="/leaderboard" className="hover:text-[var(--pixel-border)]">Leaderboard</Link>
        </div>

        <p className="text-sm uppercase tracking-[0.16em] text-[rgba(200,178,127,0.4)]">
          Mantle Sepolia · Soulbound NFT · Non-Transferable
        </p>
      </div>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <PixelFrame className="pixel-panel-soft px-3 py-3" round={1}>
      <PanelCorners />
      <p className="text-sm uppercase tracking-[0.14em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-1 text-xl uppercase text-[var(--pixel-parchment)] break-words">{value}</p>
    </PixelFrame>
  );
}
