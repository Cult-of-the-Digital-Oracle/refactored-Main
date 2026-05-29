// Manual divine event trigger — fires a single DivineEvent into CivilizationLog
// for live demos. Useful when judges are watching but the daily Demiurge cron
// hasn't fired yet.
//
// Usage:
//   npx tsx scripts/demoTriggerEvent.ts <toolId> [targetRegion] [magnitude]
//
// toolId:        0-9   (see agent/src/demiurge/divineTools.ts)
//                       0-4 = good (polarity=1), 5-9 = evil (polarity=0)
// targetRegion:  0-254  (region index)        — default 255 = global
// magnitude:     0-1000 (intensity, scaled)   — default 500

import "dotenv/config";
import { ethers } from "ethers";
import { postDivineEventToChain } from "../src/civilization/civSnapshot";

const TOOL_NAMES = [
  'Blessing Rain', 'Bountiful Harvest', 'Spawn Missionaries', 'Found Settlement',
  'Shield of Faith', 'Meteor Strike', 'Plague Wave', 'Orc Horde',
  'Famine', 'Whisper Apostasy',
];

async function main() {
  const [toolIdArg, regionArg, magnitudeArg] = process.argv.slice(2);
  if (!toolIdArg) {
    console.error("Usage: tsx scripts/demoTriggerEvent.ts <toolId 0-9> [region 0-254] [magnitude 0-1000]");
    process.exit(1);
  }
  const toolId = parseInt(toolIdArg, 10);
  const targetRegion = regionArg ? parseInt(regionArg, 10) : 255;
  const magnitude = magnitudeArg ? parseInt(magnitudeArg, 10) : 500;

  if (Number.isNaN(toolId) || toolId < 0 || toolId > 9) {
    console.error(`toolId must be 0-9, got "${toolIdArg}"`);
    process.exit(1);
  }

  const { MANTLE_RPC_URL, CIV_LOG_ADDRESS, CIV_ENGINE_PRIVATE_KEY, ORACLE_PRIVATE_KEY } = process.env;
  if (!MANTLE_RPC_URL || !CIV_LOG_ADDRESS) {
    console.error("Missing MANTLE_RPC_URL or CIV_LOG_ADDRESS in .env");
    process.exit(1);
  }
  const pk = CIV_ENGINE_PRIVATE_KEY || ORACLE_PRIVATE_KEY;
  if (!pk) {
    console.error("Missing CIV_ENGINE_PRIVATE_KEY (or ORACLE_PRIVATE_KEY fallback) in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(MANTLE_RPC_URL);
  const signer = new ethers.Wallet(pk, provider);

  const polarity = toolId < 5 ? 1 : 0;
  console.log(`Posting divine event: ${TOOL_NAMES[toolId]} (${polarity === 1 ? 'good' : 'evil'})`);
  console.log(`  Target region: ${targetRegion === 255 ? 'GLOBAL' : `region #${targetRegion}`}`);
  console.log(`  Magnitude: ${magnitude}`);

  const hash = await postDivineEventToChain(signer, CIV_LOG_ADDRESS, {
    toolId,
    polarity,
    executedAt: Math.floor(Date.now() / 1000),
    targetRegion,
    magnitude,
  });
  console.log(`Posted on-chain — tx: ${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
