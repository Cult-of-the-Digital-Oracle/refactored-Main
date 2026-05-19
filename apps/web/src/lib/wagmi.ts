import { createConfig, http } from "wagmi";
import { mainnet, mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    appName: "Cult of the Digital Oracle",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "demo-project-id",
    chains: [mantleSepoliaTestnet, mantle, mainnet],
    transports: {
      [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
      [mantle.id]: http("https://rpc.mantle.xyz"),
      // Override ConnectKit's default eth.merkle.io (no CORS) with a public RPC
      [mainnet.id]: http("https://eth.llamarpc.com"),
    },
    ssr: true,
  })
);
