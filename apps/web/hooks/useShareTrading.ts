import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, BN } from "@solana/web3.js";
import { createBetFunClient } from "@betfun/sdk";

export interface OutcomeShareData {
  arena: PublicKey;
  outcomeIndex: number;
  tokenMint: PublicKey;
  totalSupply: BN;
  currentPrice: BN;
  volume24h: BN;
  tradeCount: BN;
  lastTradeAt: BN;
  high24h: BN;
  low24h: BN;
  price24hAgo: BN;
}

export interface ShareBalanceData {
  owner: PublicKey;
  outcomeShare: PublicKey;
  balance: BN;
  avgCostBasis: BN;
  totalInvested: BN;
  realizedPnl: BN;
}

export function useShareTrading(arenaAddress: string | null, outcomeIndex: number | null) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [outcomeShare, setOutcomeShare] = useState<OutcomeShareData | null>(null);
  const [shareBalance, setShareBalance] = useState<ShareBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trading, setTrading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!arenaAddress || outcomeIndex === null) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);

      // Fetch outcome share
      const shareData = await client.getOutcomeShare(arenaPDA, outcomeIndex);
      if (shareData) {
        setOutcomeShare(shareData);
      }

      // Fetch user's share balance
      const balanceData = await client.getShareBalance(arenaPDA, outcomeIndex);
      setShareBalance(balanceData);
    } catch (err: any) {
      console.error("Error fetching share data:", err);
      setError(err.message || "Failed to load share data");
    } finally {
      setLoading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet]);

  useEffect(() => {
    fetchData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const createShareTokens = useCallback(async (initialPrice: number) => {
    if (!arenaAddress || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setTrading(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      // Convert SOL to lamports
      const initialPriceLamports = Math.floor(initialPrice * 1e9);
      
      const signature = await client.createShareTokens(
        arenaPDA,
        outcomeIndex!,
        initialPriceLamports
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error creating share tokens:", err);
      throw err;
    } finally {
      setTrading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const buyShares = useCallback(async (amount: number) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setTrading(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.buyShares(
        arenaPDA,
        outcomeIndex,
        amount
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error buying shares:", err);
      throw err;
    } finally {
      setTrading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const sellShares = useCallback(async (amount: number) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setTrading(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.sellShares(
        arenaPDA,
        outcomeIndex,
        amount
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error selling shares:", err);
      throw err;
    } finally {
      setTrading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const redeemShares = useCallback(async (amount: number) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setTrading(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.redeemShares(
        arenaPDA,
        outcomeIndex,
        amount
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error redeeming shares:", err);
      throw err;
    } finally {
      setTrading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  return {
    outcomeShare,
    shareBalance,
    loading,
    error,
    trading,
    createShareTokens,
    buyShares,
    sellShares,
    redeemShares,
    refresh: fetchData,
  };
}

