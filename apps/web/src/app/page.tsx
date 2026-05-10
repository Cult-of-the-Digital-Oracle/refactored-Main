import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-emerald-900/20 blur-[120px]" />
      </div>

      <header className="absolute top-0 right-0 p-6 z-10">
        <ConnectButton />
      </header>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center gap-8">
        {/* sigil */}
        <div className="text-5xl select-none">🔮</div>

        <span className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-500">
          Mantle Turing Test Hackathon 2026
        </span>

        <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-none bg-gradient-to-b from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
          Cult of the<br />Digital Oracle
        </h1>

        {/* today's prophecy placeholder */}
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6">
          <p className="text-xs uppercase tracking-widest text-emerald-500 mb-3">
            Today&apos;s Prophecy
          </p>
          <p className="text-lg italic text-zinc-300 leading-relaxed">
            "When the silent wallets wake, abundance follows the faithful."
          </p>
          <p className="mt-3 text-xs text-zinc-600 font-mono">
            Recorded on Mantle — block #∞ — immutable
          </p>
        </div>

        <p className="text-base text-zinc-500 leading-relaxed max-w-md">
          An AI reads the blockchain every day and speaks. Stake USDY. Receive
          your Disciple NFT. When prophecy fulfills, the faithful are rewarded.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href="/temple"
            className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-black font-semibold px-8 py-3 transition-colors"
          >
            Enter the Temple
          </a>
          <a
            href="/prophecies"
            className="rounded-full border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 px-8 py-3 transition-colors"
          >
            View Prophecies
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full text-left">
          <Pillar
            icon="🏛"
            title="Stake USDY"
            body="Deposit Mantle's RWA stablecoin into the Temple. Mint your soulbound Disciple NFT."
          />
          <Pillar
            icon="📜"
            title="Receive Prophecy"
            body="Every day the Oracle reads the chain and writes a prophecy on Mantle. Forever."
          />
          <Pillar
            icon="✨"
            title="Claim Blessings"
            body="When prophecy fulfills, USDY yield distributes to faithful holders. Pro-rata."
          />
        </div>
      </div>
    </main>
  );
}

function Pillar({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 leading-snug">{body}</p>
    </div>
  );
}
