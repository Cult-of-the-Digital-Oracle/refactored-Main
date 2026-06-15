import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 1000 },
      evmVersion: "cancun",
    },
  },
  networks: {
    mantleSepolia: {
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts,
    },
    mantle: {
      url: "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts,
    },
  },
  // Etherscan V2 unified API (single key, V2 endpoint per chainid).
  etherscan: {
    apiKey: process.env.MANTLESCAN_API_KEY ?? "",
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5003",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5000",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },
};

export default config;
