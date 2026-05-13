/**
 * Demo seed: gives oracle wallet test USDY, then queues a blessing round.
 * Run: npx tsx scripts/demo-seed.ts
 */
import "dotenv/config";
import { ethers } from "ethers";

const RPC = process.env.MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const USDY = process.env.USDY_ADDRESS!;
const DISTRIBUTOR = process.env.BLESSING_DISTRIBUTOR_ADDRESS!;

const USDY_ABI = [
  "function faucet() external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address) external view returns (uint256)",
];

const DISTRIBUTOR_ABI = [
  "function queueBlessing(uint256 day, uint256 yieldAmount) external",
  "function nextRoundId() external view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const usdy = new ethers.Contract(USDY, USDY_ABI, signer);
const distributor = new ethers.Contract(DISTRIBUTOR, DISTRIBUTOR_ABI, signer);

const YIELD_AMOUNT = ethers.parseUnits("50", 6); // 50 USDY yield pool

async function main() {
  console.log("Oracle wallet:", signer.address);

  // 1. Faucet USDY
  const balBefore = await usdy.balanceOf(signer.address);
  console.log(`USDY before: ${ethers.formatUnits(balBefore, 6)}`);
  if (balBefore < YIELD_AMOUNT) {
    console.log("Calling faucet()...");
    const tx = await usdy.faucet();
    await tx.wait();
    console.log("Faucet done.");
  }

  // 2. Approve distributor
  console.log(`Approving ${ethers.formatUnits(YIELD_AMOUNT, 6)} USDY to distributor...`);
  const approveTx = await usdy.approve(DISTRIBUTOR, YIELD_AMOUNT);
  await approveTx.wait();
  console.log("Approved.");

  // 3. Queue blessing round for today
  const today = Math.floor(Date.now() / 1000 / 86400);
  console.log(`Queueing blessing for day ${today} with ${ethers.formatUnits(YIELD_AMOUNT, 6)} USDY...`);
  const queueTx = await distributor.queueBlessing(today, YIELD_AMOUNT);
  await queueTx.wait();
  console.log(`Blessing queued! Tx: ${queueTx.hash}`);

  const nextId = await distributor.nextRoundId();
  console.log(`Next round ID is now: ${nextId} (active round = ${nextId - 1n})`);
}

main().catch(console.error);
