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
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=0xA41cA74250229F212367AB7f7b71552d07426Da3
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=0x7679f4252118FdAa5351CbcfA484965761a98CC4
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=0x60Bda6640129221d9819E6fbeF1406c4e105f789
NEXT_PUBLIC_USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
```

## Network

Mantle Sepolia Testnet (chainId 5003). Switch network in wallet if prompted.
