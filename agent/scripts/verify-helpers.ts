import "dotenv/config";
import { ethers } from "ethers";
import { getUnresolvedProphecies, blessingExistsForDay } from "../src/postToChain";

// Verifies the new agent read-helpers against the LIVE chain (no LLM needed):
//   - chain-time day derivation (the CRITICAL fix)
//   - getUnresolvedProphecies backlog scan
//   - blessingExistsForDay idempotency check
//   cd agent && npx tsx scripts/verify-helpers.ts
async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.MANTLE_RPC_URL);
  const ORACLE = process.env.ORACLE_MESSAGE_ADDRESS!;
  const DIST = process.env.BLESSING_DISTRIBUTOR_ADDRESS!;

  const latest = await provider.getBlock("latest");
  const chainDay = Math.floor(latest!.timestamp / 86400);
  const hostDay = Math.floor(Date.now() / 86400000);
  console.log(`chainDay (block): ${chainDay} | hostDay (Date.now): ${hostDay} | match: ${chainDay === hostDay}`);

  const unresolved = await getUnresolvedProphecies(provider, ORACLE, 7);
  console.log(`\nunresolved prophecies (last 7 days): ${unresolved.length}`);
  for (const u of unresolved) console.log(`  day ${u.day}: "${u.text.slice(0, 56)}…"`);

  // day 20619 had a blessing round queued by e2e-money.ts
  const hasReal = await blessingExistsForDay(provider, DIST, 20619n);
  const hasNone = await blessingExistsForDay(provider, DIST, 99999n);
  console.log(`\nblessingExistsForDay(20619): ${hasReal}  (expect true)`);
  console.log(`blessingExistsForDay(99999): ${hasNone}  (expect false)`);

  const ok = hasReal === true && hasNone === false;
  console.log(`\n=== ${ok ? "PASS" : "FAIL"} ===`);
  if (!ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
