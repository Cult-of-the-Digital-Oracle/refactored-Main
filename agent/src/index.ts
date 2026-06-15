import "dotenv/config";
import cron from "node-cron";
import { ethers } from "ethers";
import OpenAI from "openai";

import { fetchChainData } from "./fetchChainData";
import { generateProphecy } from "./generateProphecy";
import { evaluateProphecy, CivSnapshotData } from "./evaluateProphecy";
import {
  postProphecy,
  resolveProphecy,
  queueBlessing,
  getUnresolvedProphecies,
  getTodaysProphecy,
  blessingExistsForDay,
} from "./postToChain";

import { CivilizationEngine } from "./civilization/civilizationEngine";
import { DemiurgeAgent } from "./demiurge/demiurgeAgent";
import { buildSnapshot, postSnapshotToChain } from "./civilization/civSnapshot";

const {
  MANTLE_RPC_URL,
  ORACLE_PRIVATE_KEY,
  ORACLE_MESSAGE_ADDRESS,
  TEMPLE_VAULT_ADDRESS,
  BLESSING_DISTRIBUTOR_ADDRESS,
  USDY_ADDRESS,
  // Per-agent OpenRouter slots (each falls back to OPENROUTER_API_KEY)
  ORACLE_API_KEY,
  ORACLE_MODEL = "google/gemini-2.5-flash",
  EVALUATOR_API_KEY,
  EVALUATOR_MODEL = "google/gemini-2.5-flash",
  DEMIURGE_API_KEY,
  DEMIURGE_MODEL = "anthropic/claude-3-5-sonnet",
  OPENROUTER_API_KEY,
  FULFILLMENT_THRESHOLD = "70",
  CRON_SCHEDULE = "0 0 * * *",

  // Civilization Log & Engine integration
  CIV_LOG_ADDRESS,
  CIV_ENGINE_PRIVATE_KEY,
  CIV_STATE_FILE,
  DEMIURGE_STATE_FILE,
  PROOF_OF_WORSHIP_ADDRESS,
} = process.env;

// Resolve effective keys: per-agent override > shared fallback
const oracleKey = ORACLE_API_KEY || OPENROUTER_API_KEY;
const evaluatorKey = EVALUATOR_API_KEY || OPENROUTER_API_KEY;
const demiurgeKey = DEMIURGE_API_KEY || OPENROUTER_API_KEY;

for (const [k, v] of Object.entries({
  MANTLE_RPC_URL,
  ORACLE_PRIVATE_KEY,
  ORACLE_MESSAGE_ADDRESS,
  TEMPLE_VAULT_ADDRESS,
  BLESSING_DISTRIBUTOR_ADDRESS,
  USDY_ADDRESS,
  CIV_LOG_ADDRESS,
  ORACLE_KEY: oracleKey,
  EVALUATOR_KEY: evaluatorKey,
  DEMIURGE_KEY: demiurgeKey,
})) {
  if (!v) throw new Error(`Missing env var: ${k}`);
}

const provider = new ethers.JsonRpcProvider(MANTLE_RPC_URL);
const signer = new ethers.Wallet(ORACLE_PRIVATE_KEY!, provider);
const civEngineSigner = new ethers.Wallet(CIV_ENGINE_PRIVATE_KEY || ORACLE_PRIVATE_KEY!, provider);

const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://cult-of-the-digital-oracle.vercel.app",
  "X-Title": "Cult of the Digital Oracle",
};

// Three OpenRouter-compatible clients, one per AI role.
const oracleClient = new OpenAI({
  apiKey: oracleKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: OPENROUTER_HEADERS,
  // Free OpenRouter models share an upstream pool and 429 intermittently.
  // The SDK honours Retry-After, so a few retries usually rides out the spike.
  maxRetries: 5,
});
const evaluatorClient = new OpenAI({
  apiKey: evaluatorKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: OPENROUTER_HEADERS,
  maxRetries: 5,
});
const demiurgeClient = new OpenAI({
  apiKey: demiurgeKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: OPENROUTER_HEADERS,
  maxRetries: 5,
});

// Guard against a non-numeric FULFILLMENT_THRESHOLD (e.g. empty/typo'd env) —
// NaN would make `score >= threshold` always false and silently disable blessings.
const parsedThreshold = parseInt(FULFILLMENT_THRESHOLD);
const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 70;

// Blessing yield amount per round (0.5 USDY = 500_000 units @ 6 decimals).
const YIELD_PER_ROUND = ethers.parseUnits("0.5", 6);

// Initialize Civilization & Demiurge managers
const civEngine = new CivilizationEngine(CIV_STATE_FILE);
const demiurge = new DemiurgeAgent(
  demiurgeClient,
  civEngine,
  civEngineSigner,
  CIV_LOG_ADDRESS!,
  DEMIURGE_STATE_FILE,
  DEMIURGE_MODEL
);

async function runOracleCycle() {
  console.log(`\n[${new Date().toISOString()}] Oracle + Civilization cycle starting...`);

  // A. Initialize simulation states
  await civEngine.initialize();
  await demiurge.loadState();

  // chain-time day index — MUST match the contracts' block.timestamp / 1 days.
  // The host clock (Date.now) can be ±1 day off at the UTC-midnight boundary,
  // which is exactly when the cron fires — that desync misfiled the snapshot
  // under a day the evaluator never looked up.
  const latestBlock = await provider.getBlock("latest");
  const currentDay = latestBlock
    ? Math.floor(latestBlock.timestamp / 86400)
    : Math.floor(Date.now() / 86400000);

  // ── 1. Execute scheduled Demiurge tools from yesterday ───────────────────
  try {
    await demiurge.checkAndExecute(currentDay);
  } catch (err) {
    console.warn("Demiurge checkAndExecute skipped:", (err as Error)?.message ?? err);
  }

  // ── 2. Tick civilization and post daily snapshot ─────────────────────────
  let civSnapshot: ReturnType<typeof buildSnapshot> | undefined;
  try {
    await civEngine.tick(currentDay);
    civSnapshot = buildSnapshot(civEngine.getWorldState());
    console.log(`Posting daily civilization snapshot to CivilizationLog.sol (day ${currentDay})...`);
    try {
      const snapHash = await postSnapshotToChain(civEngineSigner, CIV_LOG_ADDRESS!, currentDay, civSnapshot);
      console.log(`Snapshot posted successfully: ${snapHash}`);
    } catch (err: unknown) {
      // One snapshot per UTC day is enforced on-chain (SnapshotAlreadyExists). In
      // DEMO_MODE (30s cron) every cycle after the first of the day reverts here —
      // that's expected. Don't abort the rest of the cycle.
      const msg = (err as { shortMessage?: string; message?: string })?.shortMessage
        ?? (err as { message?: string })?.message ?? String(err);
      console.warn(`Snapshot post skipped (continuing cycle): ${msg}`);
    }
  } catch (err) {
    console.warn("Civilization tick/snapshot skipped:", (err as Error)?.message ?? err);
  }

  // B. Fetch on-chain metrics (eval + prophecy generation both need this)
  let chainData: Awaited<ReturnType<typeof fetchChainData>> | undefined;
  try {
    chainData = await fetchChainData(provider, USDY_ADDRESS!, TEMPLE_VAULT_ADDRESS!);
    console.log("Chain data fetched:", chainData.blockNumber);
    console.log(`Temple: ${chainData.temple.discipleCount} disciples, ${chainData.temple.totalFaithUsdy} USDY staked`);
  } catch (err) {
    console.error("fetchChainData failed — skipping eval + prophecy this cycle:", (err as Error)?.message ?? err);
  }

  // ── 3. Resolve EVERY unresolved prophecy in the backlog (not just yesterday) ─
  // A single missed cron run used to leave a prophecy unresolved forever; scan
  // back a week and clear the whole backlog. Each day is isolated so one failure
  // doesn't block the others.
  if (chainData) {
    let unresolved: { text: string; day: bigint; resolved: boolean }[] = [];
    try {
      unresolved = await getUnresolvedProphecies(provider, ORACLE_MESSAGE_ADDRESS!, 7);
    } catch (err) {
      console.error("Could not scan for unresolved prophecies:", (err as Error)?.message ?? err);
    }
    for (const prop of unresolved) {
      try {
        console.log(`Evaluating prophecy for day ${prop.day}...`);
        let prevCiv: CivSnapshotData | undefined;
        let nextCiv: CivSnapshotData | undefined;
        try {
          const civContract = new ethers.Contract(CIV_LOG_ADDRESS!, [
            "function getSnapshot(uint256 day) external view returns (tuple(bytes32 stateHash, uint32 totalEntities, uint32 totalPopulation, uint64 totalFaith, uint8 dominantFaction, uint8 activeRegions, uint64 snapshotAt) snap)"
          ], provider);
          const s0 = await civContract.getSnapshot(prop.day);
          if (s0.snapshotAt > 0n) prevCiv = { totalEntities: Number(s0.totalEntities), totalPopulation: Number(s0.totalPopulation), totalFaith: s0.totalFaith, dominantFaction: s0.dominantFaction, activeRegions: s0.activeRegions };
          const s1 = await civContract.getSnapshot(prop.day + 1n);
          if (s1.snapshotAt > 0n) nextCiv = { totalEntities: Number(s1.totalEntities), totalPopulation: Number(s1.totalPopulation), totalFaith: s1.totalFaith, dominantFaction: s1.dominantFaction, activeRegions: s1.activeRegions };
        } catch (e) {
          console.warn("Could not retrieve civ snapshots for evaluation:", (e as Error)?.message ?? e);
        }

        const { score, reason, evidence } = await evaluateProphecy(
          evaluatorClient, prop.text, chainData, prevCiv, nextCiv, undefined, EVALUATOR_MODEL
        );
        console.log(`  Score: ${score}/100 - ${reason}`);

        const hash = await resolveProphecy(signer, ORACLE_MESSAGE_ADDRESS!, prop.day, score, reason, evidence);
        console.log(`  Resolved on-chain: ${hash}`);

        // Queue blessing if fulfilled — idempotent: never double-pay a day's yield.
        if (score >= threshold && BLESSING_DISTRIBUTOR_ADDRESS && USDY_ADDRESS) {
          if (await blessingExistsForDay(provider, BLESSING_DISTRIBUTOR_ADDRESS!, prop.day)) {
            console.log(`  Blessing already queued for day ${prop.day} — skipping.`);
          } else {
            console.log(`  Score >= ${threshold} — queueing blessing...`);
            const bHash = await queueBlessing(signer, USDY_ADDRESS!, BLESSING_DISTRIBUTOR_ADDRESS!, prop.day, YIELD_PER_ROUND);
            console.log(`  Blessing queued: ${bHash}`);
          }
        }
      } catch (err) {
        console.error(`  Resolving day ${prop.day} failed (continuing):`, (err as Error)?.message ?? err);
      }
    }
  }

  // ── 4. Post today's prophecy if absent ───────────────────────────────────
  let activeProphecyText = "";
  if (chainData) {
    try {
      const todaysProphecy = await getTodaysProphecy(provider, ORACLE_MESSAGE_ADDRESS!);
      if (todaysProphecy) {
        console.log("Today's prophecy already exists on-chain. Skipping post.");
        activeProphecyText = todaysProphecy.text;
      } else {
        console.log("Generating today's prophecy...");
        const currentCivSnap = civSnapshot
          ? {
              totalEntities: civSnapshot.totalEntities,
              totalPopulation: civSnapshot.totalPopulation,
              totalFaith: civSnapshot.totalFaith,
              dominantFaction: civSnapshot.dominantFaction,
              activeRegions: civSnapshot.activeRegions,
            }
          : undefined;
        // Cap length so a verbose model can't inflate calldata/gas on-chain.
        const prophecyText = (await generateProphecy(oracleClient, chainData, currentCivSnap, ORACLE_MODEL)).slice(0, 280);
        console.log(`  Prophecy: "${prophecyText}"`);
        const { day, txHash } = await postProphecy(signer, ORACLE_MESSAGE_ADDRESS!, prophecyText);
        console.log(`  Posted on-chain (day ${day}): ${txHash}`);
        activeProphecyText = prophecyText;
      }
    } catch (err) {
      console.error("Posting today's prophecy failed:", (err as Error)?.message ?? err);
    }
  }

  // ── 5. Demiurge decide on today's prophecy and post preview on-chain ─────
  if (activeProphecyText) {
    console.log("Demiurge analyzing today's prophecy to schedule tomorrow's divine event...");
    try {
      const preview = await demiurge.decide(activeProphecyText, currentDay);
      console.log(`Demiurge decided. Scheduled for block day ${currentDay + 1}.`);
      
      const prevHash = await demiurge.postPreviewToChain(preview);
      console.log(`Demiurge preview posted on-chain successfully: ${prevHash}`);
    } catch (err) {
      console.error("Demiurge decision failed:", err);
    }
  }

  // ── Refill the Proof of Worship reward pool so sincere prayers never run dry ─
  if (PROOF_OF_WORSHIP_ADDRESS) {
    try {
      const usdyMint = new ethers.Contract(USDY_ADDRESS!, ["function mint(address,uint256) external"], signer);
      await (await usdyMint.mint(PROOF_OF_WORSHIP_ADDRESS, ethers.parseUnits("10", 6))).wait();
      console.log("Worship pool topped up: +10 USDY");
    } catch (e) {
      console.warn("Worship top-up skipped:", (e as Error)?.message ?? e);
    }
  }

  console.log("Oracle + Civilization cycle complete.\n");
}

// ── Run immediately on startup, then on cron ─────────────────────────────────
const DEMO_MODE = (process.env.DEMO_MODE || "").toLowerCase() === "true";
const effectiveCron = DEMO_MODE ? "*/30 * * * * *" : CRON_SCHEDULE;

if (DEMO_MODE) {
  console.log("[DEMO_MODE] cron compressed to every 30 seconds.");
  console.log("[DEMO_MODE] NOTE: the on-chain day boundary is still tied to");
  console.log("[DEMO_MODE] block.timestamp / 1 days, so prophecies still post");
  console.log("[DEMO_MODE] at most once per real UTC day. For a fully time-");
  console.log("[DEMO_MODE] compressed demo, run a local hardhat node with");
  console.log("[DEMO_MODE] `evm_increaseTime` between cycles.");
}

if (!effectiveCron) {
  console.log("Oracle starting (single-run mode).");
  runOracleCycle().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.log(`Oracle starting. Cron: "${effectiveCron}"`);
  runOracleCycle().catch(console.error);
  cron.schedule(effectiveCron, () => {
    runOracleCycle().catch(console.error);
  });
}
