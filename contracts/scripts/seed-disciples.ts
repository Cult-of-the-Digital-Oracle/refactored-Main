import { ethers } from "hardhat";

// Seeds mock Disciples on the live TempleVault so /oracle-world shows hero NPCs.
// Each: throwaway wallet -> funded with gas from deployer -> minted MockUSDY ->
// approve -> enter() (soulbound Disciple NFT) -> checkIn() for karma.
//
//   cd contracts
//   npx hardhat run scripts/seed-disciples.ts --network mantleSepolia
//
// Tunables (env): SEED_DISCIPLE_COUNT (default 5), SEED_DISCIPLE_STAKES (csv USDY).
async function main() {
  const [deployer] = await ethers.getSigners();
  const usdyAddress = process.env.USDY_ADDRESS;
  const vaultAddress = process.env.TEMPLE_VAULT_ADDRESS;
  if (!usdyAddress || !vaultAddress) {
    throw new Error("Set USDY_ADDRESS + TEMPLE_VAULT_ADDRESS in contracts/.env");
  }

  const count = Number(process.env.SEED_DISCIPLE_COUNT ?? 5);
  const stakes = (process.env.SEED_DISCIPLE_STAKES ?? "120,75,50,40,25")
    .split(",")
    .map((s) => ethers.parseUnits(s.trim(), 6));
  const gasEach = ethers.parseEther("0.05");

  const usdy = (await ethers.getContractAt("MockUSDY", usdyAddress)) as any;
  const vault = (await ethers.getContractAt("TempleVault", vaultAddress)) as any;

  console.log(`Deployer:   ${deployer.address}`);
  console.log(`TempleVault ${vaultAddress}`);
  console.log(`Seeding ${count} disciples...\n`);

  const seeded: { address: string; tokenId: string; stake: string }[] = [];

  for (let i = 0; i < count; i++) {
    const w = ethers.Wallet.createRandom(ethers.provider);
    const amount = stakes[i % stakes.length];
    console.log(`#${i + 1} ${w.address} — stake ${ethers.formatUnits(amount, 6)} USDY`);

    // 1. gas, 2. mint USDY (open mint), 3. approve, 4. enter, 5. checkIn karma
    await (await deployer.sendTransaction({ to: w.address, value: gasEach })).wait();
    await (await usdy.mint(w.address, amount)).wait();
    await (await usdy.connect(w).approve(vaultAddress, amount)).wait();
    await (await vault.connect(w).enter(amount)).wait();
    const tokenId = await vault.cardOf(w.address);
    try {
      await (await vault.connect(w).checkIn(tokenId)).wait();
    } catch {
      /* karma is best-effort */
    }
    console.log(`   -> Disciple #${tokenId} minted (+5 karma)\n`);
    seeded.push({ address: w.address, tokenId: tokenId.toString(), stake: ethers.formatUnits(amount, 6) });
  }

  const nextId = await vault.nextId();
  const totalFaith = await vault.totalFaith();
  console.log("=== Seed complete ===");
  console.log(`Total disciples (nextId-1): ${nextId - 1n}`);
  console.log(`Total faith staked:         ${ethers.formatUnits(totalFaith, 6)} USDY`);
  console.table(seeded);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
