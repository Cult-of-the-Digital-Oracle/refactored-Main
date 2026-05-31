# Frontend Overview

> `apps/web/` · Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · wagmi v2 · ConnectKit

The frontend is the face of the cult: a dark, mystical, pixel-art interface that reads everything the [agents](../ai-agents/README.md) write to the chain and lets users become Disciples. It is **read-mostly** — almost every screen is on-chain data rendered through wagmi — with writes reserved for user actions (faucet, approve, stake, check-in, claim).

***

## Run it

```bash
cd apps/web
npm install
npm run dev        # dev server on :3000 (Turbopack)
npx next build     # production build + type check
```

{% hint style="danger" %}
**Next.js 16 is not the Next.js in your training data.** It has breaking changes to APIs, conventions, and file structure. The repo's `apps/web/AGENTS.md` instructs reading `node_modules/next/dist/docs/` before writing any frontend code, and heeding deprecation notices. The `tsconfig.json` must stay at `"target": "ES2020"` — BigInt literals in contract calls require it.
{% endhint %}

***

## Environment

`apps/web/.env.local` (copy from `.env.example`):

```env
NEXT_PUBLIC_WC_PROJECT_ID=                    # WalletConnect project id (ConnectKit)
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=
NEXT_PUBLIC_USDY_ADDRESS=
NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS=         # required for /oracle-world on-chain bridge
```

All five contract addresses must match the deployment the [agent](../deployment/agent.md) is writing to. See [Deployment & Addresses](../contracts/deployment.md).

***

## Structure

```text
apps/web/src/
├── app/
│   ├── page.tsx                 # landing — live prophecy
│   ├── temple/page.tsx          # faucet → approve → enter → claim
│   ├── prophecies/page.tsx      # archive of all prophecies
│   ├── prophecies/[day]/page.tsx# single prophecy detail
│   ├── leaderboard/page.tsx     # disciples ranked
│   ├── disciple/[tokenId]/page.tsx        # shareable identity card
│   ├── oracle-world/page.tsx    # the live God Simulator
│   ├── api/og/disciple/[tokenId]/route.tsx# dynamic OG image (edge)
│   ├── api/eth-rpc/route.ts     # mainnet RPC proxy
│   ├── providers.tsx            # Wagmi + QueryClient + ConnectKit
│   └── layout.tsx, globals.css
├── components/                  # ProphecyCard, DiscipleCard, OracleWorld/*, pixel chrome
└── lib/
    ├── contracts.ts             # all ABIs + addresses (single source)
    ├── wagmi.ts                 # chains + transports
    ├── discipleName.ts          # deterministic mystical names
    ├── disciples.ts             # disciple read helpers
    ├── oracleAssets.ts          # asset manifest
    └── simulation/              # the client-side world engine (worker, mapGen, atlas)
```

***

## The two halves

The frontend has two distinct subsystems:

1. **The dApp** — landing, temple, prophecies, leaderboard, disciple cards. Standard wagmi reads/writes against the five contracts. Covered in [Pages & Components](pages.md).
2. **The God Simulator** — `/oracle-world`, a self-contained PixiJS + Web Worker pixel civilization, bridged to `CivilizationLog`. Covered in [The Oracle World](oracle-world.md).

Both are dressed in the same [pixel-art asset language](pixel-art.md): Press Start 2P headings, VT323 body, a strict dark-gold palette, and custom sprite packs.

***

## Providers

`app/providers.tsx` wraps the app in `WagmiProvider` + `QueryClientProvider` + the ConnectKit provider. `lib/wagmi.ts` configures chains `[mantleSepoliaTestnet (5003), mantle (5000), mainnet]` with `ssr: true`; mainnet reads are proxied through `/api/eth-rpc` to avoid public-RPC rate limits.

→ [Pages & Components](pages.md) · [The Oracle World](oracle-world.md) · [Pixel-Art Asset Pack](pixel-art.md)
