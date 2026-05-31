# AI #1 — The Oracle

> `agent/src/generateProphecy.ts` · default model `google/gemini-2.5-flash`

The voice of the cult. Once per UTC day the Oracle reads the state of the chain and the simulated civilization, and speaks a single cryptic prophecy — one to three sentences, poetic and ambiguous, but **grounded in real data**. That prophecy is written immutably to [`OracleMessage`](../contracts/oracle-message.md).

***

## What it reads

The Oracle is handed two structured inputs by `runOracleCycle`:

1. **`ChainSnapshot`** from [`fetchChainData`](#the-chain-snapshot) — Mantle activity plus the Temple's own state.
2. **A civilization snapshot** — today's `{ totalEntities, totalPopulation, totalFaith, dominantFaction, activeRegions }` from the [Civilization Engine](civilization-engine.md).

It is explicitly told to make **directional predictions about both worlds**: the Temple (staked USDY, disciple count) *and* the Civilization (population, faith, factions, regions).

***

## The persona

The system prompt casts the model as a single character:

> *"You are the Digital Oracle — an autonomous AI entity that watches over the Temple of the Digital Chain and its newly spawned simulation peradaban (The Oracle Civilization)."*

The rules it must obey:

* **Length:** 1–3 sentences. No more.
* **Tone:** *"Poetic, eerie, cryptic, and ambiguous — but strictly grounded"* in the data it was given.
* **Vocabulary:** lean on a fixed mystical lexicon — *the faithful, the simulation, the peradaban, the ledger, the great architect, the void, the sky fire*.
* **Forbidden:** *"Never explain. Never be literal. Never use modern slang."* The voice should feel *"timeless, inevitable, slightly menacing."*

The ambiguity is deliberate and load-bearing: a prophecy vague enough to be fulfilled by several outcomes is what makes the [Evaluator's](evaluator.md) job interesting and the daily ritual re-watchable.

***

## Generation parameters

```ts
generateProphecy(client, chainData, civSnapshot?, modelName = "google/gemini-2.5-flash")
```

| Parameter | Value | Why |
|---|---|---|
| `max_tokens` | `150` | Enforces brevity — a prophecy, not an essay |
| `temperature` | `0.9` | High — the Oracle should be surprising and varied |
| model | `ORACLE_MODEL` env, default `google/gemini-2.5-flash` | Fast, cheap, expressive |

The user message stitches together `chainData.summary`, the civilization snapshot (faith rendered as `Number(totalFaith) / 1e6`, faction labelled), and the instruction: *"Deliver today's prophecy predicting the fate of the Temple and the Civilization."*

The result is trimmed; an empty response throws `"OpenRouter returned empty prophecy"` so a failed generation never posts a blank prophecy on-chain.

***

## The chain snapshot

`fetchChainData(provider, usdyAddress, templeVaultAddress)` builds the `ChainSnapshot` the Oracle (and Evaluator) reason over. It samples the last 24 hours of Mantle activity and reads the Temple directly.

**Sampling** (`agent/src/fetchChainData.ts`):

* `blocksPerDay = 43_200`; samples **24 blocks** spread across the day.
* `getLogs` is chunked at **10,000 blocks** per request.
* A "large transfer" is **≥ 1 MNT** (`parseEther("1")`).

**`ChainSignals`** — derived market texture:

| Field | Meaning |
|---|---|
| `estimatedTransactions24h` | Extrapolated daily tx count from the sample |
| `sampledActiveAddresses` | Distinct addresses seen |
| `contractCallRatio` | % of sampled txs that hit a contract |
| `largeValueTransfers` | Count of ≥1 MNT transfers |
| `usdyTransferCount` / `usdyTransferVolume` | USDY `Transfer` log count + summed volume (6 decimals) |

**`TempleSnapshot`** — the cult watching itself:

| Field | Source |
|---|---|
| `discipleCount` | `nextId() - 1` |
| `totalFaithUsdy` | `formatUnits(totalFaith(), 6)` |
| `newDisciples24h` | ERC-721 mint `Transfer` logs (from `0x0`) |
| `exitedDisciples24h` | burn `Transfer` logs (to `0x0`) |
| `netGrowth24h` | `new − exited` |

This is the self-referential heart of the design: the Oracle's prophecy is shaped by *who joined and left the cult in the last day* — and tomorrow's join/leave behavior is shaped by the prophecy. (See [The Belief Economy](../concept/README.md).)

***

## On-chain write

The trimmed prophecy string is posted by `postProphecy` (`agent/src/postToChain.ts`):

```ts
const { day, txHash } = await postProphecy(signer, ORACLE_MESSAGE_ADDRESS, prophecyText);
```

If today's prophecy already exists on-chain, the cycle skips posting and reuses the existing text (so a re-run never double-posts). The `day` index is `floor(block.timestamp / 86400)` — the same UTC-day key the contract uses.

→ Contract details: [OracleMessage](../contracts/oracle-message.md).
