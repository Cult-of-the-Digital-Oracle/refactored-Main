import { ethers } from "ethers";

// Minimal ABIs — only what the agent needs
const ORACLE_MESSAGE_ABI = [
  "function postProphecy(string calldata text) external returns (uint256 day)",
  "function resolveProphecy(uint256 day, uint8 score, string calldata reason, string calldata evidence) external",
  "function getProphecy(uint256 day) external view returns (tuple(uint48 timestamp, uint8 fulfillmentScore, bool resolved, string text, string resolutionReason, string evidence))",
  "function todaysProphecy() external view returns (tuple(uint48 timestamp, uint8 fulfillmentScore, bool resolved, string text, string resolutionReason, string evidence))",
];

const BLESSING_DISTRIBUTOR_ABI = [
  "function queueBlessing(uint256 day, uint256 yieldAmount) external",
];

const USDY_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

export async function postProphecy(
  signer: ethers.Wallet,
  oracleMessageAddr: string,
  prophecyText: string
): Promise<{ day: bigint; txHash: string }> {
  const contract = new ethers.Contract(oracleMessageAddr, ORACLE_MESSAGE_ABI, signer);
  const tx = await contract.postProphecy(prophecyText);
  const receipt = await tx.wait();

  // day = floor(block.timestamp / 86400)
  const block = await signer.provider!.getBlock(receipt.blockNumber);
  const day = BigInt(Math.floor((block!.timestamp) / 86400));

  return { day, txHash: receipt.hash };
}

export async function resolveProphecy(
  signer: ethers.Wallet,
  oracleMessageAddr: string,
  day: bigint,
  score: number,
  reason: string,
  evidence: string
): Promise<string> {
  const contract = new ethers.Contract(oracleMessageAddr, ORACLE_MESSAGE_ABI, signer);
  const tx = await contract.resolveProphecy(day, score, reason, evidence);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function queueBlessing(
  signer: ethers.Wallet,
  usdyAddr: string,
  distributorAddr: string,
  day: bigint,
  yieldAmount: bigint
): Promise<string> {
  const usdy = new ethers.Contract(usdyAddr, USDY_ABI, signer);
  await (await usdy.approve(distributorAddr, yieldAmount)).wait();

  const distributor = new ethers.Contract(distributorAddr, BLESSING_DISTRIBUTOR_ABI, signer);
  const tx = await distributor.queueBlessing(day, yieldAmount);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getYesterdayProphecy(
  provider: ethers.JsonRpcProvider,
  oracleMessageAddr: string
): Promise<{ text: string; day: bigint; resolved: boolean } | null> {
  const contract = new ethers.Contract(oracleMessageAddr, ORACLE_MESSAGE_ABI, provider);
  const latest = await provider.getBlock("latest");
  if (!latest) return null;
  const yesterday = BigInt(Math.floor(latest.timestamp / 86400)) - 1n;

  try {
    const p = await contract.getProphecy(yesterday);
    if (!p.text || p.text === "") return null;
    return { text: p.text, day: yesterday, resolved: p.resolved };
  } catch {
    return null;
  }
}

export async function getTodaysProphecy(
  provider: ethers.JsonRpcProvider,
  oracleMessageAddr: string
): Promise<{ text: string; resolved: boolean } | null> {
  const contract = new ethers.Contract(oracleMessageAddr, ORACLE_MESSAGE_ABI, provider);

  try {
    const p = await contract.todaysProphecy();
    if (!p.text || p.text === "") return null;
    return { text: p.text, resolved: p.resolved };
  } catch {
    return null;
  }
}
