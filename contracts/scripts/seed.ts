/**
 * Seed the yield pool for demo purposes.
 * Run after deploy: npx hardhat run scripts/seed.ts --network mantleSepolia
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const USDY = process.env.USDY_ADDRESS!;
  const DISTRIBUTOR = process.env.BLESSING_DISTRIBUTOR_ADDRESS!;
  const SEED_AMOUNT = ethers.parseUnits(process.env.SEED_AMOUNT ?? "500", 6); // 500 USDY default

  const usdy = await ethers.getContractAt("MockUSDY", USDY);
  const distributor = await ethers.getContractAt("BlessingDistributor", DISTRIBUTOR);

  console.log("Minting USDY to deployer...");
  await (await usdy.mint(deployer.address, SEED_AMOUNT)).wait();

  console.log("Approving distributor...");
  await (await usdy.approve(DISTRIBUTOR, SEED_AMOUNT)).wait();

  console.log(`Seeding ${ethers.formatUnits(SEED_AMOUNT, 6)} USDY into BlessingDistributor...`);
  await (await distributor.seedYield(SEED_AMOUNT)).wait();

  console.log("Yield pool seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
