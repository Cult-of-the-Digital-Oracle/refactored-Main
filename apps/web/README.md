# Cult of the Digital Oracle — Frontend

Next.js 16 frontend for the [Cult of the Digital Oracle](https://github.com) hackathon DApp on Mantle.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **wagmi v2 + viem** — contract reads/writes
- **RainbowKit** — wallet connection
- **Tailwind CSS v4**

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — live prophecy from chain |
| `/temple` | Stake USDY → mint Disciple NFT → claim USDY yield |
| `/prophecies` | Archive of all past prophecies + fulfillment scores |
| `/disciple/[tokenId]` | Shareable Disciple Card with OG image |

## Setup

```bash
cp .env.local.example .env.local
# fill in contract addresses + WalletConnect project ID
npm install
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=0x163fd8daa2df8Ef5fb50EC18F734D4549824e639
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=0xFeC183003ba31EE7c298A8ffb321EF4B5FB88746
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=0x35A0d20c9ad2867ab7E01CaF59420d64EA11E6Be
NEXT_PUBLIC_USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
```

## Network

Mantle Sepolia Testnet (chainId 5003). Switch network in wallet if prompted.
