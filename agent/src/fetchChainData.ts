import { ethers } from "ethers";

type RpcTransaction = {
  from?: string;
  to?: string | null;
  value?: string;
  input?: string;
};

type RpcBlock = {
  number: string;
  gasUsed?: string;
  transactions: RpcTransaction[];
};

export interface ChainSignals {
  sampledBlocks: number;
  sampledTransactions: number;
  estimatedTransactions24h: number;
  sampledActiveAddresses: number;
  contractCallRatio: number;
  largeValueTransfers: number;
  usdyTransferCount: number;
  usdyTransferVolume: string;
}

export interface ChainSnapshot {
  blockNumber: number;
  timestamp: number;
  blockCount24h: number;
  avgGasPrice: string;
  signals: ChainSignals;
  evidence: string;
  summary: string;
}

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

export async function fetchChainData(
  provider: ethers.JsonRpcProvider,
  usdyAddress?: string
): Promise<ChainSnapshot> {
  const latest = await provider.getBlock("latest");
  if (!latest) throw new Error("Failed to fetch latest block");

  const blocksPerDay = 43_200;
  const dayAgoBlock = Math.max(1, latest.number - blocksPerDay);
  const dayAgo = await provider.getBlock(dayAgoBlock);
  const blockCount24h = latest.number - (dayAgo?.number ?? dayAgoBlock);

  const feeData = await provider.getFeeData();
  const avgGasPrice = feeData.gasPrice
    ? ethers.formatUnits(feeData.gasPrice, "gwei")
    : "unknown";

  const sampledBlockNumbers = sampleBlockNumbers(dayAgoBlock, latest.number, 24);
  const sampledBlocks = await Promise.all(
    sampledBlockNumbers.map((blockNumber) => fetchFullBlock(provider, blockNumber))
  );

  const activeAddresses = new Set<string>();
  let sampledTransactions = 0;
  let contractCalls = 0;
  let largeValueTransfers = 0;

  for (const block of sampledBlocks) {
    for (const tx of block.transactions) {
      sampledTransactions += 1;
      if (tx.from) activeAddresses.add(tx.from.toLowerCase());
      if (tx.to) activeAddresses.add(tx.to.toLowerCase());
      if (tx.input && tx.input !== "0x") contractCalls += 1;
      if (BigInt(tx.value ?? "0x0") >= ethers.parseEther("1")) {
        largeValueTransfers += 1;
      }
    }
  }

  const estimatedTransactions24h =
    sampledBlocks.length > 0
      ? Math.round((sampledTransactions / sampledBlocks.length) * blockCount24h)
      : 0;

  const usdyTransfers = await fetchUsdyTransfers(provider, dayAgoBlock, latest.number, usdyAddress);

  const signals: ChainSignals = {
    sampledBlocks: sampledBlocks.length,
    sampledTransactions,
    estimatedTransactions24h,
    sampledActiveAddresses: activeAddresses.size,
    contractCallRatio: sampledTransactions > 0 ? Math.round((contractCalls / sampledTransactions) * 100) : 0,
    largeValueTransfers,
    usdyTransferCount: usdyTransfers.count,
    usdyTransferVolume: ethers.formatUnits(usdyTransfers.volume, 6),
  };

  const evidence = [
    `sampledBlocks=${signals.sampledBlocks}`,
    `sampledTx=${signals.sampledTransactions}`,
    `estimatedTx24h=${signals.estimatedTransactions24h}`,
    `activeAddressesInSample=${signals.sampledActiveAddresses}`,
    `contractCallRatio=${signals.contractCallRatio}%`,
    `largeMntTransfers=${signals.largeValueTransfers}`,
    `usdyTransfers=${signals.usdyTransferCount}`,
    `usdyVolume=${signals.usdyTransferVolume}`,
  ].join("; ");

  const summary = `
Mantle chain status, sampled from the last 24h:
- Current block: ${latest.number}
- Blocks produced: ~${blockCount24h}
- Average gas price: ${avgGasPrice} gwei
- Sampled blocks: ${signals.sampledBlocks}
- Sampled transactions: ${signals.sampledTransactions}
- Estimated 24h transactions: ${signals.estimatedTransactions24h}
- Active addresses in sample: ${signals.sampledActiveAddresses}
- Contract call ratio in sample: ${signals.contractCallRatio}%
- Large MNT transfers in sample: ${signals.largeValueTransfers}
- USDY transfers: ${signals.usdyTransferCount}
- USDY transfer volume: ${signals.usdyTransferVolume}
- Chain time: ${new Date(latest.timestamp * 1000).toUTCString()}
`.trim();

  return {
    blockNumber: latest.number,
    timestamp: latest.timestamp,
    blockCount24h,
    avgGasPrice,
    signals,
    evidence,
    summary,
  };
}

function sampleBlockNumbers(from: number, to: number, count: number): number[] {
  if (to <= from) return [to];
  const span = to - from;
  const actualCount = Math.min(count, span + 1);
  const blocks = new Set<number>();

  for (let i = 0; i < actualCount; i += 1) {
    blocks.add(Math.round(from + (span * i) / Math.max(1, actualCount - 1)));
  }

  return [...blocks].sort((a, b) => a - b);
}

async function fetchFullBlock(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<RpcBlock> {
  return provider.send("eth_getBlockByNumber", [ethers.toQuantity(blockNumber), true]) as Promise<RpcBlock>;
}

async function fetchUsdyTransfers(
  provider: ethers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
  usdyAddress?: string
): Promise<{ count: number; volume: bigint }> {
  if (!usdyAddress || !ethers.isAddress(usdyAddress)) return { count: 0, volume: 0n };

  let count = 0;
  let volume = 0n;
  const chunkSize = 10_000;

  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(toBlock, start + chunkSize - 1);
    const logs = await provider.getLogs({
      address: usdyAddress as `0x${string}`,
      fromBlock: start,
      toBlock: end,
      topics: [TRANSFER_TOPIC],
    });

    count += logs.length;
    for (const log of logs) {
      volume += BigInt(log.data);
    }
  }

  return { count, volume };
}
