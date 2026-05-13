# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cult of the Digital Oracle** — Mantle hackathon DApp (Consumer & Viral track). An AI agent reads Mantle chain data daily and posts cryptic prophecies on-chain. Users stake USDY to become Disciples (soulbound NFTs), receive yield when prophecies fulfill, and share their cards.

Three independent workspaces: `apps/web` (frontend), `contracts` (Solidity), `agent` (AI oracle backend).

## Commands

### Frontend (`apps/web`)
```
cd apps/web
npm run dev          # dev server on :3000 (Turbopack)
npx next build       # production build + type check
```

### Contracts (`contracts`)
```
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
npx hardhat run scripts/demo-seed.ts --network mantleSepolia   # seed 50 USDY blessing round for demo
npx tsx scripts/topup.ts <address>                             # send 0.2 MNT gas from oracle wallet
```

### Agent (`agent`)
```
cd agent
npm run dev          # npx tsx src/index.ts — run oracle cycle immediately + start cron
npm run build        # tsc
npm start            # node dist/index.js (production)
```

> **Next.js 16 note:** This version has breaking changes. Before writing any frontend code, read the relevant guide in `apps/web/node_modules/next/dist/docs/`. Heed deprecation notices — APIs, conventions, and file structure may differ from training data.

## Architecture

### Smart Contracts (Solidity 0.8.27, Cancun EVM)

Three contracts on Mantle Sepolia:

**`OracleMessage`** — Prophecy storage. Keyed by `block.timestamp / 1 days` (UTC day index). Only the oracle EOA can post/resolve. Functions: `postProphecy(text)`, `resolveProphecy(day, score)`, `todaysProphecy()`, `getProphecy(day)`.

**`TempleVault`** — USDY staking → soulbound ERC-721 NFT. One Disciple per wallet. Transfers blocked except mint/burn. Functions: `enter(amount)` → tokenId, `exit(tokenId)`, `cardOf(address)`, `totalFaith()`.

**`BlessingDistributor`** — Pro-rata yield distribution. Oracle queues a blessing round (pulls USDY from oracle wallet). Each Disciple claims `(stakeAmount / totalFaith) × yieldPool`. Functions: `queueBlessing(day, amount)`, `claim(roundId, tokenId)`, `pendingBlessing(roundId, tokenId)`.

**`MockUSDY`** — Test ERC-20 (6 decimals) with public `faucet()` → 1000 tokens.

### AI Agent (`agent/src/`)

Cron loop (default daily midnight UTC, configurable via `CRON_SCHEDULE`):
1. Fetch yesterday's prophecy → if unresolved: evaluate against today's chain data → `resolveProphecy(day, score)`
2. If score ≥ `FULFILLMENT_THRESHOLD` (default 70): `queueBlessing()` to distribute `YIELD_PER_ROUND` (0.5 USDY)
3. Fetch today's chain data → generate prophecy via Groq → `postProphecy(text)`

**Key design:** Uses `openai` npm package pointed at Groq's API (`baseURL: https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile`). Do NOT switch to the Anthropic SDK — Groq is free tier and already configured.

### Frontend (`apps/web/src/`)

- `lib/contracts.ts` — Single source of truth for all ABIs + contract addresses (env-based). Update here when adding new contract functions.
- `lib/wagmi.ts` — wagmi config with `mantleSepoliaTestnet` (chainId 5003) + `mantle` (5000).
- `app/providers.tsx` — WagmiProvider + QueryClientProvider + RainbowKit wrapping layout.
- `app/page.tsx` — Landing page with live `<TodaysProphecy />` component.
- `app/temple/page.tsx` — Main UX: faucet → approve USDY → `enter()` → DiscipleCard → ClaimPanel → share.
- `app/prophecies/page.tsx` — Archive: batch reads last 30 days via `useReadContracts`.
- `app/disciple/[tokenId]/page.tsx` + `app/api/og/disciple/[tokenId]/route.tsx` — Shareable card page with OG image (edge runtime).

### Environment Variables

**`agent/.env`:**
```
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
ORACLE_PRIVATE_KEY=
ORACLE_MESSAGE_ADDRESS=0x163fd8daa2df8Ef5fb50EC18F734D4549824e639
TEMPLE_VAULT_ADDRESS=0xFeC183003ba31EE7c298A8ffb321EF4B5FB88746
BLESSING_DISTRIBUTOR_ADDRESS=0x35A0d20c9ad2867ab7E01CaF59420d64EA11E6Be
USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
GROQ_API_KEY=
FULFILLMENT_THRESHOLD=70
CRON_SCHEDULE=0 0 * * *
```

**`apps/web/.env.local`:** Same contract addresses prefixed with `NEXT_PUBLIC_`, plus `NEXT_PUBLIC_WC_PROJECT_ID`.

## Key Constraints

- `tsconfig.json` in `apps/web` must stay at `"target": "ES2020"` — BigInt literals in contract interactions require it.
- Prophecy day index = `Math.floor(Date.now() / 86400000)` — matches `block.timestamp / 1 days` in Solidity.
- All oracle contract writes check `msg.sender == oracle` — only the oracle wallet in `agent/.env` can post/resolve/queue.
- `TempleVault` NFTs are soulbound — do not attempt transfer logic in the frontend.
