"use client";

import dynamic from "next/dynamic";

// Dynamically import to avoid hydration mismatch
// Wallet adapters check for browser extensions which causes SSR/client mismatch
const WalletMultiButtonComponent = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { 
    ssr: false,
    loading: () => (
      <button 
        className="wallet-adapter-button"
        disabled
        style={{ opacity: 0.7 }}
      >
        Loading wallet...
      </button>
    )
  }
);

export function WalletMultiButton() {
  return (
    <WalletMultiButtonComponent 
      className="wallet-adapter-button"
    />
  );
}

