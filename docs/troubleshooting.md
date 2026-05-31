# Troubleshooting

Common failures across all three workspaces, with causes and fixes.

***

## Agent

| Symptom | Cause | Fix |
|---|---|---|
| `Missing env var: CIV_LOG_ADDRESS` (or others) | `.env` not created from `.env.example`, or a value blank | Copy `.env.example` → `.env`, fill every required var; run `npx tsx scripts/verifyEnv.ts` |
| `OpenRouter returned empty prophecy` | LLM returned nothing (quota/model issue) | Check OpenRouter dashboard; confirm the model in `ORACLE_MODEL` is available to your key |
| OpenRouter **401** | Bad/expired key or no credit | Regenerate the key; ensure `OPENROUTER_API_KEY` (or per-role key) is set |
| Tx revert **"Only civ engine"** / `NotCivEngine` | Wrong signer for `CivilizationLog` | Set `CIV_ENGINE_PRIVATE_KEY` to the wallet that is `civEngine` on the contract, or redeploy with the oracle as civEngine |
| Tx revert `NotOracle` | The signing wallet isn't the contract's `oracle` | Ensure `ORACLE_PRIVATE_KEY`'s address matches the `oracle` set at deploy (or `setOracle` it) |
| `verifyEnv` warns balance < 0.05 MNT | Oracle wallet low on gas | Fund it from the Mantle Sepolia faucet / `topup.ts` |
| Agent runs but posts nothing | Today's prophecy already exists | Expected — one prophecy per UTC day; the cycle reuses it |
| CI cron posts prophecy but no civ snapshots | `.github/workflows/oracle.yml` omits `CIV_LOG_ADDRESS` (and uses `GROQ_API_KEY`) | Add `CIV_LOG_ADDRESS` (+ `CIV_ENGINE_PRIVATE_KEY`) and OpenRouter keys to the workflow secrets/env |

***

## Contracts

| Symptom | Cause | Fix |
|---|---|---|
| Deploy fails on compile | Wrong Solidity/EVM | Use the repo's Hardhat config (0.8.27, cancun); `npx hardhat compile` clean first |
| Lost contract addresses after deploy | No persisted artifact | Re-deploy and **immediately** copy all five printed addresses into both env files |
| `enter()` reverts `AlreadyDisciple` | Wallet already holds a Disciple | One Disciple per wallet; `exit()` first to re-stake |
| `enter()` reverts (USDY transfer) | No `approve()` before `enter()` | Approve the vault for the stake amount first |
| `queueBlessing` reverts `NoActiveFaith` | `totalFaith == 0` (no stakers) | Have at least one Disciple staked before queuing |
| `claim` reverts `NotDisciple` | Caller isn't the token's original staker | Only `claimantOf(tokenId)` can claim (survives burn) |

***

## Frontend

| Symptom | Cause | Fix |
|---|---|---|
| Landing prophecy empty | Agent hasn't run, or address mismatch | Run the agent once; ensure `NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS` matches the agent's `ORACLE_MESSAGE_ADDRESS` |
| `/oracle-world` shows mock candidates | `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS` unset or wrong | Set it to a deployment the agent writes to; restart dev |
| Worker error in browser console | Atlas WebP or `worker.ts` failed to load | `node scripts/build-atlas.mjs` in `apps/web/`; hard-refresh |
| BigInt literal / build type error | `tsconfig` target below ES2020 | Keep `"target": "ES2020"` in `apps/web/tsconfig.json` |
| Wallet won't connect | Wrong chain or missing WC id | Switch wallet to Mantle Sepolia (5003); set `NEXT_PUBLIC_WC_PROJECT_ID` |
| Frontend reads stale/zero data | Address drift agent ↔ frontend | Put the **same five addresses** in `agent/.env` and `apps/web/.env.local` |
| Mainnet reads rate-limited | Public RPC limits | Mainnet calls proxy through `/api/eth-rpc` — ensure that route is deployed |

***

## The one bug to rule them all

{% hint style="warning" %}
**~80% of first-run problems are address drift.** `scripts/deploy.ts` deploys fresh contracts every run with no saved artifact, so it's easy to end up with the agent writing to one set and the frontend reading another. The cure is always the same: pick one set of five addresses, verify them on [Mantlescan](https://sepolia.mantlescan.xyz), and write them into **both** `agent/.env` and `apps/web/.env.local`. See [Deployment & Addresses](contracts/deployment.md).
{% endhint %}

***

## Still stuck?

* Re-run `npx tsx scripts/verifyEnv.ts` in `agent/` — it catches most misconfigurations.
* Confirm contract code exists at each address on Mantlescan (`getCode != 0x`).
* Walk the [Demo Walkthrough](demo/walkthrough.md) step by step — it's the canonical end-to-end check.
