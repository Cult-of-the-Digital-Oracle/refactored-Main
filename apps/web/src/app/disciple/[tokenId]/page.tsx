import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, formatUnits, http } from "viem";
import PixelFrame from "@/components/PixelFrame";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

const VAULT_ABI = [
  {
    name: "disciples",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "stakeAmount", type: "uint256" },
      { name: "joinedAt", type: "uint256" },
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
    const [stakeAmount, joinedAt, karma, active] = raw as [bigint, bigint, bigint, boolean];
    return { stakeAmount, joinedAt, karma, active };
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

  const staked = disciple
    ? Number(formatUnits(disciple.stakeAmount, 6)).toFixed(2)
    : "—";
  const karma = disciple?.karma.toString() ?? "—";
  const date = disciple
    ? new Date(Number(disciple.joinedAt) * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <main className="pixel-grid relative flex min-h-screen flex-col overflow-hidden px-4 py-8 sm:px-6">
      <Image
        src={ORACLE_ASSETS.backgrounds.templeInterior}
        alt=""
        fill
        priority
        className="pointer-events-none object-cover object-center opacity-20"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,158,107,0.18),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,10,6,0.2),rgba(13,10,6,0.84))]" />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6">
        <div className="pixel-text-shadow text-center">
          <p className="text-xl uppercase tracking-[0.22em] text-[var(--pixel-border)]">
            Mantle Disciple Identity
          </p>
          <h1 className="text-6xl uppercase leading-[0.9] text-[var(--pixel-text)] sm:text-7xl">
            Disciple #{tokenId}
          </h1>
        </div>

        <PixelFrame className="pixel-panel-emerald w-full px-6 py-6 sm:px-8" round={2}>
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-24 w-24 items-center justify-center bg-[var(--pixel-panel-alt)] text-6xl text-[var(--pixel-border)] shadow-[6px_6px_0_var(--pixel-shadow)]">
              <Image
                src={ORACLE_ASSETS.characters.discipleCardPortrait}
                alt="Disciple portrait"
                width={96}
                height={96}
                className="pixelated h-20 w-20"
              />
            </div>

            <div>
              <p className="text-lg uppercase tracking-[0.18em] text-[var(--pixel-border)]">
                Soulbound To The Chain
              </p>
              <h2 className="mt-2 text-5xl uppercase text-[var(--pixel-parchment)]">
                The Faithful One
              </h2>
              <p className="mt-2 text-2xl text-[rgba(240,217,160,0.84)]">
                Bound to the Temple ledger and counted among the believers.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3">
              <StatBox label="Staked" value={`${staked} USDY`} />
              <StatBox label="Karma" value={karma} />
              <StatBox label="Since" value={date} />
            </div>

            <PixelFrame className="pixel-panel-soft w-full px-4 py-4" round={1}>
              <p className="text-2xl text-[var(--pixel-muted)]">
                &ldquo;My soul is bound to the great ledger.&rdquo;
              </p>
            </PixelFrame>
          </div>
        </PixelFrame>

        <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row">
          <Link
            href="/temple"
            className="pixel-button pixel-button-emerald inline-flex min-h-14 flex-1 items-center justify-center px-6 py-3 text-2xl uppercase tracking-[0.12em]"
          >
            Enter The Temple
          </Link>
          <Link
            href="/prophecies"
            className="pixel-button pixel-button-dark inline-flex min-h-14 flex-1 items-center justify-center px-6 py-3 text-2xl uppercase tracking-[0.12em]"
          >
            View Prophecies
          </Link>
        </div>

        <p className="text-xl uppercase tracking-[0.16em] text-[var(--pixel-muted)]">
          Cult Of The Digital Oracle · Mantle
        </p>
      </div>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <PixelFrame className="pixel-panel-soft px-4 py-4" round={1}>
      <p className="text-lg uppercase tracking-[0.16em] text-[var(--pixel-border)]">{label}</p>
      <p className="mt-2 text-3xl uppercase text-[var(--pixel-parchment)]">{value}</p>
    </PixelFrame>
  );
}
