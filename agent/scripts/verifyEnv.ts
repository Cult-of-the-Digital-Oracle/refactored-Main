// Pre-flight check — ensures every key the agent needs to run end-to-end is set.
// Run before the first `npm run dev` to catch missing env vars early.
//
//   npx tsx scripts/verifyEnv.ts

import "dotenv/config";
import { ethers } from "ethers";

interface Check {
  name: string;
  required: boolean;
  value?: string;
  note?: string;
}

const env = process.env;
const oracleKey = env.ORACLE_API_KEY || env.OPENROUTER_API_KEY;
const evaluatorKey = env.EVALUATOR_API_KEY || env.OPENROUTER_API_KEY;
const demiurgeKey = env.DEMIURGE_API_KEY || env.OPENROUTER_API_KEY;

const checks: Check[] = [
  { name: "MANTLE_RPC_URL", required: true, value: env.MANTLE_RPC_URL },
  { name: "ORACLE_PRIVATE_KEY", required: true, value: env.ORACLE_PRIVATE_KEY ? "(set)" : "" },
  { name: "ORACLE_MESSAGE_ADDRESS", required: true, value: env.ORACLE_MESSAGE_ADDRESS },
  { name: "TEMPLE_VAULT_ADDRESS", required: true, value: env.TEMPLE_VAULT_ADDRESS },
  { name: "BLESSING_DISTRIBUTOR_ADDRESS", required: true, value: env.BLESSING_DISTRIBUTOR_ADDRESS },
  { name: "USDY_ADDRESS", required: true, value: env.USDY_ADDRESS },
  { name: "CIV_LOG_ADDRESS", required: true, value: env.CIV_LOG_ADDRESS },
  { name: "Oracle key (ORACLE_API_KEY or OPENROUTER_API_KEY)", required: true, value: oracleKey ? "(set)" : "" },
  { name: "Evaluator key (EVALUATOR_API_KEY or OPENROUTER_API_KEY)", required: true, value: evaluatorKey ? "(set)" : "" },
  { name: "Demiurge key (DEMIURGE_API_KEY or OPENROUTER_API_KEY)", required: true, value: demiurgeKey ? "(set)" : "" },
  { name: "ORACLE_MODEL", required: false, value: env.ORACLE_MODEL || "google/gemini-2.5-flash (default)" },
  { name: "EVALUATOR_MODEL", required: false, value: env.EVALUATOR_MODEL || "google/gemini-2.5-flash (default)" },
  { name: "DEMIURGE_MODEL", required: false, value: env.DEMIURGE_MODEL || "anthropic/claude-3-5-sonnet (default)" },
  { name: "CIV_ENGINE_PRIVATE_KEY", required: false, value: env.CIV_ENGINE_PRIVATE_KEY ? "(set)" : "(falls back to ORACLE_PRIVATE_KEY)" },
  { name: "DEMO_MODE", required: false, value: env.DEMO_MODE || "false (production cadence)" },
];

console.log("=== Env vars ===");
let missing = 0;
for (const c of checks) {
  const ok = !!c.value;
  const tag = ok ? "✓" : c.required ? "✗" : "•";
  console.log(`  ${tag} ${c.name}: ${c.value || "(missing)"}`);
  if (c.required && !ok) missing++;
}

if (missing > 0) {
  console.error(`\n${missing} required env var(s) missing. Fill .env and retry.`);
  process.exit(1);
}

// Touch the RPC + verify private key produces a valid address with a balance
console.log("\n=== Connectivity ===");
(async () => {
  try {
    const provider = new ethers.JsonRpcProvider(env.MANTLE_RPC_URL!);
    const net = await provider.getNetwork();
    console.log(`  ✓ RPC reachable — chainId ${net.chainId}`);

    const wallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY!, provider);
    const bal = await provider.getBalance(wallet.address);
    const mnt = ethers.formatEther(bal);
    console.log(`  ✓ Oracle wallet: ${wallet.address}`);
    console.log(`     Balance: ${mnt} MNT  ${parseFloat(mnt) < 0.05 ? "(LOW — top up before running)" : ""}`);

    // Check CIV_LOG contract exists at the address
    const code = await provider.getCode(env.CIV_LOG_ADDRESS!);
    if (code === "0x") {
      console.warn(`  ✗ CIV_LOG_ADDRESS has no code on chain — re-deploy or fix env`);
    } else {
      console.log(`  ✓ CIV_LOG_ADDRESS points to deployed contract`);
    }
  } catch (err) {
    console.error("  ✗ Connectivity failed:", err);
    process.exit(1);
  }

  console.log("\nAll set — run `npm run dev` (or DEMO_MODE=true for fast cron).");
})();
