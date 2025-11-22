import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { NETWORK } from "../constants";

/**
 * Get wallet adapter network from env
 */
export function getWalletNetwork(): WalletAdapterNetwork {
  return NETWORK === "mainnet" 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
}

