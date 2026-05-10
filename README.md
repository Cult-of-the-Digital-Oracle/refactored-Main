# Mantle Trading Card Battle

> Submission for **The Turing Test Hackathon 2026** by Mantle — track: **Consumer & Viral DApps** (AI Awakening phase).

Your wallet is your character sheet. Connect, let the AI scan your on-chain history, and mint a soulbound **trading card** with derived stats (ATK / DEF / Vibe). Stake MNT, challenge other holders, and let an AI resolver settle the battle. Cards are issued as ERC-8004-style identity NFTs — your reputation accrues on Mantle.

## Why this fits the track

- **Consumer hook:** one-tap mint from a wallet → instant shareable card art.
- **Viral loop:** PvP wagers + leaderboard + share-card-to-X.
- **On-chain AI:** every card score and battle outcome is a Mantle tx, satisfying the hackathon's "permanent record of AI performance" rule.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16 (App Router, RSC), Tailwind v4, TypeScript |
| Wallet | wagmi v2 + viem + RainbowKit |
| Contracts | Hardhat + Solidity 0.8.27 (Cancun), OpenZeppelin |
| Network | Mantle Sepolia (chainId 5003) → Mantle (5000) |
| AI | OpenAI for card scoring + battle resolution (off-chain agent, on-chain commits) |

## Layout

```
hackathon-mantle/
├─ apps/web/          # Next.js frontend
└─ contracts/         # Hardhat: TradingCard.sol, BattleArena.sol
```

## Quick start

```bash
# 1. Frontend
cd apps/web
cp .env.local.example .env.local   # fill NEXT_PUBLIC_WC_PROJECT_ID etc
npm run dev

# 2. Contracts
cd contracts
cp .env.example .env               # fill PRIVATE_KEY
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

Get test MNT from the Mantle Sepolia faucet, then paste the deployed addresses into `apps/web/.env.local`.

## Hackathon links

- Hackathon: https://dorahacks.io/hackathon/mantleturingtesthackathon2026
- Phase: AI Awakening · Consumer & Viral DApps
- Deadline: **June 16, 2026**
