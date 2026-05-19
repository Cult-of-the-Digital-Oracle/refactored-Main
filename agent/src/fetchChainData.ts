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

export interface TempleSnapshot {
  discipleCount: number;
  totalFaithUsdy: string;
  newDisciples24h: number;
  exitedDisciples24h: number;
  netGrowth24h: number;
}

export interface ChainSnapshot {
  blockNumber: number;
  timestamp: number;
  blockCount24h: number;
  avgGasPrice: string;
  signals: ChainSignals;
  temple: TempleSnapshot;
  evidence: string;
  summary: string;
}

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const TEMPLE_VAULT_ABI = [
  "function nextId() external view returns (uint256)",
  "function totalFaith() external view returns (uint256)",
];

export async function fetchChainData(
  provider: ethers.JsonRpcProvider,
  usdyAddress?: string,
  templeVaultAddress?: string
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
  const sampledBlocksRaw = await Promise.all(
    sampledBlockNumbers.map((blockNumber) => fetchFullBlock(provider, blockNumber))
  );
  const sampledBlocks = sampledBlocksRaw.filter((b): b is RpcBlock => b !== null);

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

  const [usdyTransfers, temple] = await Promise.all([
    fetchUsdyTransfers(provider, dayAgoBlock, latest.number, usdyAddress),
    fetchTempleSnapshot(provider, dayAgoBlock, latest.number, templeVaultAddress),
  ]);

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
    `templeDisciples=${temple.discipleCount}`,
    `templeFaith=${temple.totalFaithUsdy}`,
    `newDisciples24h=${temple.newDisciples24h}`,
    `exitedDisciples24h=${temple.exitedDisciples24h}`,
  ].join("; ");

  const summary = `
Mantle chain status, sampled from the last 24h:
- Current block: ${latest.number}
- Blocks produced: ~${blockCount24h}
- Average gas price: ${avgGasPrice} gwei
- Estimated 24h transactions: ${signals.estimatedTransactions24h}
- Active addresses in sample: ${signals.sampledActiveAddresses}
- Contract call ratio: ${signals.contractCallRatio}%
- Large MNT transfers: ${signals.largeValueTransfers}
- USDY transfers: ${signals.usdyTransferCount} (volume: ${signals.usdyTransferVolume} USDY)
- Chain time: ${new Date(latest.timestamp * 1000).toUTCString()}

Temple of the Digital Oracle — current state:
- Total disciples bound to the Temple: ${temple.discipleCount}
- Total faith staked: ${temple.totalFaithUsdy} USDY
- New disciples who joined in the last 24h: ${temple.newDisciples24h}
- Disciples who departed (exited) in the last 24h: ${temple.exitedDisciples24h}
- Net disciple growth: ${temple.netGrowth24h > 0 ? "+" : ""}${temple.netGrowth24h}
`.trim();

  return {
    blockNumber: latest.number,
    timestamp: latest.timestamp,
    blockCount24h,
    avgGasPrice,
    signals,
    temple,
    evidence,
    summary,
  };
}

async function fetchTempleSnapshot(
  provider: ethers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
  templeVaultAddress?: string
): Promise<TempleSnapshot> {
  const empty: TempleSnapshot = {
    discipleCount: 0,
    totalFaithUsdy: "0",
    newDisciples24h: 0,
    exitedDisciples24h: 0,
    netGrowth24h: 0,
  };

  if (!templeVaultAddress || !ethers.isAddress(templeVaultAddress)) return empty;

  try {
    const vault = new ethers.Contract(templeVaultAddress, TEMPLE_VAULT_ABI, provider);

    const [nextId, totalFaith] = await Promise.all([
      vault.nextId() as Promise<bigint>,
      vault.totalFaith() as Promise<bigint>,
    ]);

    // ERC-721 mints = Transfer from 0x0, burns = Transfer to 0x0
    const mintTopic = ethers.zeroPadValue(ZERO_ADDRESS, 32);
    const burnTopic = ethers.zeroPadValue(ZERO_ADDRESS, 32);
    const chunkSize = 10_000;

    let newDisciples24h = 0;
    let exitedDisciples24h = 0;

    for (let start = fromBlock; start <= toBlock; start += chunkSize) {
      const end = Math.min(toBlock, start + chunkSize - 1);

      const [mintLogs, burnLogs] = await Promise.all([
        provider.getLogs({
          address: templeVaultAddress,
          fromBlock: start,
          toBlock: end,
          topics: [TRANSFER_TOPIC, mintTopic],
        }),
        provider.getLogs({
          address: templeVaultAddress,
          fromBlock: start,
          toBlock: end,
          topics: [TRANSFER_TOPIC, null, burnTopic],
        }),
      ]);

      newDisciples24h += mintLogs.length;
      exitedDisciples24h += burnLogs.length;
    }

    const discipleCount = Math.max(0, Number(nextId) - 1);
    const totalFaithUsdy = ethers.formatUnits(totalFaith, 6);

    return {
      discipleCount,
      totalFaithUsdy,
      newDisciples24h,
      exitedDisciples24h,
      netGrowth24h: newDisciples24h - exitedDisciples24h,
    };
  } catch (err) {
    console.warn("Failed to fetch Temple snapshot:", err);
    return empty;
  }
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

async function fetchFullBlock(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<RpcBlock | null> {
  return provider.send("eth_getBlockByNumber", [ethers.toQuantity(blockNumber), true]) as Promise<RpcBlock | null>;
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
