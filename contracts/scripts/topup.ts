import "dotenv/config";
import { ethers } from "ethers";

const TO = process.argv[2];
if (!TO) {
  console.error("Usage: npx tsx scripts/topup.ts <address>");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

(async () => {
  const amount = ethers.parseEther("0.2");
  const tx = await signer.sendTransaction({ to: TO, value: amount });
  console.log(`Sending 0.2 MNT to ${TO}...`);
  await tx.wait();
  console.log(`Done: ${tx.hash}`);
})();
