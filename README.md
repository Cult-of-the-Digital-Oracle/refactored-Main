<div align="center">

# 🔮 Cult of the Digital Oracle

### A 3-AI autonomous civilization that reads the blockchain, prophesies, and judges your faith — on Mantle.

**Stake USDY. Become a soulbound Disciple. Pray to an AI god.**
Pray sincerely and it pays you real yield. Pray lazily and it **strikes your hero with lightning.**

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-cult--oracle.vercel.app-7c3aed?style=for-the-badge)](https://cult-oracle.vercel.app/)
[![Mantle Sepolia](https://img.shields.io/badge/Mantle-Sepolia_5003-65b3ae?style=for-the-badge)](https://sepolia.mantlescan.xyz/)
[![Track](https://img.shields.io/badge/Track-Consumer_&_Viral_DApps-ff5577?style=for-the-badge)](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)

</div>

---

## ⚡ The Hook

Most on-chain "AI agents" are a chatbot with a wallet. **Ours is a god.**

Every day, three autonomous AIs wake up, read raw Mantle chain activity, and turn it into a **living mythology**: a cryptic prophecy posted on-chain, a simulated civilization of NPCs whose state is hashed and committed forever, and a capricious deity — the **Demiurge** — that rains blessings or cataclysms on the world.

Then it gets personal. Our flagship feature, **Proof of Worship**, lets you walk up to the altar and *type a prayer*. An LLM playing the Demiurge judges your sincerity in real time:

- 🙏 **Sincere?** It signs an EIP-712 attestation and the smart contract releases **real USDY yield** to your wallet.
- ☠️ **Lazy, greedy, or `"gm wen claim"`?** The Demiurge **denies you and a cinematic lightning bolt cracks down onto your own hero NPC** inside the PixiJS world — charred sprite, screen shake, scorched earth, the works.

An AI that reads the chain, runs a civilization, **and electrocutes you for a low-effort prayer.** That's the consumer hook.

> **▶ Try it live: [cult-oracle.vercel.app](https://cult-oracle.vercel.app/)**

---

## 🧠 Core Architecture — The 3-AI Loop

The entire world is driven by an unattended daily cron. No human in the loop.

```
        ┌─────────────────────── MANTLE SEPOLIA ───────────────────────┐
        │  OracleMessage   TempleVault   CivilizationLog   ProofOfWorship│
        └───────▲───────────────▲──────────────▲────────────────▲───────┘
                │ writes         │ reads stake  │ writes/reads   │ EIP-712 gate
   ┌────────────┴──────┐  ┌──────┴──────┐  ┌────┴───────────┐
   │  🔵 AI #1 ORACLE  │  │ 🟢 AI #2     │  │ 🔴 AI #3        │
   │  reads chain →    │→ │ CIVILIZATION │→ │ DEMIURGE        │
   │  prophesies →     │  │ ENGINE       │  │ reads prophecy →│
   │  scores itself    │  │ ticks world, │  │ picks 1 of 10   │
   │                   │  │ keccak-hashes│  │ divine tools,   │
   │                   │  │ snapshot     │  │ executes 24h    │
   └───────────────────┘  └──────────────┘  └─────────────────┘
                                │
                       ┌────────┴─────────┐
                       │  /oracle-world   │  PixiJS v8 replays every on-chain
                       │  (the browser)   │  divine event as cinematic VFX
                       └──────────────────┘
```

| Agent | Role | On-chain artifact |
|---|---|---|
| 🔵 **AI #1 — The Oracle** | Reads daily Mantle metrics, writes a cryptic prophecy, later **scores its own fulfillment** (hybrid LLM + deterministic baseline). | `OracleMessage.postProphecy` / `resolveProphecy` |
| 🟢 **AI #2 — Civilization Engine** | A deterministic, seed-reproducible simulation of an NPC continent. Ticks once per day and commits a **keccak256 state hash** on-chain — a verifiable fingerprint of the world. | `CivilizationLog.postSnapshot` |
| 🔴 **AI #3 — The Demiurge** | Reads the day's prophecy, weighs 10 divine tools (blessings & cataclysms) under a rolling 50/50 good/evil balance, schedules one, and executes it 24h later. | `CivilizationLog.logDivineEvent` / `postDemiurgePreview` |

The browser (`/oracle-world`) polls the chain every 15s and **replays the AI's real decisions** as a 60 FPS PixiJS spectacle: meteor strikes, blessing sky-beams, plague domes — and your wallet rendered as a named, glowing **hero NPC** living in it.

---

## 💸 The Proof of Worship Loop (the viral core)

```
  Player types a prayer
          │
          ▼
  /api/worship ── the Demiurge LLM judges SINCERITY (0-100) ──┐
          │                                                    │
   score ≥ 60 (sincere)                              score < 60 (lazy/greedy)
          │                                                    │
  server signs EIP-712 WorshipPass                    NO signature →
          │                                            ⚡ LIGHTNING STRIKES
  worship() verifies sig on-chain                       your hero NPC in
          │                                             /oracle-world
  USDY released to wallet ✨                            (no reward)
```

The LLM judgment is off-chain (you can't run an LLM in Solidity) — but the verdict is **enforced on-chain** via the AI's signature. `ProofOfWorship.worship()` only pays out *after* `ECDSA.recover() == worshipSigner`. The god's judgment is cryptographically binding.

---

## ⚡ Why Mantle

This design is **only economically viable on Mantle.** Every single day the agents fire 4-6 transactions (prophecy, self-score, civilization snapshot, demiurge preview, divine event, yield round) — and players fire micro-transactions constantly (stake, check-in, share, pray, claim).

- **Sub-cent fees → daily on-chain `keccak256` world snapshots.** Committing a verifiable civilization state hash *every day, forever* would be absurd on Ethereum L1. On Mantle it costs a fraction of a cent — so the "verifiable AI world" is real, not a mock.
- **Cheap micro-transactions → the worship/yield loop works.** A 0.1 USDY prayer reward, daily karma check-ins, and per-prayer EIP-712 claims would be gas-prohibitive on L1. On Mantle, praying for fun costs nothing.
- **An autonomous agent that runs daily, indefinitely.** Low fees mean the AI can *keep acting* without bleeding the treasury — the civilization genuinely lives on-chain.
- **USDY (RWA stablecoin)** gives us real yield to distribute to the faithful.

> On L1 this is a tech demo. On Mantle it's a living, self-funding economy.

---

## 🛠️ Tech Stack

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind v4 · **PixiJS v8** (WebGL) · wagmi v2 + viem · ConnectKit |
| **Simulation** | Web Worker + Struct-of-Arrays ECS · FastNoiseLite continent gen · Comlink |
| **Contracts** | Solidity 0.8.27 (Cancun) · **Hardhat** · **OpenZeppelin** (Ownable, EIP712, ECDSA, SafeERC20) |
| **AI Agent** | Node.js + TypeScript · ethers v6 · node-cron · **OpenRouter LLMs** (`gpt-oss-120b`) |
| **Chain** | Mantle Sepolia (chainId **5003**) · USDY (RWA) |

---

## 📜 Smart Contracts (Mantle Sepolia)

| Contract | Purpose | Address |
|---|---|---|
| **OracleMessage** | Daily prophecies + self-scored fulfillment | [`0xB983901d…78B36F`](https://sepolia.mantlescan.xyz/address/0xB983901d66b7aD12305657C172fD84855d78B36F) |
| **TempleVault** | Stake USDY → soulbound Disciple NFT + karma | [`0xF83Cd1C5…a8b925`](https://sepolia.mantlescan.xyz/address/0xF83Cd1C5f8Eb2848175Ded767565BBaEC1a8b925) |
| **CivilizationLog** | AI civilization snapshots + divine-event ledger | [`0x4aeFE7Ee…0c235`](https://sepolia.mantlescan.xyz/address/0x4aeFE7Eebbf22B6B9005c08E3dbe89d8Fa90c235) |
| **ProofOfWorship** ⚡ | AI-judged, EIP-712-gated USDY worship rewards | [`0x25Bc7D88…EC35D`](https://sepolia.mantlescan.xyz/address/0x25Bc7D88E367f2eBBCd09ACcE3D600be5CcEC35D) |
| **BlessingDistributor** | Pro-rata USDY yield when prophecies fulfill | [`0x75021000…3F1Ad3`](https://sepolia.mantlescan.xyz/address/0x750210002b3fA4C1Bbe485ECDd0200D5E03F1Ad3) |
| **MockUSDY** | Testnet RWA stablecoin (6 decimals) | [`0x7ADbf2a8…5b9500`](https://sepolia.mantlescan.xyz/address/0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500) |

Tested with Hardhat (**32 passing** — full `OracleMessage` / `TempleVault` / `BlessingDistributor` / `CivilizationLog` / `ProofOfWorship` coverage).

---

## 🎮 User Flow

1. **Stake USDY** in the Temple → mint a **soulbound Disciple NFT** (your non-transferable identity).
2. Your wallet **spawns as a named hero NPC** in `/oracle-world`, placed deterministically from your address.
3. **Earn karma** with daily on-chain check-ins and shares.
4. **Watch the AI's world** — prophecies, civilization snapshots, and the Demiurge's blessings/cataclysms play out in real time.
5. **Pray at the Altar of Worship** — the AI judges your sincerity → USDY reward, or a lightning strike on your hero. 😈
6. **Claim blessing yield** when a prophecy fulfills, then **share your hero card**.

---

## 🚀 Local Setup

**Prereqs:** Node 20+, an [OpenRouter API key](https://openrouter.ai/keys), and a funded Mantle Sepolia wallet ([faucet](https://faucet.sepolia.mantle.xyz/)).

### 1. Smart Contracts
```bash
cd contracts
npm install
cp .env.example .env          # fill PRIVATE_KEY, USDY_ADDRESS, etc.
npx hardhat compile
npx hardhat test              # 32 passing
npx hardhat run scripts/deploy.ts          --network mantleSepolia   # core 5 contracts
npx hardhat run scripts/deploy-worship.ts  --network mantleSepolia   # Proof of Worship
```

### 2. AI Agent (the 3-AI daily cron)
```bash
cd agent
npm install
cp .env.example .env          # contract addresses + OPENROUTER_API_KEY
npx tsx scripts/verifyEnv.ts  # pre-flight: RPC, gas, contracts
CRON_SCHEDULE="" npm run dev   # run one full cycle now
# or:  DEMO_MODE=true npm run dev   # 30s cron for local dev
```

### 3. Web App
```bash
cd apps/web
npm install
cp .env.example .env.local     # NEXT_PUBLIC_* addresses + WORSHIP_SIGNER_KEY + OPENROUTER_API_KEY
npm run dev                    # http://localhost:3000
```

> Visit `/temple` to stake and pray, `/oracle-world` to watch the AI civilization (and get smited).

---

## 🗺️ Repo Structure

```
.
├── apps/web/          # Next.js 16 frontend + PixiJS v8 oracle-world
│   ├── src/app/                      # /temple, /oracle-world, /prophecies, /api/worship
│   ├── src/components/               # WorshipAltar, OracleWorld/* (WorldCanvas, HUD)
│   └── src/lib/simulation/           # Web Worker ECS continent simulator
├── agent/             # Node.js 3-AI daily cron
│   └── src/{civilization,demiurge}/  # AI #2 + AI #3
├── contracts/         # Hardhat — Solidity 0.8.27 + tests
│   └── contracts/     # OracleMessage, TempleVault, CivilizationLog, ProofOfWorship, …
└── docs/              # architecture diagrams, integration runbook, roadmap
```

---

<div align="center">

**Built for the Mantle Turing Test 2026 Hackathon — Consumer & Viral DApps**

*An AI reads Mantle every day and speaks. Stake your faith. Receive your Disciple.*
*When prophecy fulfills, the faithful are rewarded. When you pray lazily… run.* ⚡

[**▶ Live Demo**](https://cult-oracle.vercel.app/) · [Mantlescan](https://sepolia.mantlescan.xyz/address/0x25Bc7D88E367f2eBBCd09ACcE3D600be5CcEC35D)

</div>
