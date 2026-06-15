import { ethers } from "hardhat";

// Live end-to-end test of the two money paths the gateway test didn't cover:
//   1. Proof of Worship — AI (worshipSigner) signs an EIP-712 WorshipPass, the
//      disciple submits it to release USDY. Mirrors /api/worship + WorshipAltar.
//   2. Blessing claim — oracle queues a pro-rata round, disciple claims a share.
// Fresh throwaway disciple each run, against the LIVE Mantle Sepolia contracts.
//
//   cd contracts
//   npx hardhat run scripts/e2e-money.ts --network mantleSepolia
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ""}`); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function poll<T>(fn: () => Promise<T>, ok: (v: T) => boolean = () => true, tries = 10, delay = 2500): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (ok(v)) return v; last = v; } catch (e) { last = e; }
    await sleep(delay);
  }
  if (last instanceof Error) throw last;
  return last;
}
async function expectRevert(name: string, fn: () => Promise<unknown>, want = "") {
  try { await fn(); failed++; console.log(`  ✗ FAIL: ${name} — expected revert, succeeded`); }
  catch (e: any) {
    const msg = e?.shortMessage ?? e?.reason ?? e?.message ?? String(e);
    passed++;
    const note = want && !new RegExp(want, "i").test(msg) ? ` (expected ${want}; RPC: "${(msg || "").slice(0, 36)}")` : "";
    console.log(`  ✓ ${name} — reverted${note}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  const usdyAddr = process.env.USDY_ADDRESS!;
  const vaultAddr = process.env.TEMPLE_VAULT_ADDRESS!;
  const powAddr = process.env.PROOF_OF_WORSHIP_ADDRESS!;
  const distAddr = process.env.BLESSING_DISTRIBUTOR_ADDRESS!;
  if (!usdyAddr || !vaultAddr || !powAddr || !distAddr) throw new Error("Missing addresses in contracts/.env");

  const usdy = (await ethers.getContractAt("MockUSDY", usdyAddr)) as any;
  const vault = (await ethers.getContractAt("TempleVault", vaultAddr)) as any;
  const pow = (await ethers.getContractAt("ProofOfWorship", powAddr)) as any;
  const dist = (await ethers.getContractAt("BlessingDistributor", distAddr)) as any;

  const stake = ethers.parseUnits("20", 6);
  const w = ethers.Wallet.createRandom(ethers.provider);
  const day = BigInt(Math.floor(Date.now() / 1000 / 86400));

  console.log(`chainId ${chainId} | deployer ${deployer.address}`);
  console.log(`disciple ${w.address} | day ${day}\n`);

  // ── Setup: fresh disciple (faucet -> approve -> enter) ────────────────────
  console.log("Setup — mint a fresh Disciple");
  await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("0.06") })).wait();
  await (await usdy.connect(w).faucet()).wait();
  await (await usdy.connect(w).approve(vaultAddr, stake)).wait();
  await (await vault.connect(w).enter(stake)).wait();
  const tokenId = await poll(() => vault.cardOf(w.address), (v: bigint) => v > 0n);
  check("disciple minted", tokenId > 0n, `tokenId ${tokenId}`);

  // ════════════════ PART 1 — PROOF OF WORSHIP ════════════════
  console.log("\n=== Proof of Worship ===");
  const signer = await pow.worshipSigner();
  const reward = await pow.rewardPerWorship();
  check("worshipSigner == deployer (so we can sign)", signer.toLowerCase() === deployer.address.toLowerCase(), signer);
  console.log(`  reward/worship: ${ethers.formatUnits(reward, 6)} USDY`);

  // ensure the pool can pay (MockUSDY.mint is open) — top up to be safe
  const pool = await usdy.balanceOf(powAddr);
  if (pool < reward * 3n) {
    await (await usdy.mint(powAddr, reward * 5n)).wait();
    console.log(`  topped up worship pool`);
  }

  const domain = { name: "CultProofOfWorship", version: "1", chainId, verifyingContract: powAddr };
  const types = { WorshipPass: [
    { name: "disciple", type: "address" },
    { name: "day", type: "uint256" },
    { name: "score", type: "uint8" },
  ] };
  const score = 88;
  const sig = await deployer.signTypedData(domain, types, { disciple: w.address, day, score });

  // offline recovery sanity
  const recovered = ethers.verifyTypedData(domain, types, { disciple: w.address, day, score }, sig);
  check("offline: signature recovers to worshipSigner", recovered.toLowerCase() === signer.toLowerCase());

  const before = await usdy.balanceOf(w.address);
  await (await pow.connect(w).worship(day, score, sig)).wait();
  const after = await poll(() => usdy.balanceOf(w.address), (v: bigint) => v > before);
  check("worship released exactly rewardPerWorship", after - before === reward, `+${ethers.formatUnits(after - before, 6)} USDY`);
  check("hasWorshipped(disciple, day) == true", await poll(() => pow.hasWorshipped(w.address, day), (v: boolean) => v === true));

  await expectRevert("double worship same day reverts", () => pow.connect(w).worship(day, score, sig), "AlreadyWorshipped");

  // forged pass: disciple self-signs a different day -> recover != worshipSigner
  const sigForged = await w.signTypedData(domain, types, { disciple: w.address, day: day + 1n, score });
  await expectRevert("forged signature reverts", () => pow.connect(w).worship(day + 1n, score, sigForged), "BadPrayerPass");

  // non-disciple with a VALID signer pass -> NotDisciple
  const stranger = ethers.Wallet.createRandom(ethers.provider);
  await (await deployer.sendTransaction({ to: stranger.address, value: ethers.parseEther("0.03") })).wait();
  const sigStranger = await deployer.signTypedData(domain, types, { disciple: stranger.address, day, score });
  await expectRevert("non-disciple worship reverts", () => pow.connect(stranger).worship(day, score, sigStranger), "NotDisciple");

  // ════════════════ PART 2 — BLESSING CLAIM ════════════════
  console.log("\n=== Blessing Claim ===");
  const isOracle = (await dist.oracle()).toLowerCase() === deployer.address.toLowerCase();
  check("deployer is the distributor oracle (can queue)", isOracle);

  const yieldAmt = ethers.parseUnits("5", 6);
  await (await usdy.mint(deployer.address, yieldAmt)).wait();
  await (await usdy.approve(distAddr, yieldAmt)).wait();
  await (await dist.queueBlessing(day, yieldAmt)).wait();
  const roundId = (await dist.nextRoundId()) - 1n;
  check("round queued", roundId > 0n, `roundId ${roundId}`);

  const pending = await poll(() => dist.pendingBlessing(roundId, tokenId), (v: bigint) => v > 0n);
  check("pendingBlessing > 0 for our disciple", pending > 0n, `${ethers.formatUnits(pending, 6)} USDY`);

  // verify pro-rata math: share == stake * pool / totalFaithSnap
  const round = await dist.rounds(roundId);
  const expectShare = (stake * round.yieldPool) / round.totalFaithSnap;
  check("pending matches pro-rata formula", pending === expectShare, `got ${pending} want ${expectShare}`);

  const cBefore = await usdy.balanceOf(w.address);
  await (await dist.connect(w).claim(roundId, tokenId)).wait();
  const cAfter = await poll(() => usdy.balanceOf(w.address), (v: bigint) => v > cBefore);
  check("claim paid the pending share", cAfter - cBefore === pending, `+${ethers.formatUnits(cAfter - cBefore, 6)} USDY`);

  await expectRevert("double claim reverts", () => dist.connect(w).claim(roundId, tokenId), "AlreadyClaimed");

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
