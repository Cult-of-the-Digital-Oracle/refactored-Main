import { ethers } from "hardhat";

// End-to-end check against the LIVE ProofOfWorship: stake a throwaway disciple,
// have the oracle (worshipSigner) sign an EIP-712 WorshipPass for it, then call
// the deployed worship() and confirm USDY is released. Proves the on-chain
// signature path the /api/worship route relies on.
//
//   npx hardhat run scripts/verify-worship.ts --network mantleSepolia
async function main() {
  const [deployer] = await ethers.getSigners();
  const usdyAddr = process.env.USDY_ADDRESS!;
  const vaultAddr = process.env.TEMPLE_VAULT_ADDRESS!;
  const powAddr = process.env.PROOF_OF_WORSHIP_ADDRESS!;

  const usdy = (await ethers.getContractAt("MockUSDY", usdyAddr)) as any;
  const vault = (await ethers.getContractAt("TempleVault", vaultAddr)) as any;
  const pow = (await ethers.getContractAt("ProofOfWorship", powAddr)) as any;

  // 1. spin up + stake a throwaway disciple
  const w = ethers.Wallet.createRandom(ethers.provider);
  await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("0.05") })).wait();
  const stake = ethers.parseUnits("10", 6);
  await (await usdy.mint(w.address, stake)).wait();
  await (await usdy.connect(w).approve(vaultAddr, stake)).wait();
  await (await vault.connect(w).enter(stake)).wait();
  console.log("Disciple staked:", w.address);

  // 2. oracle (= worshipSigner) signs the prayer pass
  const net = await ethers.provider.getNetwork();
  const day = Math.floor(Date.now() / 86400000);
  const score = 91;
  const sig = await deployer.signTypedData(
    { name: "CultProofOfWorship", version: "1", chainId: net.chainId, verifyingContract: powAddr },
    { WorshipPass: [
      { name: "disciple", type: "address" },
      { name: "day", type: "uint256" },
      { name: "score", type: "uint8" },
    ]},
    { disciple: w.address, day, score }
  );

  // 3. call the LIVE contract
  const before = await usdy.balanceOf(w.address);
  const tx = await pow.connect(w).worship(day, score, sig);
  await tx.wait();
  const after = await usdy.balanceOf(w.address);

  console.log("worship tx:        ", tx.hash);
  console.log("USDY released:     ", ethers.formatUnits(after - before, 6));
  console.log("hasWorshipped:     ", await pow.hasWorshipped(w.address, day));
  console.log(((after - before) > 0n) ? "\n✅ End-to-end signature path verified on-chain." : "\n❌ no reward released");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
