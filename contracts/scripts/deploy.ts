import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Card = await ethers.getContractFactory("TradingCard");
  const card = await Card.deploy();
  await card.waitForDeployment();
  const cardAddr = await card.getAddress();
  console.log("TradingCard:", cardAddr);

  const resolver = process.env.RESOLVER_ADDRESS ?? deployer.address;
  const Arena = await ethers.getContractFactory("BattleArena");
  const arena = await Arena.deploy(resolver, cardAddr);
  await arena.waitForDeployment();
  console.log("BattleArena:", await arena.getAddress());
  console.log("Resolver:", resolver);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
