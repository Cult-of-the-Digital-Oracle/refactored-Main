export const CONTRACTS = {
  oracleMessage: (process.env.NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS ?? "") as `0x${string}`,
  templeVault: (process.env.NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS ?? "") as `0x${string}`,
  blessingDistributor: (process.env.NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS ?? "") as `0x${string}`,
  usdy: (process.env.NEXT_PUBLIC_USDY_ADDRESS ?? "") as `0x${string}`,
} as const;

export const ORACLE_MESSAGE_ABI = [
  {
    name: "postProphecy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "text", type: "string" }],
    outputs: [{ name: "day", type: "uint256" }],
  },
  {
    name: "resolveProphecy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "day", type: "uint256" },
      { name: "score", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "getProphecy",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "text", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "fulfillmentScore", type: "uint8" },
          { name: "resolved", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "todaysProphecy",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "text", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "fulfillmentScore", type: "uint8" },
          { name: "resolved", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "totalProphecies",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "prophecyDays",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ProphecyDelivered",
    type: "event",
    inputs: [
      { name: "day", type: "uint256", indexed: true },
      { name: "text", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ProphecyResolved",
    type: "event",
    inputs: [
      { name: "day", type: "uint256", indexed: true },
      { name: "score", type: "uint8", indexed: false },
    ],
  },
] as const;

export const TEMPLE_VAULT_ABI = [
  {
    name: "enter",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "exit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cardOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "disciples",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "disciple", type: "address" },
      { name: "stakeAmount", type: "uint256" },
      { name: "joinedAt", type: "uint256" },
      { name: "exitedAt", type: "uint256" },
      { name: "karma", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "totalFaith",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimantOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "eligibleStakeAt",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Entered",
    type: "event",
    inputs: [
      { name: "disciple", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const BLESSING_DISTRIBUTOR_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "pendingBlessing",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "rounds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "day", type: "uint256" },
      { name: "yieldPool", type: "uint256" },
      { name: "totalFaithSnap", type: "uint256" },
      { name: "queuedAt", type: "uint256" },
      { name: "settled", type: "bool" },
    ],
  },
  {
    name: "nextRoundId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "BlessingQueued",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "day", type: "uint256", indexed: false },
      { name: "yieldPool", type: "uint256", indexed: false },
    ],
  },
  {
    name: "BlessingClaimed",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "disciple", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
