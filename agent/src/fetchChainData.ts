import { ethers } from "ethers";

export interface ChainSnapshot {
  blockNumber: number;
  timestamp: number;
  blockCount24h: number;
  avgGasPrice: string;
  mantlePrice?: number;
  summary: string; // human-readable for GPT prompt
}

export async function fetchChainData(provider: ethers.JsonRpcProvider): Promise<ChainSnapshot> {
  const latest = await provider.getBlock("latest");
  if (!latest) throw new Error("Failed to fetch latest block");

  // Estimate blocks per 24h (Mantle ~2s block time → ~43200 blocks/day)
  const blocksPerDay = 43_200;
  const dayAgoBlock = Math.max(1, latest.number - blocksPerDay);

  const dayAgo = await provider.getBlock(dayAgoBlock);
  const blockCount24h = latest.number - (dayAgo?.number ?? dayAgoBlock);

  const feeData = await provider.getFeeData();
  const avgGasPrice = feeData.gasPrice
    ? ethers.formatUnits(feeData.gasPrice, "gwei")
    : "unknown";

  const snapshot: ChainSnapshot = {
    blockNumber: latest.number,
    timestamp: latest.timestamp,
    blockCount24h,
    avgGasPrice,
    summary: `
Mantle chain status (last 24h):
- Current block: ${latest.number}
- Blocks produced today: ~${blockCount24h}
- Average gas price: ${avgGasPrice} gwei
- Chain time: ${new Date(latest.timestamp * 1000).toUTCString()}
`.trim(),
  };

  return snapshot;
}
