import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cult of the Digital Oracle",
  description:
    "An AI reads Mantle every day and speaks. Stake USDY. Receive your Disciple NFT. When prophecy fulfills, the faithful are rewarded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--pixel-void)] text-[var(--pixel-text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
