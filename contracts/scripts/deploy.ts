import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MNT");

  // For Mantle Sepolia, USDY testnet address. Use mock if not available.
  const USDY_ADDRESS = process.env.USDY_ADDRESS ?? "";
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS ?? deployer.address;

  let usdyAddress = USDY_ADDRESS;

  // Deploy mock USDY if no real address provided
  if (!usdyAddress) {
    console.log("\nNo USDY_ADDRESS — deploying MockUSDY...");
    const Mock = await ethers.getContractFactory("MockUSDY");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    usdyAddress = await mock.getAddress();
    console.log("MockUSDY:", usdyAddress);
  }

  // 1. OracleMessage
  console.log("\nDeploying OracleMessage...");
  const OracleMessage = await ethers.getContractFactory("OracleMessage");
  const oracle = await OracleMessage.deploy(ORACLE_ADDRESS);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("OracleMessage:", oracleAddr);

  // 2. TempleVault
  console.log("Deploying TempleVault...");
  const TempleVault = await ethers.getContractFactory("TempleVault");
  const vault = await TempleVault.deploy(usdyAddress, ORACLE_ADDRESS);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("TempleVault:", vaultAddr);

  // 3. BlessingDistributor
  console.log("Deploying BlessingDistributor...");
  const BlessingDistributor = await ethers.getContractFactory("BlessingDistributor");
  const distributor = await BlessingDistributor.deploy(usdyAddress, vaultAddr, ORACLE_ADDRESS);
  await distributor.waitForDeployment();
  const distributorAddr = await distributor.getAddress();
  console.log("BlessingDistributor:", distributorAddr);

  // 4. CivilizationLog
  const CIV_ENGINE_ADDRESS = process.env.CIV_ENGINE_ADDRESS ?? deployer.address;
  console.log("Deploying CivilizationLog...");
  const CivilizationLog = await ethers.getContractFactory("CivilizationLog");
  const civLog = await CivilizationLog.deploy(CIV_ENGINE_ADDRESS);
  await civLog.waitForDeployment();
  const civLogAddr = await civLog.getAddress();
  console.log("CivilizationLog:", civLogAddr);

  console.log("\n── Deployment Summary ─────────────────────");
  console.log(`USDY:                ${usdyAddress}`);
  console.log(`OracleMessage:       ${oracleAddr}`);
  console.log(`TempleVault:         ${vaultAddr}`);
  console.log(`BlessingDistributor: ${distributorAddr}`);
  console.log(`CivilizationLog:     ${civLogAddr}`);
  console.log(`Oracle EOA:          ${ORACLE_ADDRESS}`);
  console.log(`CivEngine EOA:       ${CIV_ENGINE_ADDRESS}`);
  console.log("────────────────────────────────────────────");
  console.log("\nCopy these into apps/web/.env.local and agent/.env");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
