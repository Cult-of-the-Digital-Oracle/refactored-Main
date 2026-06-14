import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cult of the Digital Oracle",
  description:
    "An AI reads Mantle every day and speaks. Stake USDY. Receive your Disciple NFT. When prophecy fulfills, the faithful are rewarded.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#07070c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--pixel-void)] text-[var(--pixel-text)]" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
