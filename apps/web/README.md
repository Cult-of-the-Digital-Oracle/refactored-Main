# Cult of the Digital Oracle — Frontend

**Live:** https://web-red-nine-58.vercel.app

Next.js 16 frontend for the Cult of the Digital Oracle hackathon DApp on Mantle.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **wagmi v2 + viem** — contract reads/writes
- **ConnectKit** — wallet connection modal (themed to match pixel UI)
- **Tailwind CSS v4**
- **Press Start 2P + VT323** — pixel fonts via Google Fonts

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — live prophecy from chain |
| `/temple` | Faucet → approve USDY → stake → Disciple card → claim yield |
| `/prophecies` | Archive of all past prophecies with fulfillment scores |
| `/leaderboard` | Disciples ranked by faith, karma, and seniority |
| `/disciple/[tokenId]` | Shareable Disciple card with OG image |

## Setup

```bash
cp .env.local.example .env.local
# fill in contract addresses + WalletConnect project ID
npm install
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=0xB983901d66b7aD12305657C172fD84855d78B36F
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=0xF83Cd1C5f8Eb2848175Ded767565BBaEC1a8b925
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=0x750210002b3fA4C1Bbe485ECDd0200D5E03F1Ad3
NEXT_PUBLIC_USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS=0x4aeFE7Eebbf22B6B9005c08E3dbe89d8Fa90c235
NEXT_PUBLIC_PROOF_OF_WORSHIP_ADDRESS=0x25Bc7D88E367f2eBBCd09ACcE3D600be5CcEC35D
```

## Network

Mantle Sepolia Testnet (chainId 5003). Switch network in wallet if prompted.
