"use client";

import { ConnectKitButton } from "connectkit";
import { useDisconnect } from "wagmi";

export function ConnectButton() {
  const { disconnect } = useDisconnect();

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, address, ensName }) => {
        if (!isConnected) {
          return (
            <button onClick={show} className="pixel-button pixel-button-dark px-4 py-2 text-xl uppercase tracking-[0.12em]">
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          );
        }

        const label = ensName ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={show}
              className="pixel-button pixel-button-dark px-3 py-2 text-xl uppercase tracking-[0.12em]"
            >
              {label}
            </button>
            <button
              onClick={() => disconnect()}
              className="pixel-button pixel-button-dark px-3 py-2 text-xl uppercase tracking-[0.12em] text-[var(--pixel-danger,#c0392b)]"
            >
              Exit
            </button>
          </div>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
