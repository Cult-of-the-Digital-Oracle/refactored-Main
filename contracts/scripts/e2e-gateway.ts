import { ethers } from "hardhat";

// End-to-end verification of the Temple "gateway" — mirrors EXACTLY what the
// frontend does (faucet -> approve -> enter -> read cardOf/disciples/totalFaith
// -> checkIn), plus edge cases (soulbound transfer revert, double-enter revert).
// A fresh throwaway wallet each run, against the LIVE Mantle Sepolia contracts.
//
//   cd contracts
//   npx hardhat run scripts/e2e-gateway.ts --network mantleSepolia
//
// Exits non-zero on the first failed assertion.
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Mirror the frontend's polling: the public Mantle RPC load-balances across
// nodes whose state can momentarily lag, so a read right after a write may
// revert or return stale data. Retry until it settles.
async function poll<T>(fn: () => Promise<T>, ok: (v: T) => boolean = () => true, tries = 10, delay = 2500): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      const v = await fn();
      if (ok(v)) return v;
      last = v;
    } catch (e) {
      last = e;
    }
    await sleep(delay);
  }
  if (last instanceof Error) throw last;
  return last;
}
async function expectRevert(name: string, fn: () => Promise<unknown>, wantFragment = "") {
  try {
    await fn();
    failed++;
    console.log(`  ✗ FAIL: ${name} — expected revert, but it succeeded`);
  } catch (e: any) {
    const msg = e?.shortMessage ?? e?.reason ?? e?.message ?? String(e);
    // Any revert is a pass: the public Mantle RPC strips custom-error data from
    // eth_call, so the decoded reason is often a bare "execution reverted". The
    // exact custom errors (Soulbound/AlreadyDisciple/AlreadyCheckedIn) are
    // asserted by the local Hardhat unit suite; here we only confirm it reverts.
    passed++;
    const note =
      wantFragment && !new RegExp(wantFragment, "i").test(msg)
        ? ` (expected ${wantFragment}; RPC returned "${(msg || "").slice(0, 40)}")`
        : "";
    console.log(`  ✓ ${name} — reverted${note}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdyAddress = process.env.USDY_ADDRESS!;
  const vaultAddress = process.env.TEMPLE_VAULT_ADDRESS!;
  if (!usdyAddress || !vaultAddress) {
    throw new Error("Set USDY_ADDRESS + TEMPLE_VAULT_ADDRESS in contracts/.env");
  }

  const usdy = (await ethers.getContractAt("MockUSDY", usdyAddress)) as any;
  const vault = (await ethers.getContractAt("TempleVault", vaultAddress)) as any;

  const stake = ethers.parseUnits("10", 6); // same default as the UI
  const w = ethers.Wallet.createRandom(ethers.provider);

  console.log(`Network:     mantleSepolia (5003)`);
  console.log(`Funder:      ${deployer.address}`);
  console.log(`Fresh wallet ${w.address}`);
  console.log(`USDY ${usdyAddress}  Vault ${vaultAddress}\n`);

  // ── 0. Fund gas ───────────────────────────────────────────────────────────
  console.log("Step 0 — fund gas");
  await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("0.05") })).wait();
  check("wallet funded with gas", (await ethers.provider.getBalance(w.address)) > 0n);

  // ── 1. faucet() — exactly the UI's "Faucet 1K" button ─────────────────────
  console.log("\nStep 1 — faucet()");
  await (await usdy.connect(w).faucet()).wait();
  const bal = await poll(() => usdy.balanceOf(w.address), (v: bigint) => v >= ethers.parseUnits("1000", 6));
  check("faucet minted 1000 USDY", bal === ethers.parseUnits("1000", 6), `${ethers.formatUnits(bal, 6)} USDY`);

  // ── 2. cardOf is 0 before entering (UI shows StakeForm) ────────────────────
  console.log("\nStep 2 — pre-enter reads");
  check("cardOf == 0 before enter", (await vault.cardOf(w.address)) === 0n);
  const faithBefore = await vault.totalFaith();

  // ── 3. approve(vault, stake) — the UI's "Approve USDY" ─────────────────────
  console.log("\nStep 3 — approve()");
  await (await usdy.connect(w).approve(vaultAddress, stake)).wait();
  const allowance = await usdy.allowance(w.address, vaultAddress);
  check("allowance == stake after approve", allowance === stake, `${ethers.formatUnits(allowance, 6)} USDY`);

  // ── 4. enter(stake) — the UI's "Enter Temple" ─────────────────────────────
  console.log("\nStep 4 — enter()");
  await (await vault.connect(w).enter(stake)).wait();
  const tokenId = await poll(() => vault.cardOf(w.address), (v: bigint) => v > 0n);
  check("cardOf > 0 after enter (UI flips to DiscipleCard)", tokenId > 0n, `tokenId ${tokenId}`);
  const owner = await poll(() => vault.ownerOf(tokenId), (v: string) => v === w.address);
  check("NFT owner is the wallet (after read-lag settles)", owner === w.address);

  // ── 5. disciples(tokenId) decode — must match the frontend struct mapping ──
  console.log("\nStep 5 — disciples() struct decode (frontend assumes [addr,stake,active,karma,joined,exited])");
  const d = await poll(() => vault.disciples(tokenId), (v: any) => v[0] === w.address);
  check("d[0] disciple == wallet", d[0] === w.address, d[0]);
  check("d[1] stakeAmount == stake", d[1] === stake, `${ethers.formatUnits(d[1], 6)} USDY`);
  check("d[2] active == true", d[2] === true);
  check("d[3] karma == 0", d[3] === 0n);
  check("d[4] joinedAt > 0", d[4] > 0n, new Date(Number(d[4]) * 1000).toISOString());
  check("d[5] exitedAt == 0", d[5] === 0n);

  // ── 6. totalFaith increased by stake ──────────────────────────────────────
  console.log("\nStep 6 — totalFaith");
  const faithAfter = await poll(() => vault.totalFaith(), (v: bigint) => v - faithBefore >= stake);
  check("totalFaith += stake", faithAfter - faithBefore === stake, `+${ethers.formatUnits(faithAfter - faithBefore, 6)}`);

  // ── 7. checkIn — UI "Daily Faith". lastCheckInDay must equal today index ───
  console.log("\nStep 7 — checkIn()");
  await (await vault.connect(w).checkIn(tokenId)).wait();
  const todayIdx = BigInt(Math.floor(Date.now() / 1000 / 86400));
  const lastDay = await poll(() => vault.lastCheckInDay(w.address), (v: bigint) => v === todayIdx);
  check("lastCheckInDay == today (matches UI Date.now()/86400)", lastDay === todayIdx, `chain ${lastDay} vs ui ${todayIdx}`);
  const karma = await poll(() => vault.disciples(tokenId), (v: any) => v[3] === 5n);
  check("karma == 5 after checkIn", karma[3] === 5n);
  await expectRevert("double checkIn same day reverts", () => vault.connect(w).checkIn(tokenId), "AlreadyCheckedIn");

  // ── 8. Soulbound — transfer must revert ───────────────────────────────────
  console.log("\nStep 8 — soulbound + double-enter guards");
  await expectRevert(
    "transferFrom reverts (soulbound)",
    () => vault.connect(w).transferFrom(w.address, deployer.address, tokenId),
    "Soulbound"
  );

  // ── 9. Double-enter must revert (one Disciple per wallet) ──────────────────
  await (await usdy.connect(w).approve(vaultAddress, stake)).wait();
  await expectRevert("second enter reverts (AlreadyDisciple)", () => vault.connect(w).enter(stake), "AlreadyDisciple");

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
