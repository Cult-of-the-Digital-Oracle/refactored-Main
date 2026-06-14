import { ethers } from "hardhat";

// Deploys ONLY ProofOfWorship and funds its reward pool. Additive — does not
// touch MockUSDY / OracleMessage / TempleVault / BlessingDistributor / CivilizationLog.
//
//   cd contracts
//   npx hardhat run scripts/deploy-worship.ts --network mantleSepolia
//
// worshipSigner defaults to the deployer (= oracle EOA). The Next.js /api/worship
// route must sign with the matching key (WORSHIP_SIGNER_KEY == ORACLE_PRIVATE_KEY).
// Override with WORSHIP_SIGNER only if you use a dedicated attestation wallet.
async function main() {
  const [deployer] = await ethers.getSigners();
  const usdy = process.env.USDY_ADDRESS;
  const vault = process.env.TEMPLE_VAULT_ADDRESS;
  if (!usdy || !vault) throw new Error("Set USDY_ADDRESS + TEMPLE_VAULT_ADDRESS in contracts/.env");

  const signer = process.env.WORSHIP_SIGNER ?? deployer.address;
  const reward = ethers.parseUnits(process.env.WORSHIP_REWARD ?? "0.1", 6); // USDY per prayer
  const poolFund = ethers.parseUnits(process.env.WORSHIP_POOL ?? "50", 6);

  console.log("Deployer:      ", deployer.address);
  console.log("worshipSigner: ", signer);
  console.log("rewardPerWorship:", ethers.formatUnits(reward, 6), "USDY");

  const ProofOfWorship = await ethers.getContractFactory("ProofOfWorship");
  const pow = await ProofOfWorship.deploy(usdy, vault, signer, reward);
  await pow.waitForDeployment();
  const addr = await pow.getAddress();
  console.log("\n✅ ProofOfWorship deployed:", addr);

  // Fund the reward pool (MockUSDY.mint is open on testnet)
  const token = await ethers.getContractAt("MockUSDY", usdy);
  await (await token.mint(addr, poolFund)).wait();
  console.log("Funded pool:", ethers.formatUnits(poolFund, 6), "USDY");

  // sanity read-backs
  console.log("\n── Verify ─────────────────────────────────");
  console.log("  worshipSigner():    ", await pow.worshipSigner());
  console.log("  rewardPerWorship(): ", ethers.formatUnits(await pow.rewardPerWorship(), 6), "USDY");
  console.log("\n── Set this address in ────────────────────");
  console.log(`  apps/web/.env.local   NEXT_PUBLIC_PROOF_OF_WORSHIP_ADDRESS=${addr}`);
  console.log(`  contracts/.env        PROOF_OF_WORSHIP_ADDRESS=${addr}   (reference)`);
  console.log("────────────────────────────────────────────");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
