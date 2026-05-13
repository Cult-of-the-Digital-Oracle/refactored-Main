import { ethers } from "hardhat";
import { Wallet } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const ONE_MNT = ethers.parseEther("1");
const MIN_GAS = ethers.parseEther("0.03");

async function main() {
  const [deployer, ...localSigners] = await ethers.getSigners();

  const usdyAddress = requireEnv("USDY_ADDRESS");
  const vaultAddress = requireEnv("TEMPLE_VAULT_ADDRESS");
  const distributorAddress = requireEnv("BLESSING_DISTRIBUTOR_ADDRESS");

  const stakeAmounts = parseAmounts(process.env.DEMO_STAKE_AMOUNTS ?? "125,80,60,40,25");
  const privateKeys = (process.env.DEMO_DISCIPLE_PRIVATE_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  const envWallets = privateKeys.map((key) => new Wallet(key, ethers.provider));
  const demoSigners = envWallets.length > 0 ? envWallets : [deployer, ...localSigners].slice(0, 5);

  const usdy = (await ethers.getContractAt("MockUSDY", usdyAddress)) as any;
  const vault = (await ethers.getContractAt("TempleVault", vaultAddress)) as any;
  const distributor = (await ethers.getContractAt("BlessingDistributor", distributorAddress)) as any;

  console.log(`Demo deployer/oracle: ${deployer.address}`);
  console.log(`Demo disciples: ${demoSigners.length}`);

  for (let i = 0; i < demoSigners.length; i += 1) {
    const signer = demoSigners[i] as HardhatEthersSigner | Wallet;
    const address = await signer.getAddress();
    const amount = stakeAmounts[i % stakeAmounts.length];

    await ensureGas(deployer, address);
    await ensureUsdy(usdy, deployer, address, amount);

    const tokenId = await vault.cardOf(address);
    if (tokenId === 0n) {
      await (await usdy.connect(signer).approve(vaultAddress, amount)).wait();
      const tx = await vault.connect(signer).enter(amount);
      await tx.wait();
      const newTokenId = await vault.cardOf(address);
      console.log(`Disciple #${newTokenId} entered: ${address} (${ethers.formatUnits(amount, 6)} USDY)`);
      await recordActions(vault, signer, newTokenId);
    } else {
      console.log(`Disciple #${tokenId} already exists: ${address}`);
      await recordActions(vault, signer, tokenId);
    }
  }

  await queueBlessing(usdy, distributor, deployer);

  const nextId = await vault.nextId();
  const nextRoundId = await distributor.nextRoundId();
  console.log(`Population complete. Disciples minted: ${nextId - 1n}`);
  console.log(`Latest blessing round: ${nextRoundId - 1n}`);
}

async function recordActions(
  vault: any,
  signer: HardhatEthersSigner | Wallet,
  tokenId: bigint
) {
  try {
    await (await vault.connect(signer).checkIn(tokenId)).wait();
    console.log(`  Check-in recorded for #${tokenId}`);
  } catch (error) {
    console.log(`  Check-in skipped for #${tokenId}: ${shortError(error)}`);
  }

  try {
    await (await vault.connect(signer).recordShare(tokenId, "x")).wait();
    console.log(`  Share recorded for #${tokenId}`);
  } catch (error) {
    console.log(`  Share skipped for #${tokenId}: ${shortError(error)}`);
  }
}

async function queueBlessing(
  usdy: any,
  distributor: any,
  signer: HardhatEthersSigner
) {
  const distributorAddress = await distributor.getAddress();
  const yieldAmount = ethers.parseUnits(process.env.DEMO_BLESSING_AMOUNT ?? "25", 6);
  const day = BigInt(process.env.DEMO_BLESSING_DAY ?? Math.floor(Date.now() / 1000 / 86400).toString());

  await ensureUsdy(usdy, signer, signer.address, yieldAmount);
  await (await usdy.connect(signer).approve(distributorAddress, yieldAmount)).wait();

  try {
    const tx = await distributor.connect(signer).queueBlessing(day, yieldAmount);
    await tx.wait();
    console.log(`Blessing queued for day ${day}: ${ethers.formatUnits(yieldAmount, 6)} USDY`);
  } catch (error) {
    console.log(`Blessing skipped: ${shortError(error)}`);
  }
}

async function ensureGas(deployer: HardhatEthersSigner, to: string) {
  const balance = await ethers.provider.getBalance(to);
  if (balance >= MIN_GAS || to.toLowerCase() === deployer.address.toLowerCase()) return;

  const tx = await deployer.sendTransaction({ to, value: ONE_MNT / 10n });
  await tx.wait();
  console.log(`  Gas topped up: ${to}`);
}

async function ensureUsdy(
  usdy: any,
  signer: HardhatEthersSigner,
  to: string,
  amount: bigint
) {
  const balance = await usdy.balanceOf(to);
  if (balance >= amount) return;

  const needed = amount - balance;
  try {
    await (await usdy.connect(signer).mint(to, needed)).wait();
    console.log(`  Minted ${ethers.formatUnits(needed, 6)} USDY to ${to}`);
  } catch {
    console.log(`  USDY mint unavailable for ${to}; current balance ${ethers.formatUnits(balance, 6)}`);
  }
}

function parseAmounts(value: string): bigint[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ethers.parseUnits(item, 6));
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function shortError(error: unknown): string {
  const err = error as { shortMessage?: string; reason?: string; message?: string };
  return err.shortMessage ?? err.reason ?? err.message?.split("\n")[0] ?? "unknown error";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
