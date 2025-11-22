import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SolanaProviders } from "../lib/solana/providers";
import { ErrorBoundaryWrapper } from "../components/ErrorBoundaryWrapper";
import { NetworkStatus } from "../components/NetworkStatus";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BetFun Arena | Prediction Battles on Solana",
  description:
    "Turn boring prediction markets into live, trash-talking, meme-fueled battle arenas on Solana. Create, battle, and win!",
  keywords: [
    "solana",
    "prediction market",
    "crypto betting",
    "web3 gaming",
    "betfun",
  ],
  authors: [{ name: "BetFun Arena" }],
  openGraph: {
    type: "website",
    title: "BetFun Arena",
    description: "Prediction Battles on Solana ⚔️",
    siteName: "BetFun Arena",
  },
  twitter: {
    card: "summary_large_image",
    site: "@BetFunArena",
    creator: "@BetFunArena",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {/* Indie.fun Embed Script - SPONSOR_APIS.md spec */}
        <Script
          src="https://indie.fun/embed.js"
          strategy="lazyOnload"
        />
        
        <ErrorBoundaryWrapper>
          <SolanaProviders>
            <NetworkStatus />
            <div className="min-h-screen flex flex-col">
              {children}
            </div>
          </SolanaProviders>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
