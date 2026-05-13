import "dotenv/config";
import cron from "node-cron";
import { ethers } from "ethers";
import OpenAI from "openai";

import { fetchChainData } from "./fetchChainData";
import { generateProphecy } from "./generateProphecy";
import { evaluateProphecy } from "./evaluateProphecy";
import {
  postProphecy,
  resolveProphecy,
  queueBlessing,
  getYesterdayProphecy,
  getTodaysProphecy,
} from "./postToChain";

const {
  MANTLE_RPC_URL,
  ORACLE_PRIVATE_KEY,
  ORACLE_MESSAGE_ADDRESS,
  TEMPLE_VAULT_ADDRESS: _vaultAddr,
  BLESSING_DISTRIBUTOR_ADDRESS,
  USDY_ADDRESS,
  GROQ_API_KEY,
  FULFILLMENT_THRESHOLD = "70",
  CRON_SCHEDULE = "0 0 * * *",
} = process.env;

for (const [k, v] of Object.entries({
  MANTLE_RPC_URL,
  ORACLE_PRIVATE_KEY,
  ORACLE_MESSAGE_ADDRESS,
  BLESSING_DISTRIBUTOR_ADDRESS,
  USDY_ADDRESS,
  GROQ_API_KEY,
})) {
  if (!v) throw new Error(`Missing env var: ${k}`);
}

const provider = new ethers.JsonRpcProvider(MANTLE_RPC_URL);
const signer = new ethers.Wallet(ORACLE_PRIVATE_KEY!, provider);
const openai = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const threshold = parseInt(FULFILLMENT_THRESHOLD);

// Blessing yield amount per round (0.5 USDY = 500_000 units @ 6 decimals).
// Adjust based on pre-seeded pool.
const YIELD_PER_ROUND = ethers.parseUnits("0.5", 6);

async function runOracleCycle() {
  console.log(`\n[${new Date().toISOString()}] Oracle cycle starting...`);

  const chainData = await fetchChainData(provider, USDY_ADDRESS);
  console.log("Chain data fetched:", chainData.blockNumber);

  // ── 1. Evaluate yesterday's prophecy ─────────────────────────────────────
  const yesterday = await getYesterdayProphecy(provider, ORACLE_MESSAGE_ADDRESS!);
  if (yesterday && !yesterday.resolved) {
    console.log("Evaluating yesterday's prophecy...");
    const { score, reason, evidence } = await evaluateProphecy(openai, yesterday.text, chainData);
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
        USDY_ADDRESS,
        BLESSING_DISTRIBUTOR_ADDRESS,
        yesterday.day,
        YIELD_PER_ROUND
      );
      console.log(`  Blessing queued: ${bHash}`);
    }
  }

  // ── 2. Post today's prophecy if absent ────────────────────────────────────
  const todaysProphecy = await getTodaysProphecy(provider, ORACLE_MESSAGE_ADDRESS!);
  if (todaysProphecy) {
    console.log("Today's prophecy already exists on-chain. Skipping post.");
  } else {
    console.log("Generating today's prophecy...");
    const prophecyText = await generateProphecy(openai, chainData);
    console.log(`  Prophecy: "${prophecyText}"`);

    const { day, txHash } = await postProphecy(signer, ORACLE_MESSAGE_ADDRESS!, prophecyText);
    console.log(`  Posted on-chain (day ${day}): ${txHash}`);
  }

  console.log("Oracle cycle complete.\n");
}

// ── Run immediately on startup, then on cron ─────────────────────────────────
console.log(`Oracle starting. Cron: "${CRON_SCHEDULE}"`);
runOracleCycle().catch(console.error);

cron.schedule(CRON_SCHEDULE, () => {
  runOracleCycle().catch(console.error);
});
