import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, BN } from "@solana/web3.js";
import { createBetFunClient } from "@betfun/sdk";

export interface AMMPoolData {
  arena: PublicKey;
  outcomeIndex: number;
  shareMint: PublicKey;
  tokenReserve: BN;
  solReserve: BN;
  k: BN;
  lpTokenMint: PublicKey;
  totalLpTokens: BN;
  feeBps: number;
  protocolFeeBps: number;
  feesCollected: BN;
  volume24h: BN;
  swapCount: BN;
  lastSwapAt: BN;
  lastPrice: BN;
  price24hAgo: BN;
}

export interface LiquidityPositionData {
  pool: PublicKey;
  provider: PublicKey;
  lpTokens: BN;
  tokensDeposited: BN;
  solDeposited: BN;
  createdAt: BN;
  feesEarned: BN;
}

export function useAMM(arenaAddress: string | null, outcomeIndex: number | null) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [pool, setPool] = useState<AMMPoolData | null>(null);
  const [liquidityPosition, setLiquidityPosition] = useState<LiquidityPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

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

      // Fetch pool data
      const poolData = await client.getPool(arenaPDA, outcomeIndex);
      if (poolData) {
        setPool(poolData as any);
      }

      // Fetch user's liquidity position
      const positionData = await client.getLiquidityPosition(arenaPDA, outcomeIndex);
      setLiquidityPosition(positionData as any);
    } catch (err: any) {
      console.error("Error fetching AMM data:", err);
      setError(err.message || "Failed to load AMM data");
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

  const initializePool = useCallback(async (
    feeBps: number = 30,
    protocolFeeBps: number = 10
  ) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.initializePool(
        arenaPDA,
        outcomeIndex,
        feeBps,
        protocolFeeBps
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error initializing pool:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const addLiquidity = useCallback(async (
    tokenAmount: number, // in lamports
    solAmount: number, // in lamports
    minLpTokens: number = 0
  ) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.addLiquidity(
        arenaPDA,
        outcomeIndex,
        tokenAmount,
        solAmount,
        minLpTokens
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error adding liquidity:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const removeLiquidity = useCallback(async (
    lpTokensToBurn: number, // in lamports
    minTokenAmount: number = 0,
    minSolAmount: number = 0
  ) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.removeLiquidity(
        arenaPDA,
        outcomeIndex,
        lpTokensToBurn,
        minTokenAmount,
        minSolAmount
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error removing liquidity:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const swap = useCallback(async (
    amountIn: number, // in lamports
    minAmountOut: number, // slippage protection
    isTokenToSol: boolean
  ) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.swap(
        arenaPDA,
        outcomeIndex,
        amountIn,
        minAmountOut,
        isTokenToSol
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error executing swap:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  // Calculate derived values
  const currentPrice = pool?.lastPrice ? pool.lastPrice.toNumber() / 1e9 : 0;
  const price24hAgo = pool?.price24hAgo ? pool.price24hAgo.toNumber() / 1e9 : currentPrice;
  const priceChange24h = price24hAgo > 0 
    ? ((currentPrice - price24hAgo) / price24hAgo) * 100 
    : 0;
  
  const totalLiquidity = pool 
    ? (pool.tokenReserve.toNumber() * currentPrice + pool.solReserve.toNumber() / 1e9)
    : 0;

  return {
    pool,
    liquidityPosition,
    loading,
    error,
    processing,
    currentPrice,
    priceChange24h,
    totalLiquidity,
    initializePool,
    addLiquidity,
    removeLiquidity,
    swap,
    refresh: fetchData,
  };
}

