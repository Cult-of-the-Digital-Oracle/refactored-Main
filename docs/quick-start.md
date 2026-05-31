# Quick Start

Get the whole stack running locally. For production deployment, see the [Deployment Guide](deployment/README.md).

***

## Prerequisites

* **Node.js 20+** / npm 10+
* A **Mantle Sepolia** wallet with ≥ 0.1 MNT ([details](deployment/prerequisites.md))
* An **OpenRouter** API key ([openrouter.ai/keys](https://openrouter.ai/keys))

```bash
git clone https://github.com/Cult-of-the-Digital-Oracle/refactored-Main.git
cd refactored-Main
```

***

## The three workspaces

```text
contracts/   →  deploy the 5 contracts, get addresses
agent/       →  run the 3 AIs that write to chain
apps/web/    →  the frontend that reads everything
```

***

## 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env          # set PRIVATE_KEY, ORACLE_ADDRESS
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

**Copy all five printed addresses** — MockUSDY, OracleMessage, TempleVault, BlessingDistributor, CivilizationLog. ([Why this matters](contracts/deployment.md).)

***

## 2. Agent

```bash
cd ../agent
npm install
cp .env.example .env          # paste the 5 addresses + OPENROUTER_API_KEY + ORACLE_PRIVATE_KEY
npx tsx scripts/verifyEnv.ts  # pre-flight: all green?
npm run dev                   # runs one cycle now, then on cron
```

You should see it post a snapshot, a prophecy, and a Demiurge preview on-chain. ([Full agent guide](deployment/agent.md).)

***

## 3. Frontend

```bash
cd ../apps/web
npm install
cp .env.example .env.local     # paste the SAME 5 addresses as NEXT_PUBLIC_* + WC project id
npm run dev                    # :3000 (Turbopack)
```

Open **http://localhost:3000**:

| Route | What to check |
|---|---|
| `/` | Today's prophecy renders live |
| `/temple` | Faucet → Approve → Enter mints a Disciple NFT |
| `/oracle-world` | The God Simulator runs; Demiurge panel shows on-chain candidates |
| `/prophecies` | Archive with fulfillment scores |

{% hint style="warning" %}
The agent's `.env` and the frontend's `.env.local` must use the **same five addresses**. Mismatched addresses = empty prophecy + mock world. This is the most common first-run issue — see [Troubleshooting](troubleshooting.md).
{% endhint %}

***

## See a god act (instant demo)

Don't want to wait for the daily cron? Fire a divine event by hand and watch it land in `/oracle-world` within ~15 seconds:

```bash
cd agent
npx tsx scripts/demoTriggerEvent.ts 5 0 800   # Meteor Strike on region 0
```

***

## Where to go next

* New to the idea? → [The Belief Economy](concept/README.md)
* Want the AI internals? → [The Triune Intelligence](ai-agents/README.md)
* Reading the contracts? → [Smart Contracts](contracts/README.md)
* Running a live demo? → [Demo Walkthrough](demo/walkthrough.md)
