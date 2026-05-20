/**
 * Gas benchmark — compares v1 (original) vs v2 (optimized) for every write function.
 * Run: npx hardhat run scripts/gas-bench.ts
 */
import { ethers } from "hardhat";

const SEP = "─".repeat(72);
const rows: { fn: string; v1: number; v2: number; saved: number; pct: string }[] = [];

function record(fn: string, v1: number, v2: number) {
  const saved = v1 - v2;
  const pct = v1 > 0 ? ((saved / v1) * 100).toFixed(1) + "%" : "—";
  rows.push({ fn, v1, v2, saved, pct });
}

async function gas(tx: Promise<{ wait: () => Promise<{ gasUsed: bigint }> }>): Promise<number> {
  const r = await (await tx).wait();
  return Number(r!.gasUsed);
}

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();

  // ── Deploy shared MockUSDY ─────────────────────────────────────────────────
  const USDY = await ethers.getContractFactory("MockUSDY");
  const usdy = await USDY.deploy();
  const usdyAddr = await usdy.getAddress();

  // Give users plenty of USDY
  await usdy.connect(user1).faucet();
  await usdy.connect(user2).faucet();

  // ── V1 — original contracts ────────────────────────────────────────────────
  console.log("\n  Deploying V1 (original)...");

  const OM1 = await ethers.getContractFactory("OracleMessage_v1");
  const om1 = await OM1.deploy(deployer.address);

  const TV1 = await ethers.getContractFactory("TempleVault_v1");
  const tv1 = await TV1.deploy(usdyAddr, deployer.address);
  const tv1Addr = await tv1.getAddress();

  const BD1 = await ethers.getContractFactory("BlessingDistributor_v1");
  const bd1 = await BD1.deploy(usdyAddr, tv1Addr, deployer.address);
  const bd1Addr = await bd1.getAddress();

  // ── V2 — optimized contracts ───────────────────────────────────────────────
  console.log("  Deploying V2 (optimized)...\n");

  const OM2 = await ethers.getContractFactory("OracleMessage");
  const om2 = await OM2.deploy(deployer.address);

  const TV2 = await ethers.getContractFactory("TempleVault");
  const tv2 = await TV2.deploy(usdyAddr, deployer.address);
  const tv2Addr = await tv2.getAddress();

  const BD2 = await ethers.getContractFactory("BlessingDistributor");
  const bd2 = await BD2.deploy(usdyAddr, tv2Addr, deployer.address);
  const bd2Addr = await bd2.getAddress();

  // ── BENCHMARK: OracleMessage ───────────────────────────────────────────────
  const prophecyText = "The chain stirs. Volatile hands reach for leverage beneath a crimson candle. Those who wait shall inherit the next block.";

  const g_post_v1 = await gas(om1.postProphecy(prophecyText));
  const g_post_v2 = await gas(om2.postProphecy(prophecyText));
  record("OracleMessage.postProphecy()", g_post_v1, g_post_v2);

  // Move to next day for resolve (simulate by using day 0 which is already posted)
  // Resolve same day (test only)
  const day = Math.floor(Date.now() / 86400000);
  const g_resolve_v1 = await gas(om1.resolveProphecy(day, 82, "Market moved as foretold", "TVL +4.2%, vol spike detected"));
  const g_resolve_v2 = await gas(om2.resolveProphecy(day, 82, "Market moved as foretold", "TVL +4.2%, vol spike detected"));
  record("OracleMessage.resolveProphecy()", g_resolve_v1, g_resolve_v2);

  // ── BENCHMARK: TempleVault ─────────────────────────────────────────────────
  const STAKE = ethers.parseUnits("100", 6);

  // Approve
  await usdy.connect(user1).approve(tv1Addr, STAKE);
  await usdy.connect(user1).approve(tv2Addr, STAKE);

  const g_enter_v1 = await gas(tv1.connect(user1).enter(STAKE));
  const g_enter_v2 = await gas(tv2.connect(user1).enter(STAKE));
  record("TempleVault.enter()", g_enter_v1, g_enter_v2);

  // checkIn
  const tokenId1 = await tv1.cardOf(user1.address);
  const tokenId2 = await tv2.cardOf(user1.address);

  const g_checkin_v1 = await gas(tv1.connect(user1).checkIn(tokenId1));
  const g_checkin_v2 = await gas(tv2.connect(user1).checkIn(tokenId2));
  record("TempleVault.checkIn()", g_checkin_v1, g_checkin_v2);

  // recordShare
  const g_share_v1 = await gas(tv1.connect(user1).recordShare(tokenId1, "twitter"));
  const g_share_v2 = await gas(tv2.connect(user1).recordShare(tokenId2, "twitter"));
  record("TempleVault.recordShare()", g_share_v1, g_share_v2);

  // exit (burn NFT + unstake)
  // Use user2 for exit so user1 can still claim
  const STAKE2 = ethers.parseUnits("50", 6);
  await usdy.connect(user2).approve(tv1Addr, STAKE2);
  await usdy.connect(user2).approve(tv2Addr, STAKE2);
  await tv1.connect(user2).enter(STAKE2);
  await tv2.connect(user2).enter(STAKE2);
  const tid1_u2 = await tv1.cardOf(user2.address);
  const tid2_u2 = await tv2.cardOf(user2.address);

  const g_exit_v1 = await gas(tv1.connect(user2).exit(tid1_u2));
  const g_exit_v2 = await gas(tv2.connect(user2).exit(tid2_u2));
  record("TempleVault.exit()", g_exit_v1, g_exit_v2);

  // ── BENCHMARK: BlessingDistributor ────────────────────────────────────────
  const YIELD = ethers.parseUnits("0.5", 6);

  // Oracle needs USDY to queue blessing
  await usdy.faucet(); // deployer gets USDY
  await usdy.approve(bd1Addr, YIELD);
  await usdy.approve(bd2Addr, YIELD);

  const g_queue_v1 = await gas(bd1.queueBlessing(day, YIELD));
  const g_queue_v2 = await gas(bd2.queueBlessing(day, YIELD));
  record("BlessingDistributor.queueBlessing()", g_queue_v1, g_queue_v2);

  // Claim
  const g_claim_v1 = await gas(bd1.connect(user1).claim(1, tokenId1));
  const g_claim_v2 = await gas(bd2.connect(user1).claim(1, tokenId2));
  record("BlessingDistributor.claim()", g_claim_v1, g_claim_v2);

  // ── RESULTS ───────────────────────────────────────────────────────────────
  console.log(SEP);
  console.log(
    "  Function".padEnd(38) +
    "V1 (orig)".padStart(10) +
    "V2 (opt)".padStart(10) +
    "Saved".padStart(10) +
    "  %"
  );
  console.log(SEP);

  let totalV1 = 0, totalV2 = 0;
  for (const r of rows) {
    console.log(
      ("  " + r.fn).padEnd(38) +
      r.v1.toLocaleString().padStart(10) +
      r.v2.toLocaleString().padStart(10) +
      r.saved.toLocaleString().padStart(10) +
      ("  " + r.pct).padStart(7)
    );
    totalV1 += r.v1;
    totalV2 += r.v2;
  }

  const totalSaved = totalV1 - totalV2;
  const totalPct = ((totalSaved / totalV1) * 100).toFixed(1);
  console.log(SEP);
  console.log(
    "  TOTAL".padEnd(38) +
    totalV1.toLocaleString().padStart(10) +
    totalV2.toLocaleString().padStart(10) +
    totalSaved.toLocaleString().padStart(10) +
    ("  " + totalPct + "%").padStart(7)
  );
  console.log(SEP);
  console.log(`\n  Gas price ref: 0.001 gwei (Mantle) → ~$0 for most actions on testnet`);
  console.log(`  For mainnet at 0.02 gwei: ${totalSaved} gas ≈ ${(totalSaved * 0.02e-9 * 3000).toFixed(4)} USD saved per full cycle\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
