import { ethers } from "hardhat";

// Deploys ONLY CivilizationLog — leaves the 4 already-live contracts
// (MockUSDY / OracleMessage / TempleVault / BlessingDistributor) untouched.
//
//   cd contracts
//   npx hardhat run scripts/deploy-civlog.ts --network mantleSepolia
//
// civEngine (the sole authorized writer) defaults to the deployer EOA. The agent
// signs civ writes with CIV_ENGINE_PRIVATE_KEY || ORACLE_PRIVATE_KEY, so as long
// as the deployer == oracle wallet (it is), no NotCivEngine reverts. Override with
// CIV_ENGINE_ADDRESS only if a dedicated writer wallet is used.
async function main() {
  const [deployer] = await ethers.getSigners();
  const civEngine = process.env.CIV_ENGINE_ADDRESS ?? deployer.address;

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(bal), "MNT");
  console.log("CivEngine (authorized writer):", civEngine);

  if (bal === 0n) throw new Error("Deployer has 0 MNT — top up gas first.");

  console.log("\nDeploying CivilizationLog...");
  const CivilizationLog = await ethers.getContractFactory("CivilizationLog");
  const civLog = await CivilizationLog.deploy(civEngine);
  await civLog.waitForDeployment();
  const addr = await civLog.getAddress();

  console.log("\n✅ CivilizationLog deployed:", addr);

  // Read-back sanity (proves the contract is live + civEngine wired correctly)
  console.log("\n── Verify reads ───────────────────────────");
  console.log("  civEngine():          ", await civLog.civEngine());
  console.log("  totalSnapshotCount(): ", (await civLog.totalSnapshotCount()).toString());
  console.log("  getDivineEventCount():", (await civLog.getDivineEventCount()).toString());

  console.log("\n── Set this address in ────────────────────");
  console.log(`  agent/.env            CIV_LOG_ADDRESS=${addr}`);
  console.log(`  apps/web/.env.local   NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS=${addr}`);
  console.log(`  contracts/.env        CIV_LOG_ADDRESS=${addr}   (optional reference)`);
  console.log("────────────────────────────────────────────");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
