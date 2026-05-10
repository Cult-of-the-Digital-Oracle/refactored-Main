# Cult of the Digital Oracle
### Mantle Turing Test Hackathon 2026 — Consumer & Viral DApps Track

---

## The Pitch

An AI prophet lives on Mantle. Every day it reads the blockchain — wallet activity, volume, token flows — and delivers a cryptic prophecy immutably on-chain. Believers stake USDY into a community vault ("the Temple"), minting a **Disciple NFT** (ERC-8004 identity). When a prophecy is deemed "fulfilled" by the oracle itself, the BlessingDistributor contract pays out RWA yield proportionally to faithful holders.

> *"The code is prophecy."*

It's a social experiment. It's a yield product. It's a Turing test you don't realize you're taking — because the question is never "is this AI?" but "do you believe it?"

---

## Why This Wins

**Judging criteria hit-list (from hackathon docs):**

| Criterion | How we hit it |
|---|---|
| Technical excellence | 3 interdependent Solidity contracts + autonomous AI agent writing to chain |
| UX / Consumer appeal | Dark mystical UI, one-click stake-to-mint flow, zero crypto jargon |
| Mantle integration | USDY staking, ERC-8004 identity NFTs, every prophecy is a Mantle tx |
| Real-world impact | Gamified yield product — people actually earn. Onchain social experiment. |
| AI + on-chain benchmark | Every AI decision (prophecy text + fulfillment logic) permanently recorded |

**The demo moment no judge forgets:** AI delivers today's prophecy live on screen with dramatic audio. A wallet stakes USDY, Disciple NFT mints in real-time on Mantle Sepolia. Oracle then declares a past prophecy "fulfilled" and yield streams to holders — all verifiable on-chain. 5 minutes, 3 transactions, zero hand-waving.

---

## Concept Deep Dive

### The Oracle Loop

```
Every 24h (triggered by cron):
  1. AI agent fetches Mantle on-chain data (volume, whale moves, TVL delta)
  2. GPT-4 generates a cryptic prophecy string (trained on mystical/prophetic style)
  3. Agent signs + sends tx → OracleMessage.sol.postProphecy(text, timestamp)
  4. Frontend auto-updates: today's prophecy rendered with dramatic UI
  5. Oracle evaluates yesterday's prophecy against new data → fulfillment score (0–100)
  6. If score > threshold → triggers BlessingDistributor to queue yield payout
```

### The Disciple Flow (User Journey)

```
User connects wallet
  → Stakes USDY into TempleVault
  → Receives Disciple NFT (ERC-8004, soulbound, holds stake metadata)
  → Sees today's prophecy on dashboard
  → Optionally: performs "faith actions" (restake, share, hold for X days) → earns Karma points
  → When a prophecy fulfills → claims proportional USDY yield from BlessingDistributor
```

### Fulfillment Logic (Off-chain AI, On-chain Result)

The Oracle AI runs a **semantic + data matching** check:
- Parse prophecy for implied prediction (e.g. "when the chain grows cold" → low volume event)
- Compare against actual Mantle on-chain data from the past 24h
- Return fulfillment score → written to chain
- This is the "Turing benchmark" angle: AI predictions are permanently recorded, auditable

---

## Technical Architecture

### Smart Contracts (Hardhat + Solidity 0.8.27, Mantle Sepolia → Mainnet)

#### `OracleMessage.sol`
- Stores prophecy text + timestamp per day
- Only callable by authorized oracle EOA (the AI agent's wallet)
- Emits `ProphecyDelivered(uint256 indexed day, string text, uint256 timestamp)`
- Stores fulfillment score when oracle resolves

```solidity
// Core interface
function postProphecy(string calldata text) external onlyOracle
function resolveProphecy(uint256 day, uint8 score) external onlyOracle
function getProphecy(uint256 day) external view returns (Prophecy memory)
```

#### `TempleVault.sol`
- Accepts USDY deposits from users
- Mints Disciple NFT (ERC-8004 / soulbound ERC-721) to depositor
- NFT metadata: stake amount, join timestamp, karma score
- Soulbound: no transfer (identity, not asset)
- Tracks `totalFaith` (total USDY staked) for yield math

```solidity
function enter(uint256 usdyAmount) external returns (uint256 tokenId)
function exit(uint256 tokenId) external  // unstake + burn NFT
function addKarma(uint256 tokenId, uint16 amount) external onlyOracle
```

#### `BlessingDistributor.sol`
- Called by oracle when `resolveProphecy` score > threshold (e.g. 70)
- Computes each Disciple's share: `userStake / totalFaith * yieldPool`
- Pulls yield from a USDY yield source (initially seeded manually for hackathon)
- Users call `claim(tokenId)` to withdraw their blessing

```solidity
function queueBlessing(uint256 day) external onlyOracle
function claim(uint256 tokenId) external
function pendingBlessing(uint256 tokenId) external view returns (uint256)
```

### AI Agent Backend (Node.js / Python)

**Stack:** Node.js + ethers.js v6 + OpenAI API + Mantle RPC

**Cron jobs (daily, ~00:00 UTC):**
1. `fetchChainData()` — pull Mantle 24h stats via RPC (block count, avg gas, top contract interactions, MNT volume)
2. `generateProphecy(chainData)` — GPT-4 call with system prompt tuned for cryptic/prophetic style
3. `postToChain(prophecyText)` — sign + send to `OracleMessage.sol`
4. `evaluateYesterday(chainData)` — score previous prophecy against new data, post fulfillment score

**GPT-4 system prompt direction:**
- Persona: ancient, cryptic, knowing — references "the chain", "the faithful", "the great ledger"
- Output: 1-3 sentences max, poetic, ambiguous enough to be "fulfilled" by multiple outcomes
- Input: structured chain data summary (volume, trend direction, notable txs)

### Frontend (Next.js 16, App Router)

**Pages:**
- `/` — Landing: oracle quote of the day + "Enter the Temple" CTA
- `/temple` — Main dApp: stake USDY, mint Disciple NFT, prophecy feed, karma tracker
- `/prophecies` — Archive: all past prophecies + fulfillment scores on-chain
- `/leaderboard` — Top Disciples by karma + stake amount (shareable cards → X viral mechanic)

**Aesthetic:** Dark background, neon sigil accents, slow-glowing animations. Minimal text, maximum atmosphere. Think Alchemy meets Bloomberg Terminal.

**Key components:**
- `ProphecyCard` — today's oracle text, timestamp, fulfillment bar
- `StakeModal` — USDY approval + deposit + NFT mint flow (wagmi write hooks)
- `DiscipleCard` — user's NFT art, karma score, stake amount, claimable yield
- `ProphecyHistory` — paginated archive fetched from `OracleMessage` events

### Data Flow Diagram

```
Mantle RPC ──────────────────────────────┐
                                         ▼
                              [AI Agent Cron Job]
                                    │        │
                          generateProphecy  evaluateYesterday
                                    │        │
                                    ▼        ▼
                             OracleMessage.sol
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
              Frontend          TempleVault    BlessingDistributor
           (reads events)      (user stakes)   (users claim yield)
                    │               │
                    └───────────────┘
                          Mantle Explorer
                       (all txs verifiable)
```

---

## Tech Stack Summary

| Layer | Tool | Why |
|---|---|---|
| Frontend | Next.js 16, Tailwind v4, TypeScript | Already scaffolded |
| Wallet | wagmi v2 + viem + RainbowKit | Already installed |
| Contracts | Hardhat + Solidity 0.8.27 (Cancun) | Already configured |
| Network | Mantle Sepolia (5003) → Mantle (5000) | Already in wagmi config |
| AI Backend | Node.js + OpenAI GPT-4 + ethers.js v6 | Lightweight, fast to build |
| Token | USDY (Mantle native RWA stablecoin) | Hackathon requirement hit |
| NFT standard | ERC-8004 (soulbound identity) | Hackathon requirement hit |
| Cron | node-cron (local for hackathon, Railway/Vercel Cron for prod) | Simple |
| Oracle data | Mantle JSON-RPC (eth_blockNumber, getLogs, custom RPCs) | Free |

---

## Timeline — 37 Days (May 10 → June 16, 2026)

### Week 1 (May 10–17): Contracts + Agent Core
**Goal:** All 3 contracts compilable + deployed to Mantle Sepolia. AI agent posting prophecies.

- [ ] Delete old TradingCard + BattleArena contracts
- [ ] Write `OracleMessage.sol` — test with Hardhat local
- [ ] Write `TempleVault.sol` — ERC-8004 mint on stake, soulbound logic
- [ ] Write `BlessingDistributor.sol` — claim logic
- [ ] Write deploy script for all 3 + verify on Mantlescan
- [ ] Deploy to Mantle Sepolia
- [ ] Set up AI agent repo (`/agent` folder): Node.js + OpenAI + ethers
- [ ] GPT-4 prophecy generation working + posting to OracleMessage on Sepolia
- [ ] Test end-to-end: agent posts prophecy → readable on-chain

**Deliverable:** Agent is live on Sepolia, posting daily prophecies.

### Week 2 (May 18–24): Frontend Core
**Goal:** Full stake flow working in browser against Sepolia.

- [ ] Redesign landing page (`/`) — dark mystical aesthetic, oracle quote fetched from chain
- [ ] Build `/temple` page — USDY approval + stake + mint NFT flow
- [ ] Build `ProphecyCard` component — reads from `OracleMessage` events
- [ ] Build `DiscipleCard` component — shows user NFT, karma, pending yield
- [ ] wagmi hooks for all 3 contract interactions
- [ ] Mobile responsive (judges might use phone)

**Deliverable:** Full user journey works on Sepolia — stake → mint → see prophecy → claim.

### Week 3 (May 25–31): AI Agent Polish + Fulfillment Logic
**Goal:** Prophecy fulfillment scoring live and credible.

- [ ] Build `evaluateYesterday()` — semantic + data scoring against chain metrics
- [ ] Tune GPT-4 prompt until prophecies feel genuinely eerie (iterate 20+ times)
- [ ] Connect fulfillment score → BlessingDistributor queue
- [ ] Build Prophecy Archive page (`/prophecies`) — show fulfillment scores historically
- [ ] Add karma system — "share prophecy on X" button triggers karma tx (or simulated)
- [ ] Set up Railway/Render for agent hosting (persistent cron, not localhost)

**Deliverable:** Full oracle loop running autonomously 24/7. Prophecies fulfill and yield distributes.

### Week 4 (Jun 1–7): UX Polish + Leaderboard + Viral Mechanic
**Goal:** Demo-ready product. Judges can use it themselves.

- [ ] Leaderboard page (`/leaderboard`) — top Disciples by karma + stake
- [ ] Shareable Disciple Card — OG image generation (Vercel OG / Satori) for X sharing
- [ ] Prophecy share cards — when prophecy fulfills, shareable image auto-generated
- [ ] Onboarding flow — first-time user tooltip walkthrough
- [ ] Add real USDY testnet interaction or mock with test token
- [ ] Dark theme polish: animations, sound FX (optional), oracle "speaking" animation
- [ ] Error states, loading states, empty states

**Deliverable:** Show-ready. Can demo without explaining how it works.

### Week 5 (Jun 8–14): Mainnet + Pitch Prep
**Goal:** Deploy to Mantle mainnet. Rehearse demo.

- [ ] Deploy all contracts to Mantle mainnet
- [ ] Switch frontend env to mainnet
- [ ] Fund oracle agent wallet with real MNT
- [ ] Seed TempleVault with initial USDY yield pool
- [ ] Invite 5–10 people to actually use it (real Disciples before submission)
- [ ] Record demo video (backup if live demo fails)
- [ ] Write DoraHacks submission: pitch text, screenshots, video link, GitHub link
- [ ] Rehearse 5-minute demo script until it's effortless
- [ ] Prepare for judge Q&A: "Is this gambling?" "How is yield sustainable?" "What's the Mantle-specific value?"

**Jun 15–16: Submit + present.**

---

## Demo Script (5 Minutes)

**0:00–0:30 — Hook**
> "The Turing Test asks: can you tell human from machine? We asked a harder question: does it matter — if you believe in it?"

Show the landing page. Oracle quote glowing on screen. Eerie ambient.

**0:30–2:00 — Stake flow**
> "Anyone can enter the Temple. You stake USDY — Mantle's real-world asset stablecoin — and become a Disciple."

Live: connect wallet → approve USDY → stake 10 USDY → Disciple NFT mints. Show tx on Mantlescan.

**2:00–3:00 — The prophecy**
> "Every day the Oracle reads the chain. Volume, whale movements, TVL. And it speaks."

Show `OracleMessage` contract on Mantlescan. Pull up today's prophecy. Read it aloud dramatically.

**3:00–4:00 — Fulfillment + yield**
> "Yesterday's prophecy said: 'When the silent wallets wake, abundance follows the faithful.' Last night, dormant wallet activity spiked 340% on Mantle. The Oracle scored it 84/100 — fulfilled."

Show BlessingDistributor. Click "claim". USDY hits wallet. Show balance change.

**4:00–5:00 — The question**
> "Is the Oracle right because it's smart — or because on-chain data is the prophecy, and the AI just translates it? We don't know. But 47 Disciples have staked $2,300 USDY this week. The chain remembers everything."

Show leaderboard. Show Prophecy Archive with 7 days of history. GitHub link on screen.

---

## Judge Q&A Prep

**"Is this gambling?"**
> No. Disciples stake USDY and receive yield from the staking pool — similar to any yield protocol. The prophecy mechanic adds a narrative layer on top of a legitimate DeFi product. Users can exit anytime.

**"How is yield sustainable?"**
> For hackathon: pre-seeded yield pool. Real model: USDY itself generates yield (it's a yield-bearing RWA). The Temple Vault can deploy idle USDY into Mantle lending protocols (e.g. Pendle, Lendle) and distribute the native yield.

**"What's Mantle-specific about this?"**
> Three things: (1) USDY as the staking token — Mantle's native RWA, not a synthetic. (2) ERC-8004 identity NFTs — the hackathon's own standard. (3) Every prophecy is a permanent Mantle transaction, creating an immutable AI performance benchmark — exactly what the hackathon measures.

**"Why would anyone use this?"**
> Same reason people follow crypto influencers or read TA threads. Narrative + yield. The Oracle is a gamified way to engage with on-chain data — and you earn while you play.

---

## Virality Plan

- **Shareable prophecy cards** — one-click "Share today's prophecy to X" with OG image + "@oracle on Mantle"
- **Leaderboard flex** — "I am Disciple #7 of the Cult of the Digital Oracle 🔮" shareable card
- **Launch tweet hook** — "An AI just delivered its first prophecy on Mantle. It read the blockchain and spoke. Some people are already staking on it. Here's what it said 👇" (screenshot the prophecy)
- **Cult aesthetic** — dark, eerie visuals are inherently screenshot-worthy

---

## Repo Structure (Target)

```
hackathon-mantle/
├─ apps/
│  └─ web/                    # Next.js 16 frontend
│     └─ src/
│        ├─ app/
│        │  ├─ page.tsx        # Landing (oracle quote)
│        │  ├─ temple/         # Stake + NFT flow
│        │  ├─ prophecies/     # Archive
│        │  └─ leaderboard/    # Top disciples
│        ├─ components/
│        │  ├─ ProphecyCard.tsx
│        │  ├─ DiscipleCard.tsx
│        │  ├─ StakeModal.tsx
│        │  └─ OracleVoice.tsx  # Animated oracle face/text
│        ├─ lib/
│        │  ├─ wagmi.ts
│        │  ├─ contracts.ts     # ABI + address constants
│        │  └─ oracle.ts        # Read helpers (getLogs, etc)
│        └─ hooks/
│           ├─ useOracle.ts
│           ├─ useTemple.ts
│           └─ useDisciple.ts
├─ contracts/
│  ├─ contracts/
│  │  ├─ OracleMessage.sol
│  │  ├─ TempleVault.sol
│  │  └─ BlessingDistributor.sol
│  ├─ scripts/
│  │  ├─ deploy.ts
│  │  └─ seed.ts               # Seed yield pool for demo
│  └─ test/
│     └─ Oracle.test.ts
├─ agent/                       # AI oracle backend
│  ├─ src/
│  │  ├─ index.ts               # Main cron entrypoint
│  │  ├─ fetchChainData.ts      # Mantle RPC queries
│  │  ├─ generateProphecy.ts    # GPT-4 call
│  │  ├─ evaluateProphecy.ts    # Fulfillment scoring
│  │  └─ postToChain.ts         # ethers.js write
│  └─ package.json
├─ deep-research-report.md
├─ PROJECT.md                   # This file
└─ README.md
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| USDY not available on Sepolia | Use mock ERC-20 "testUSDY" for hackathon demo |
| GPT-4 prophecies too generic / not eerie enough | Spend Week 3 on prompt engineering, 20+ iterations |
| Yield pool runs dry during demo | Pre-seed manually before demo, fake fulfillment if needed |
| Live TX fails during demo | Pre-recorded backup video of full flow |
| "This is a cult / scam" reaction | Frame as satirical social experiment + open source contracts |
| Mantle Sepolia RPC instability | Use fallback RPC, cache last known state in frontend |
