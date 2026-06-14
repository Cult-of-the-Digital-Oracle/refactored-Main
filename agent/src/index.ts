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
  getYesterdayProphecy,
  getTodaysProphecy,
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
});
const evaluatorClient = new OpenAI({
  apiKey: evaluatorKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: OPENROUTER_HEADERS,
});
const demiurgeClient = new OpenAI({
  apiKey: demiurgeKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: OPENROUTER_HEADERS,
});

const threshold = parseInt(FULFILLMENT_THRESHOLD);

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

  const currentDay = Math.floor(Date.now() / 86400000);

  // ── 1. Execute scheduled Demiurge tools from yesterday ───────────────────
  await demiurge.checkAndExecute(currentDay);

  // ── 2. Tick civilization and post daily snapshot ─────────────────────────
  await civEngine.tick(currentDay);
  const worldState = civEngine.getWorldState();
  const civSnapshot = buildSnapshot(worldState);
  
  console.log(`Posting daily civilization snapshot to CivilizationLog.sol (day ${currentDay})...`);
  try {
    const snapHash = await postSnapshotToChain(civEngineSigner, CIV_LOG_ADDRESS!, currentDay, civSnapshot);
    console.log(`Snapshot posted successfully: ${snapHash}`);
  } catch (err: unknown) {
    // One snapshot per UTC day is enforced on-chain (SnapshotAlreadyExists). In
    // DEMO_MODE (30s cron) every cycle after the first of the day reverts here —
    // that's expected. Don't abort the rest of the cycle (eval/prophecy/demiurge).
    const msg = (err as { shortMessage?: string; message?: string })?.shortMessage
      ?? (err as { message?: string })?.message ?? String(err);
    console.warn(`Snapshot post skipped (continuing cycle): ${msg}`);
  }

  // B. Fetch on-chain metrics
  const chainData = await fetchChainData(provider, USDY_ADDRESS!, TEMPLE_VAULT_ADDRESS!);
  console.log("Chain data fetched:", chainData.blockNumber);
  console.log(`Temple: ${chainData.temple.discipleCount} disciples, ${chainData.temple.totalFaithUsdy} USDY staked`);

  // ── 3. Evaluate yesterday's prophecy ────────────────────────────────────
  const yesterday = await getYesterdayProphecy(provider, ORACLE_MESSAGE_ADDRESS!);
  if (yesterday && !yesterday.resolved) {
    console.log(`Evaluating yesterday's prophecy for day ${yesterday.day}...`);
    
    // Fetch yesterday's and today's civilization snapshots from smart contract
    let yesterdayCivSnapshot: CivSnapshotData | undefined;
    let todayCivSnapshot: CivSnapshotData | undefined;
    try {
      const civContract = new ethers.Contract(CIV_LOG_ADDRESS!, [
        "function getSnapshot(uint256 day) external view returns (tuple(bytes32 stateHash, uint32 totalEntities, uint32 totalPopulation, uint64 totalFaith, uint8 dominantFaction, uint8 activeRegions, uint64 snapshotAt) snap)"
      ], provider);
      
      const yesterdayDay = yesterday.day;
      const yesterdaySnap = await civContract.getSnapshot(yesterdayDay);
      if (yesterdaySnap.snapshotAt > 0n) {
        yesterdayCivSnapshot = {
          totalEntities: Number(yesterdaySnap.totalEntities),
          totalPopulation: Number(yesterdaySnap.totalPopulation),
          totalFaith: yesterdaySnap.totalFaith,
          dominantFaction: yesterdaySnap.dominantFaction,
          activeRegions: yesterdaySnap.activeRegions
        };
      }

      const todaySnap = await civContract.getSnapshot(yesterdayDay + 1n);
      if (todaySnap.snapshotAt > 0n) {
        todayCivSnapshot = {
          totalEntities: Number(todaySnap.totalEntities),
          totalPopulation: Number(todaySnap.totalPopulation),
          totalFaith: todaySnap.totalFaith,
          dominantFaction: todaySnap.dominantFaction,
          activeRegions: todaySnap.activeRegions
        };
      }
    } catch (e) {
      console.warn("Could not retrieve civilization snapshots from log for evaluation:", e);
    }

    const { score, reason, evidence } = await evaluateProphecy(
      evaluatorClient,
      yesterday.text,
      chainData,
      yesterdayCivSnapshot,
      todayCivSnapshot,
      undefined,
      EVALUATOR_MODEL
    );
    console.log(`  Score: ${score}/100 - ${reason}`);

    const hash = await resolveProphecy(
      signer,
      ORACLE_MESSAGE_ADDRESS!,
      yesterday.day,
      score,
      reason,
      evidence
    );
    console.log(`  Resolved on-chain: ${hash}`);

    // Queue blessing if fulfilled above threshold
    if (score >= threshold && BLESSING_DISTRIBUTOR_ADDRESS && USDY_ADDRESS) {
      console.log(`  Score >= ${threshold} — queueing blessing...`);
      const bHash = await queueBlessing(
        signer,
        USDY_ADDRESS!,
        BLESSING_DISTRIBUTOR_ADDRESS!,
        yesterday.day,
        YIELD_PER_ROUND
      );
      console.log(`  Blessing queued: ${bHash}`);
    }
  }

  // ── 4. Post today's prophecy if absent ───────────────────────────────────
  const todaysProphecy = await getTodaysProphecy(provider, ORACLE_MESSAGE_ADDRESS!);
  let activeProphecyText = "";

  if (todaysProphecy) {
    console.log("Today's prophecy already exists on-chain. Skipping post.");
    activeProphecyText = todaysProphecy.text;
  } else {
    console.log("Generating today's prophecy...");
    const currentCivSnap = {
      totalEntities: civSnapshot.totalEntities,
      totalPopulation: civSnapshot.totalPopulation,
      totalFaith: civSnapshot.totalFaith,
      dominantFaction: civSnapshot.dominantFaction,
      activeRegions: civSnapshot.activeRegions
    };
    
    const prophecyText = await generateProphecy(oracleClient, chainData, currentCivSnap, ORACLE_MODEL);
    console.log(`  Prophecy: "${prophecyText}"`);

    const { day, txHash } = await postProphecy(signer, ORACLE_MESSAGE_ADDRESS!, prophecyText);
    console.log(`  Posted on-chain (day ${day}): ${txHash}`);
    activeProphecyText = prophecyText;
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
