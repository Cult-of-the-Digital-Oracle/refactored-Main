"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { config } from "@/lib/wagmi";

const connectKitTheme = {
  "--ck-font-family": '"VT323", monospace',
  "--ck-border-radius": "4px",
  "--ck-connectbutton-background": "#1a120b",
  "--ck-connectbutton-color": "#c8a84b",
  "--ck-connectbutton-border-radius": "4px",
  "--ck-connectbutton-border-color": "#c8a84b",
  "--ck-connectbutton-box-shadow": "4px 4px 0 rgba(61,40,16,0.8)",
  "--ck-connectbutton-hover-color": "#f0d9a0",
  "--ck-connectbutton-hover-background": "#2c1b10",
  "--ck-connectbutton-hover-box-shadow": "2px 2px 0 rgba(61,40,16,0.8)",
  "--ck-connectbutton-active-background": "#3d2810",
  "--ck-accent-color": "#c8a84b",
  "--ck-accent-text-color": "#1a120b",
  "--ck-body-background": "#1a120b",
  "--ck-body-color": "#f5e6c8",
  "--ck-body-color-muted": "#c8b27f",
  "--ck-primary-button-background": "#c8a84b",
  "--ck-primary-button-color": "#1a120b",
  "--ck-primary-button-hover-background": "#f0d9a0",
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight" customTheme={connectKitTheme}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
