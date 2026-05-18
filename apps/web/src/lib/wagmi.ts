import { createConfig, http } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    appName: "Cult of the Digital Oracle",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "demo-project-id",
    chains: [mantleSepoliaTestnet, mantle],
    transports: {
      [mantleSepoliaTestnet.id]: http(),
      [mantle.id]: http(),
    },
    ssr: true,
  })
);
