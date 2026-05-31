# Demo Walkthrough

The end-to-end integration test — verify the whole stack (3 AIs → on-chain → `/oracle-world`) works as one. Adapted from the repo's `INTEGRATION_TEST.md`.

***

## Prerequisites

* A wallet with **≥ 0.1 MNT** on Mantle Sepolia (gas)
* An **OpenRouter** API key
* Node 20+ / npm 10+

***

## 1. Deploy the contracts

```bash
cd contracts
cp .env.example .env          # PRIVATE_KEY, ORACLE_ADDRESS, …
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

Record the five printed addresses: `MockUSDY`, `OracleMessage`, `TempleVault`, `BlessingDistributor`, `CivilizationLog`.

## 2. Configure the agent

```bash
cd ../agent
cp .env.example .env
```

Set the RPC, `ORACLE_PRIVATE_KEY`, the five addresses (incl. `CIV_LOG_ADDRESS`), and an LLM key — either one shared `OPENROUTER_API_KEY` or per-role `ORACLE_API_KEY` / `EVALUATOR_API_KEY` / `DEMIURGE_API_KEY`. Then:

```bash
npm install
npx tsx scripts/verifyEnv.ts     # expect all ✓, balance > 0.05 MNT, CIV_LOG has code
```

## 3. Configure the frontend

```bash
cd ../apps/web
cp .env.example .env.local
```

Fill every `NEXT_PUBLIC_*_ADDRESS` with the **same** addresses from step 1.

***

## 4. Run the agent (single cycle)

Set `CRON_SCHEDULE=""` in `agent/.env`, then:

```bash
cd ../../agent
npm run dev
```

Watch for:

```
Oracle starting (single-run mode).
Posting daily civilization snapshot to CivilizationLog.sol (day NNNNN)...
Snapshot posted successfully: 0x…
Chain data fetched: <block>
Temple: <N> disciples, <X> USDY staked
Generating today's prophecy...
  Prophecy: "<text>"
  Posted on-chain (day NNNNN): 0x…
Demiurge analyzing today's prophecy to schedule tomorrow's divine event...
Demiurge preview posted on-chain successfully: 0x…
Oracle + Civilization cycle complete.
```

## 5. Verify on-chain

Open `CIV_LOG_ADDRESS` on [Mantlescan Sepolia](https://sepolia.mantlescan.xyz):

* Recent txs: `postSnapshot`, `postDemiurgePreview` — each succeeded.
* Read `getLatestPreview` → returns 5 tool IDs + non-zero weights.
* Read `getSnapshot(currentDay)` → `snapshotAt > 0`.

## 6. Frontend live check

```bash
cd ../apps/web
npm install
npm run dev
```

Open `http://localhost:3000/oracle-world`. Expected once the bridge is live:

| Panel | Before bridge (sandbox) | Now (live on-chain) |
|---|---|---|
| **Demiurge Sector** | mock 5 candidates | **5 candidates from `getLatestPreview`**, weighted per AI #3 |
| **Cosmic Alignment Index** | mock history | **last 10 events** from `getDivineEventCount` + `getDivineEvent` |
| **Prophecy overlay** | hardcoded | hardcoded (the live prophecy lives on `/` and `/prophecies`) |
| **Continent sim** | local worker tick | local worker tick **+ replayed on-chain divine events** |

## 7. Fire a divine event for the demo

When the cron hasn't run, trigger one manually:

```bash
cd agent
npx tsx scripts/demoTriggerEvent.ts 5 0 800     # Meteor Strike, region 0, magnitude 800
```

Wait ~15s (the frontend's poll cycle). On `/oracle-world` the meteor + screen-shake plays and the Cosmic Alignment Index gains a new event in its tail. **That** is the real end-to-end proof: chain emits → frontend hears → worker renders.

***

## Troubleshooting quick table

| Symptom | Cause | Fix |
|---|---|---|
| `Missing env var: CIV_LOG_ADDRESS` | `.env` not copied | Redo step 2 |
| Tx revert "Only civ engine" | wrong key for CivilizationLog | Set `CIV_ENGINE_PRIVATE_KEY` to the `civEngine` EOA, or reuse the oracle |
| Frontend stuck on mock candidates | `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS` unset | Set it in `.env.local`, restart dev |
| Worker error in browser console | atlas/worker failed to load | `node scripts/build-atlas.mjs` in `apps/web/` |
| OpenRouter 401 | bad key / quota | Check the OpenRouter dashboard, regenerate |

Full list: [Troubleshooting](../troubleshooting.md).
