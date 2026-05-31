# Run the Agent

Configure and run the three-AI daily cycle that writes prophecies, verdicts, snapshots, and divine events.

***

## 1. Configure `agent/.env`

```bash
cd agent
cp .env.example .env
```

```env
# Chain
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
ORACLE_PRIVATE_KEY=<oracle wallet private key>

# Contract addresses (from the deploy step)
ORACLE_MESSAGE_ADDRESS=
TEMPLE_VAULT_ADDRESS=
BLESSING_DISTRIBUTOR_ADDRESS=
USDY_ADDRESS=
CIV_LOG_ADDRESS=

# Optional separate signer for CivilizationLog (defaults to ORACLE_PRIVATE_KEY)
CIV_ENGINE_PRIVATE_KEY=

# LLM — one shared key, or per-role keys
OPENROUTER_API_KEY=sk-or-v1-...
# ORACLE_API_KEY=        ORACLE_MODEL=google/gemini-2.5-flash
# EVALUATOR_API_KEY=     EVALUATOR_MODEL=google/gemini-2.5-flash
# DEMIURGE_API_KEY=      DEMIURGE_MODEL=anthropic/claude-3-5-sonnet

# Tuning
FULFILLMENT_THRESHOLD=70
CRON_SCHEDULE=0 0 * * *      # daily midnight UTC; "" = single run + exit
```

***

## 2. Verify the environment

```bash
npm install
npx tsx scripts/verifyEnv.ts
```

This pre-flight checks every required var, tests RPC connectivity, prints the chain ID and the oracle wallet's MNT balance (warns if < 0.05), and confirms `CIV_LOG_ADDRESS` has contract code. Fix anything red before running.

***

## 3. Run

```bash
npm run dev      # tsx src/index.ts — runs one cycle now, then on cron
npm run build    # tsc → dist/
npm start        # node dist/index.js (production)
```

A single full cycle (set `CRON_SCHEDULE=""`) logs roughly:

```
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

***

## Demo mode & manual triggers

| Goal | Command |
|---|---|
| Compress cron to every 30s | `DEMO_MODE=true` in `.env` |
| Fire one divine event now | `npx tsx scripts/demoTriggerEvent.ts <toolId 0-9> [region 0-254] [magnitude]` |

`demoTriggerEvent.ts` defaults to region `255` (global) and magnitude `500`; polarity is derived from the tool id (`<5` good, `≥5` evil). See the [Demo Walkthrough](../demo/walkthrough.md).

{% hint style="info" %}
**On the on-chain day boundary:** even in `DEMO_MODE`, prophecies are keyed by `block.timestamp / 1 days`, so at most one posts per real UTC day. For a fully time-compressed demo, run a local Hardhat node and advance time with `evm_increaseTime` between cycles.
{% endhint %}

***

## Production: GitHub Actions cron

`.github/workflows/oracle.yml` runs the agent daily at `0 0 * * *` (and on manual `workflow_dispatch`): Node 24, `npm ci`, `npx tsx src/index.ts` with `CRON_SCHEDULE=""` so it executes one cycle and exits. Provide the env values as repository **secrets**.

{% hint style="warning" %}
**Two gaps in the current workflow** to address before relying on CI:

* It injects a `GROQ_API_KEY` secret, but the code now expects OpenRouter keys (`OPENROUTER_API_KEY` / per-role). Update the secret/env names.
* It does **not** pass `CIV_LOG_ADDRESS`, so the CI cron would skip civilization snapshots and divine events. Add it (and `CIV_ENGINE_PRIVATE_KEY` if used).

Running the agent on a small always-on host (or a scheduled job that includes those vars) avoids both.
{% endhint %}

→ Next: [Deploy the Frontend](frontend.md).
