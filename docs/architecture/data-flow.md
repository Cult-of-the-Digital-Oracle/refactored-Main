# Data Flow

Two flows define the system: the **daily agent cycle** (machine-driven) and the **Disciple journey** (human-driven). They meet at the contracts.

***

## Flow 1 — the daily oracle cycle

Driven by `runOracleCycle()` in `agent/src/index.ts`, once per UTC day.

```mermaid
sequenceDiagram
    autonumber
    participant CE as Civilization Engine
    participant DM as Demiurge (AI #3)
    participant CL as CivilizationLog
    participant CH as Mantle / Temple
    participant OR as Oracle (AI #1)
    participant EV as Evaluator (AI #2)
    participant OM as OracleMessage
    participant BD as BlessingDistributor

    DM->>CE: applyDivineTool(toolId) — execute yesterday's scheduled act
    DM->>CL: logDivineEvent — record the executed tool on-chain
    CE->>CE: tick() — advance world one day
    CE->>CL: postSnapshot(day, snap)
    Note over CH,EV: fetchChainData() — 24h activity + Temple state (feeds both Evaluator and Oracle)
    EV->>CL: read yesterday & today CivSnapshots
    EV->>OM: resolveProphecy(day-1, score, reason, evidence)
    alt score ≥ FULFILLMENT_THRESHOLD (70)
        EV->>BD: queueBlessing(day-1, 0.5 USDY)
    end
    OR->>OM: postProphecy(today's text)
    DM->>DM: decide(prophecy) — sentiment → balance → rank → seeded pick
    DM->>CL: postDemiurgePreview(top-5 candidates for day+1)
```

**The closed loop:** the Evaluator judges a prophecy partly by the world the Demiurge shaped; the Demiurge schedules its next act by reading the prophecy the Oracle just spoke. Each agent's output is another agent's input — through the chain.

***

## Flow 2 — the Disciple journey

Driven by a user on `/temple`, via wagmi writes.

```mermaid
sequenceDiagram
    autonumber
    participant U as User wallet
    participant US as MockUSDY
    participant TV as TempleVault
    participant BD as BlessingDistributor

    U->>US: faucet() — receive 1000 test USDY
    U->>US: approve(TempleVault, amount)
    U->>TV: enter(amount)
    TV->>US: safeTransferFrom(user → vault)
    TV-->>U: mint soulbound Disciple NFT (tokenId)
    Note over U,TV: optional daily faith actions
    U->>TV: checkIn(tokenId) → +5 karma
    U->>TV: recordShare(tokenId, channel) → +3 karma
    Note over BD: a prophecy fulfills → round queued
    U->>BD: pendingBlessing(roundId, tokenId)
    U->>BD: claim(roundId, tokenId)
    BD->>TV: claimantOf / eligibleStakeAt (auth + pro-rata)
    BD-->>U: USDY share transferred
```

***

## Flow 3 — the world on screen

Driven by `/oracle-world` polling the chain while a local sim runs.

```mermaid
graph LR
    subgraph BROWSER["/oracle-world · browser"]
        WK[Web Worker sim<br/>15Hz · 15k entities]
        WC[PixiJS WorldCanvas]
        HUD[HUD panels]
    end
    CL[(CivilizationLog)]
    TV[(TempleVault)]

    CL -->|poll 15s · getLatestPreview| HUD
    CL -->|poll 15s · getDivineEvent| WK
    CL -->|poll 15s · getSnapshot| HUD
    TV -->|poll 30s · active disciples| WC
    WK -->|render frames| WC
```

The browser runs its own continuous world simulation for smooth motion, but **on-chain divine events are bridged in**: every 15 seconds the page reads new `DivineEvent`s from `CivilizationLog` and replays them visually (`triggerDivineTool`). Active Disciples are polled from `TempleVault` and rendered as hero NPCs. See [The Oracle World](../frontend/oracle-world.md).

***

## Where each piece of data lives

| Data | Home | Read by |
|---|---|---|
| Prophecy text + verdict | `OracleMessage` (on-chain) | Landing, `/prophecies`, Evaluator |
| Disciple identity, stake, karma | `TempleVault` (on-chain) | `/temple`, `/leaderboard`, `/disciple/[id]`, BlessingDistributor |
| Blessing rounds + claims | `BlessingDistributor` (on-chain) | `/temple` |
| World snapshots + divine events | `CivilizationLog` (on-chain) | `/oracle-world` |
| Full world state (entities, regions) | agent JSON files + `stateHash` on-chain | agent only (chain holds the commitment) |
| 24h chain metrics | computed live from Mantle RPC | Oracle, Evaluator (not stored) |

The principle: **anything that must be trusted or shown is on-chain; bulky deterministic detail stays off-chain behind a hash.**
