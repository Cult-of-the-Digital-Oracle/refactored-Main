import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <header className="absolute top-0 right-0 p-6">
        <ConnectButton />
      </header>

      <div className="max-w-2xl w-full flex flex-col items-center text-center gap-8">
        <span className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-400">
          The Turing Test Hackathon 2026 · Consumer & Viral DApps
        </span>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-emerald-300 bg-clip-text text-transparent">
          Trading Card Battle
        </h1>

        <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
          Your on-chain history forged into a unique trading card. AI reads
          your wallet, mints an ERC-8004 identity, and pits you against other
          traders on Mantle. Stake. Battle. Climb.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <a
            href="#mint"
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 transition"
          >
            Mint your card
          </a>
          <a
            href="#leaderboard"
            className="rounded-full border border-zinc-700 hover:border-zinc-500 px-6 py-3 transition"
          >
            View leaderboard
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full text-left">
          <Feature title="AI scoring" body="GPT reads wallet activity to derive ATK / DEF / Vibe stats." />
          <Feature title="ERC-8004 identity" body="Each card is a permanent on-chain reputation NFT." />
          <Feature title="PvP wagering" body="Stake MNT, battle peers, winner takes the pot." />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-emerald-300 mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 leading-snug">{body}</p>
    </div>
  );
}
