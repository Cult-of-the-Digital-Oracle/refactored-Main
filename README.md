# Cult of the Digital Oracle

> The Turing Test Hackathon 2026 by Mantle - Consumer & Viral DApps

An AI agent reads the Mantle blockchain every day, writes a cryptic prophecy on-chain, and later judges whether that prophecy came true. Users stake USDY into the Temple, mint a soulbound Disciple NFT, and claim yield when the Oracle declares fulfillment.

## What it is

Cult of the Digital Oracle is a Mantle-native social DeFi experiment:

- An AI oracle turns real chain data into eerie daily prophecies.
- Every prophecy is recorded on-chain.
- Believers stake USDY and receive a soulbound Disciple identity.
- Fulfilled prophecies trigger blessing rounds and USDY distribution.
- Each Disciple has a shareable pixel-art card with an OG image.

The point is not just "AI on crypto." The point is an auditable AI ritual with on-chain memory, identity, and rewards.

## User flow

1. Open `/temple` and connect a wallet.
2. Mint test USDY with the faucet.
3. Approve USDY and enter the Temple.
4. Receive a soulbound Disciple NFT tied to the wallet.
5. Wait for prophecy fulfillment rounds.
6. Claim blessing yield pro-rata based on stake.
7. Share the Disciple card via `/disciple/[tokenId]`.

## Oracle flow

Once per day, the agent:

1. Fetches Mantle chain data.
2. Evaluates yesterday's prophecy against today's chain conditions.
3. Resolves that prophecy with a score from 0 to 100.
4. Queues a blessing round when the score meets the threshold.
5. Generates and posts today's prophecy on-chain.

## Smart contracts

### `OracleMessage.sol`

Stores one prophecy per UTC day and its fulfillment result.

Core functions:

```solidity
postProphecy(string text)
resolveProphecy(uint256 day, uint8 score)
todaysProphecy() returns (Prophecy)
getProphecy(uint256 day) returns (Prophecy)
```

### `TempleVault.sol`

Accepts USDY deposits and mints a soulbound Disciple NFT. One Disciple per wallet.

Core functions:

```solidity
enter(uint256 amount) returns (uint256 tokenId)
exit(uint256 tokenId)
cardOf(address wallet) returns (uint256 tokenId)
totalFaith() returns (uint256)
```

### `BlessingDistributor.sol`

Distributes yield pro-rata after fulfilled prophecies.

Core functions:

```solidity
queueBlessing(uint256 day, uint256 amount)
claim(uint256 roundId, uint256 tokenId)
pendingBlessing(uint256 roundId, uint256 tokenId) returns (uint256)
```

### `MockUSDY.sol`

Test token with 6 decimals and a public faucet for demo flow.

## Frontend routes

- `/` - landing page with live prophecy and pixel-art presentation
- `/temple` - faucet, approve, stake, disciple card, claim
- `/prophecies` - prophecy archive with fulfillment states
- `/disciple/[tokenId]` - shareable Disciple identity page
- `/api/og/disciple/[tokenId]` - dynamic OG image endpoint

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 16, React, Tailwind v4, TypeScript |
| Web3 | wagmi, viem, RainbowKit |
| Contracts | Hardhat, Solidity 0.8.27, OpenZeppelin |
| Agent | Node.js, ethers v6, Groq API via OpenAI-compatible SDK |
| Network | Mantle Sepolia |
| OG images | `next/og` edge runtime |

## Repository structure

```text
hackathon-mantle/
|-- apps/web/               # Next.js frontend
|   `-- src/
|       |-- app/            # routes and OG API
|       |-- components/     # UI building blocks
|       `-- lib/            # wagmi config, contract constants, asset manifest
|-- contracts/              # Hardhat project
|   |-- contracts/
|   `-- scripts/
|-- agent/                  # AI oracle backend
|   `-- src/
|-- PROJECT.md              # product and pitch context
|-- CLAUDE.md               # repo-specific coding notes
`-- PIXEL_ART_PROMPTS.md    # source prompt set for generated asset pack
```

## Quick start

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### Agent

```bash
cd agent
npm install
npm run dev
```

### Contracts

```bash
cd contracts
npm install
npx hardhat compile
```

## Demo helpers

Populate a richer demo with Disciples, check-ins, recorded shares, and a blessing round:

```bash
cd contracts
npm run demo:populate -- --network mantleSepolia
```

For testnet, set `DEMO_DISCIPLE_PRIVATE_KEYS` to a comma-separated list of funded demo wallet private keys. Without it, the script uses available Hardhat signers, which is best for local runs.

Seed only a blessing round:

```bash
cd contracts
npx hardhat run scripts/demo-seed.ts --network mantleSepolia
```

Send gas to a test wallet:

```bash
cd contracts
npx tsx scripts/topup.ts <wallet-address>
```

## Environment

Frontend expects:

```env
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=
NEXT_PUBLIC_USDY_ADDRESS=
```

Agent expects:

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

Demo population can also use:

```env
DEMO_DISCIPLE_PRIVATE_KEYS=
DEMO_STAKE_AMOUNTS=125,80,60,40,25
DEMO_BLESSING_AMOUNT=25
DEMO_BLESSING_DAY=
```

## Current state

Implemented:

- on-chain prophecy posting
- prophecy resolution and blessing queue flow
- Temple staking UX
- Disciple NFT share page
- public Disciple leaderboard
- daily check-in and share karma actions
- pixel-art frontend redesign
- OG image generation for social sharing

## Hackathon

- Event: https://dorahacks.io/hackathon/mantleturingtesthackathon2026
- Track: Consumer & Viral DApps
- Network: Mantle Sepolia for demo
