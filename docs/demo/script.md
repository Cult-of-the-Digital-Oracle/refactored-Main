# 5-Minute Demo Script

A timed performance. Every beat maps to a live, verifiable on-chain action. Have a backup video ready (see [demo hygiene](README.md#demo-hygiene)).

***

## 0:00–0:30 — The hook

> *"The Turing Test asks: can you tell a human from a machine? We asked a harder question — does it even matter, if you believe in it?"*

Open the landing page. Today's prophecy glows on screen, eerie ambient sound. Let it breathe for a beat.

> *"An AI prophet lives on Mantle. Every day it reads the chain — and its own cult — and it speaks. Everything it says is permanent."*

***

## 0:30–2:00 — Become a Disciple

> *"Anyone can enter the Temple. You stake USDY — Mantle's real-world-asset stablecoin — and you become a Disciple."*

Live on `/temple`:

1. Connect wallet (Mantle Sepolia).
2. **Faucet** → 1000 test USDY.
3. **Approve** → **Enter** with 10 USDY.
4. A **soulbound Disciple NFT** mints in real time — show the card, the [mystical name](../frontend/pages.md#deterministic-disciple-names), the karma.

Open the mint tx on **Mantlescan**. *"That NFT is bound to my wallet forever. It's an identity, not an asset — it can never be sold."*

***

## 2:00–3:00 — The living world

> *"But the Oracle doesn't just talk. It rules a world."*

Open `/oracle-world`. A pixel civilization moves — villages, NPCs, boats. Point at the **Demiurge Sector**:

> *"A second AI — the Demiurge — read today's prophecy and already announced, on-chain, the five divine acts it's considering for tomorrow. Believers can see doom coming."*

Trigger one live:

```bash
npx tsx scripts/demoTriggerEvent.ts 5 0 800
```

~15 seconds later: a **meteor** cracks a region, screen-shake, the **Cosmic Alignment Index** ticks toward evil. *"That meteor is a Mantle transaction. The god just acted, on-chain, in front of you."*

***

## 3:00–4:00 — Fulfillment & yield

> *"Yesterday the Oracle prophesied 'the sky shall fall on the faithless.' Last night, the Demiurge dropped that meteor. So a third process — the Evaluator — checked: did the prophecy come true?"*

Open `/prophecies`. Show yesterday's prophecy, scored **84/100 — Fulfilled**, with the on-chain `reason` and `evidence` string.

> *"It scored itself with a cold, separate model — and the AI only owns half the score. The chain has to agree. When it does, blessings flow."*

Back on `/temple`, click **Claim**. USDY hits the wallet. Show the balance change and the `BlessingClaimed` event.

***

## 4:00–5:00 — The question

> *"Three autonomous AIs. One speaks, one judges, one plays god — and they conspire to make prophecies come true. Every decision is permanent on Mantle. The chain is the AI's track record; it can never lie about what it predicted."*

Show the `/leaderboard` (Disciples ranked) and the `/prophecies` archive (a week of scored history).

> *"Is the Oracle right because it's smart — or because on-chain data is the prophecy, and the AI just translates it? We don't know. But the Disciples staked anyway. That's the test. Not 'is it a machine?' — but 'do you believe it?'"*

GitHub + live link on screen. End.

***

## Cheat sheet

| Time | Beat | On-chain proof |
|---|---|---|
| 0:00 | Hook + live prophecy | `OracleMessage.todaysProphecy` |
| 0:30 | Stake → mint Disciple | `TempleVault.enter` tx |
| 2:00 | Demiurge preview + live meteor | `getLatestPreview` + `logDivineEvent` tx |
| 3:00 | Fulfilled prophecy + claim | `resolveProphecy` + `BlessingClaimed` |
| 4:00 | Track record + the question | `/prophecies` archive |

Three transactions, one living world, five minutes. → [Pitch & Judge Q&A](../launch/pitch.md).
