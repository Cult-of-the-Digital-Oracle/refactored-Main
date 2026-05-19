# Cult of the Digital Oracle

> The Turing Test Hackathon 2026 by Mantle - Consumer & Viral DApps

**Live:** https://web-red-nine-58.vercel.app

An AI agent reads the Mantle blockchain every day — including its own community of believers — writes a cryptic prophecy on-chain, and later judges whether that prophecy came true. Users stake USDY into the Temple, mint a soulbound Disciple NFT, and claim yield when the Oracle declares fulfillment.

## What it is

Cult of the Digital Oracle is an experiment in autonomous AI belief economies on Mantle:

- An AI oracle watches the chain and its own cult — disciple count, total faith staked, who joined or left — and turns that into eerie daily prophecies.
- Every prophecy is recorded on-chain, immutable.
- Believers stake USDY and receive a soulbound Disciple identity (ERC-721, non-transferable).
- Fulfilled prophecies trigger blessing rounds: USDY yield distributed pro-rata to active Disciples.
- The oracle scores its own past prophecy against what actually happened in the Temple, creating a self-fulfilling loop — if the oracle predicts growth and disciples stake to make it true, the prophecy fulfills and blessings flow.
- Each Disciple has a shareable pixel-art card with a dynamic OG image.

The point is not "AI on crypto." It is an auditable AI ritual with on-chain memory, identity, and economic consequences — an autonomous agent with skin in the game of its own predictions.

## User flow

1. Open `/temple` and connect a wallet.
2. Mint test USDY with the faucet.
3. Approve USDY and enter the Temple.
4. Receive a soulbound Disciple NFT tied to your wallet.
5. Wait for the oracle's daily cycle.
6. Claim blessing yield pro-rata based on stake when prophecy fulfills.
7. Share the Disciple card via `/disciple/[tokenId]`.

## Oracle agent flow

Once per day (midnight UTC), the agent:

1. Fetches Mantle chain data — transactions, gas, USDY volume, active addresses.
2. Fetches Temple state — disciple count, total faith staked, who joined or exited in the last 24h.
3. Evaluates yesterday's prophecy against today's chain + Temple data (hybrid LLM + deterministic score).
4. Resolves that prophecy on-chain with a score 0–100 and a reason.
5. Queues a blessing round if score ≥ threshold (default 70).
6. Generates today's prophecy using real chain + cult data as context, posts it on-chain.

## Smart contracts

Deployed on Mantle Sepolia.

### `OracleMessage.sol`

Stores one prophecy per UTC day and its fulfillment result.

```solidity
postProphecy(string text)
resolveProphecy(uint256 day, uint8 score, string reason, string evidence)
todaysProphecy() returns (Prophecy)
getProphecy(uint256 day) returns (Prophecy)
```

### `TempleVault.sol`

Accepts USDY deposits and mints a soulbound Disciple NFT. One per wallet. Transfers blocked.

```solidity
enter(uint256 amount) returns (uint256 tokenId)
exit(uint256 tokenId)
cardOf(address wallet) returns (uint256 tokenId)
totalFaith() returns (uint256)
nextId() returns (uint256)
```

### `BlessingDistributor.sol`

Distributes yield pro-rata after fulfilled prophecies.

```solidity
queueBlessing(uint256 day, uint256 amount)
claim(uint256 roundId, uint256 tokenId)
pendingBlessing(uint256 roundId, uint256 tokenId) returns (uint256)
```

### `MockUSDY.sol`

Test ERC-20 with 6 decimals and a public `faucet()` → 1000 tokens.

## Frontend routes

| Route | Description |
|---|---|
| `/` | Landing page — live on-chain prophecy, pixel-art presentation |
| `/temple` | Faucet → approve → stake → Disciple card → claim blessings |
| `/prophecies` | Archive of all past prophecies with fulfillment scores |
| `/leaderboard` | Disciples ranked by faith, karma, and seniority |
| `/disciple/[tokenId]` | Shareable Disciple identity card |
| `/api/og/disciple/[tokenId]` | Dynamic OG image for social sharing |

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16, React, Tailwind v4, TypeScript |
| Web3 | wagmi v2, viem, ConnectKit |
| Wallet UI | Press Start 2P + VT323 pixel fonts, custom pixel-art asset pack |
| Contracts | Hardhat, Solidity 0.8.27, OpenZeppelin |
| Agent | Node.js, ethers v6, Groq API (llama-3.3-70b) via OpenAI-compatible SDK |
| Network | Mantle Sepolia (chainId 5003) |
| OG images | `next/og` edge runtime |
| Hosting | Vercel |

## Repository structure

```text
hackathon-mantle/
├── apps/web/               # Next.js frontend
│   └── src/
│       ├── app/            # routes and OG API
│       ├── components/     # UI building blocks
│       └── lib/            # wagmi config, contract constants, asset manifest
├── contracts/              # Hardhat project
│   ├── contracts/
│   └── scripts/
├── agent/                  # AI oracle backend
│   └── src/
│       ├── index.ts        # cron orchestration
│       ├── fetchChainData.ts   # Mantle + Temple state reader
│       ├── generateProphecy.ts # LLM prophecy generation
│       ├── evaluateProphecy.ts # hybrid fulfillment scoring
│       └── postToChain.ts  # contract write helpers
├── PROJECT.md              # product and pitch context
├── CLAUDE.md               # repo-specific coding notes
└── PIXEL_ART_PROMPTS.md    # source prompt set for generated asset pack
```

## Quick start

### Frontend

```bash
cd apps/web
npm install
npm run dev       # dev server on :3000
```

### Agent

```bash
cd agent
npm install
npm run dev       # runs oracle cycle immediately, then on cron
```

### Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

## Demo helpers

Populate a richer leaderboard with Disciples, check-ins, and a blessing round:

```bash
cd contracts
npm run demo:populate -- --network mantleSepolia
```

Seed only a blessing round:

```bash
cd contracts
npx hardhat run scripts/demo-seed.ts --network mantleSepolia
```

Send MNT gas to a test wallet:

```bash
cd contracts
npx tsx scripts/topup.ts <wallet-address>
```

## Environment variables

**Frontend (`apps/web/.env.local`):**

```env
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=0xA41cA74250229F212367AB7f7b71552d07426Da3
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=0x7679f4252118FdAa5351CbcfA484965761a98CC4
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=0x60Bda6640129221d9819E6fbeF1406c4e105f789
NEXT_PUBLIC_USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
```

**Agent (`agent/.env`):**

```env
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
ORACLE_PRIVATE_KEY=
ORACLE_MESSAGE_ADDRESS=
TEMPLE_VAULT_ADDRESS=
BLESSING_DISTRIBUTOR_ADDRESS=
USDY_ADDRESS=
GROQ_API_KEY=
FULFILLMENT_THRESHOLD=70
CRON_SCHEDULE=0 0 * * *
```

## Current state (as of 2026-05-19)

### Completed

- [x] Smart contracts deployed on Mantle Sepolia
- [x] Daily oracle cycle — fetch chain data, generate prophecy, post on-chain
- [x] Prophecy resolution — LLM + deterministic hybrid score, on-chain resolution
- [x] Blessing distribution — fulfilled prophecies queue USDY yield rounds
- [x] Temple staking UX — faucet → approve → enter → Disciple NFT
- [x] Blessing claim UX — pending amount shown, one-click claim
- [x] Prophecy archive — all past prophecies with scores and resolution text
- [x] Public leaderboard — disciples ranked by faith, karma, and seniority
- [x] Shareable Disciple cards — `/disciple/[tokenId]` with OG image for Twitter/X
- [x] Karma system — on-chain karma incremented on check-in and share actions
- [x] Pixel-art frontend — Press Start 2P headings, VT323 body, custom asset pack
- [x] ConnectKit wallet modal — MetaMask, WalletConnect QR, themed to match UI
- [x] Temple-aware oracle — agent reads own disciple count, total faith, and 24h joins/exits when generating and scoring prophecies
- [x] Oracle-given disciple names — deterministic mystical names generated from wallet address (e.g. "The Ashen Keeper", "Void Warden of the Chain") shown on leaderboard, disciple card, and temple
- [x] Vercel deployment — live at https://web-red-nine-58.vercel.app

### What makes it interesting

The oracle is not just a text generator. It watches its own community. When it predicts growth and disciples stake to fulfill that prediction, the score rises, blessings flow, and the cycle continues. The prophecy creates the behavior that makes it true — a self-fulfilling economy mediated by an autonomous AI agent operating entirely on-chain.

## Hackathon

- Event: https://dorahacks.io/hackathon/mantleturingtesthackathon2026
- Track: Consumer & Viral DApps
- Network: Mantle Sepolia for demo
