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
      { name: "stakeAmount", type: "uint88" },
      { name: "active", type: "bool" },
      { name: "karma", type: "uint128" },
      { name: "joinedAt", type: "uint64" },
      { name: "exitedAt", type: "uint64" },
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
    const [wallet, stakeAmount, active, karma, joinedAt] = raw as unknown as [
      `0x${string}`,
      bigint,
      boolean,
      bigint,
      bigint,
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
    description: "I joined the Cult of the Digital Oracle on Mantle. My soul is bound to the chain.",
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
        year: "numeric",
      })
    : "—";
  const idPadded = tokenId.padStart(3, "0");
  const tweetText = encodeURIComponent(
    `The Oracle named me "${name}" — Disciple #${tokenId} in the Cult of the Digital Oracle on Mantle.\nhttps://web-red-nine-58.vercel.app/disciple/${tokenId}`
  );

  return (
    <main className="pixel-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeInterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-22"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74,158,107,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.5),rgba(13,10,6,0.2)_50%,rgba(13,10,6,0.7))]" />

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-4 text-center">

        {/* Tiny branding */}
        <p className="text-sm uppercase tracking-[0.26em] text-[var(--pixel-muted)]">
          Cult Of The Digital Oracle
        </p>

        {/* Portrait + token # side by side */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 scale-110 bg-[var(--pixel-emerald)] opacity-10 blur-xl" />
            <PixelFrame className="pixel-panel-emerald p-2" round={2}>
              <PanelCorners />
              <Image
                src={ORACLE_ASSETS.characters.discipleCardPortrait}
                alt="Disciple portrait"
                width={100}
                height={100}
                className="pixelated h-24 w-24"
              />
            </PixelFrame>
          </div>
          <div className="text-left">
            <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">Disciple</p>
            <p className="text-6xl leading-none text-[var(--pixel-border)] drop-shadow-[0_0_16px_rgba(200,168,75,0.5)]">
              #{idPadded}
            </p>
            {disciple?.active && (
              <p className="mt-1 text-xl uppercase text-[var(--pixel-emerald)]">● Active</p>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--pixel-border)]">Soulbound Identity</p>
          <p className="mt-1 text-3xl uppercase leading-tight text-[var(--pixel-parchment)]">
            {name}
          </p>
        </div>

        {/* Unique quote */}
        <p className="text-xl leading-snug text-[var(--pixel-muted)]">
          &ldquo;{quote}&rdquo;
        </p>

        {/* Stats — single line */}
        <p className="text-xl text-[var(--pixel-muted)]">
          <span className="text-[var(--pixel-parchment)]">{staked} USDY</span>
          <span className="mx-2 text-[var(--pixel-border)]">·</span>
          <span className="text-[var(--pixel-parchment)]">{karma} karma</span>
          <span className="mx-2 text-[var(--pixel-border)]">·</span>
          <span>{date}</span>
        </p>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noreferrer"
            className="pixel-button pixel-button-emerald inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap px-4 py-2 text-xl uppercase tracking-[0.1em]"
          >
            Share To X
          </a>
          <Link
            href="/temple"
            className="pixel-button pixel-button-dark inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap px-4 py-2 text-xl uppercase tracking-[0.1em]"
          >
            Enter Temple
          </Link>
        </div>

        <p className="text-sm uppercase tracking-[0.14em] text-[rgba(200,178,127,0.35)]">
          Mantle Sepolia · Soulbound NFT
        </p>
      </div>
    </main>
  );
}
