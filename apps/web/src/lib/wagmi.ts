import { createConfig, http } from "wagmi";
import { mainnet, mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Injected-only (MetaMask / browser wallets via EIP-6963). WalletConnect removed:
// its relay was unreliable ("Connection interrupted while trying to subscribe")
// and left wagmi stuck in a "reconnecting" state, so isConnected stayed false
// even after the wallet showed connected. Injected talks straight to the
// extension — zero relay dependency, instant + stable for the demo.
export const config = createConfig({
  chains: [mantleSepoliaTestnet, mantle, mainnet],
  connectors: [injected()],
  transports: {
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
    [mantle.id]: http("https://rpc.mantle.xyz"),
    // Proxy through our own API route — avoids CORS on all public ETH mainnet RPCs
    [mainnet.id]: http("/api/eth-rpc"),
  },
  ssr: true,
});
