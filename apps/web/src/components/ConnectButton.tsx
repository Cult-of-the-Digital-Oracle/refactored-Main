"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mantleSepoliaTestnet } from "wagmi/chains";

// Direct injected connect — no modal, no WalletConnect relay. One click opens
// MetaMask. Also surfaces a "Switch To Mantle" state when the wallet is on the
// wrong network, which is the #1 reason the Temple flow silently failed
// (reads/writes were hitting whatever chain the wallet defaulted to).
export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injectedConnector = connectors[0];

  if (!isConnected) {
    return (
      <button
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={isPending || !injectedConnector}
        className="pixel-button pixel-button-dark px-4 py-2 text-xl uppercase tracking-[0.12em]"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== mantleSepoliaTestnet.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: mantleSepoliaTestnet.id })}
        disabled={isSwitching}
        className="pixel-button pixel-button-danger px-4 py-2 text-xl uppercase tracking-[0.12em]"
      >
        {isSwitching ? "Switching..." : "Switch To Mantle"}
      </button>
    );
  }

  const label = `${address?.slice(0, 6)}...${address?.slice(-4)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="pixel-button pixel-button-dark px-3 py-2 text-xl uppercase tracking-[0.12em]">
        {label}
      </span>
      <button
        onClick={() => disconnect()}
        className="pixel-button pixel-button-dark px-3 py-2 text-xl uppercase tracking-[0.12em] text-[var(--pixel-danger,#c0392b)]"
      >
        Exit
      </button>
    </div>
  );
}
