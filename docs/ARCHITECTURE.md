# Architecture — Activity Diagrams

Two views: the **daily agent cycle** (backend, on a cron) and the **live frontend
loop** (`/oracle-world` in the browser). Both render natively on GitHub via Mermaid.

---

## 1. Daily 3-AI Cycle (agent/src/index.ts)

Runs once per UTC day (or every 30s in `DEMO_MODE`). Swimlanes = which actor owns
each step.

```mermaid
flowchart TD
    start([Cron fires]) --> initEng[AI #2: init/load civ engine + demiurge state]

    initEng --> execY{AI #3: scheduled tool<br/>from yesterday due?}
    execY -- yes --> doExec[Execute divine tool<br/>→ logDivineEvent on chain]
    execY -- no --> tick
    doExec --> tick[AI #2: tick civilization world]

    tick --> snap[Build snapshot hash<br/>→ logSnapshot on chain]
    snap --> fetch[Fetch chain + Temple data]

    fetch --> evalQ{Yesterday's prophecy<br/>unresolved?}
    evalQ -- yes --> eval[AI #1b: score vs chain+temple+civ<br/>→ resolveProphecy on chain]
    eval --> bless{score ≥ threshold?}
    bless -- yes --> queue[queueBlessing<br/>→ USDY yield round]
    bless -- no --> postQ
    evalQ -- no --> postQ

    queue --> postQ{Today's prophecy<br/>already posted?}
    postQ -- no --> gen[AI #1: generate prophecy<br/>→ postProphecy on chain]
    postQ -- yes --> decide
    gen --> decide[AI #3: read today's prophecy<br/>pick top-5 tool candidates]

    decide --> preview[Post Demiurge preview<br/>→ logDemiurgePreview on chain<br/>scheduled for tomorrow]
    preview --> done([Cycle complete])

    classDef ai1 fill:#1e3a5f,stroke:#4a9eff,color:#fff
    classDef ai2 fill:#1e5f3a,stroke:#4aff9e,color:#fff
    classDef ai3 fill:#5f1e3a,stroke:#ff4a9e,color:#fff
    class gen,eval ai1
    class initEng,tick,snap ai2
    class execY,doExec,decide,preview ai3
```

**Legend:** 🔵 AI #1 Oracle (prophecy + scoring) · 🟢 AI #2 Civilization Engine
(deterministic sim, no LLM) · 🔴 AI #3 Demiurge (tool selection + execution).

---

## 2. Live Frontend Loop (/oracle-world)

The browser runs the simulation locally for 60 FPS visuals while polling the chain
for the AI's real decisions, then replays them visually.

```mermaid
flowchart TD
    open([User opens /oracle-world]) --> initWorker[Spawn Web Worker<br/>seed continent from day index]
    initWorker --> render[Render loop @ 60 FPS<br/>PixiJS draws worker state]

    render --> render

    subgraph poll[On-chain poll · every 15s]
        p1[Read getLatestPreview] --> p2[Read getDivineEventCount]
        p2 --> newEv{event count<br/>increased?}
        newEv -- yes --> dispatch[triggerDivineTool in worker<br/>→ apply effect + spawn VFX]
        newEv -- no --> idle[update HUD only]
    end

    subgraph disc[Disciple poll · every 30s]
        d1[Read TempleVault disciples] --> d2[Spawn/update hero NPCs<br/>glow + name label]
    end

    render -.drives.-> poll
    render -.drives.-> disc
    dispatch -.visual.-> render
    d2 -.visual.-> render
```

---

## 3. Data Flow Summary

```mermaid
flowchart LR
    chain[(Mantle Sepolia)]
    agent[Agent cron<br/>3 AIs]
    civlog[CivilizationLog.sol]
    web[/oracle-world/]

    agent -- writes prophecy/score --> chain
    agent -- writes snapshot/preview/events --> civlog
    civlog -. reads .-> web
    chain -. reads .-> web
    web -- replays events --> web
```

> **Note:** `CivilizationLog.sol` not yet deployed on Sepolia. Until deployed +
> `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS` set, the frontend `civlog` read path
> returns empty → DivineToolsPanel shows mock data. See `STATUS-AND-ROADMAP.md`.
