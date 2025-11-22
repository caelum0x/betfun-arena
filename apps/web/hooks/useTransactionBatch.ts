import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TransactionBatcher, createTransactionBatcher } from "@betfun/sdk/batch";

/**
 * Hook for batching multiple transactions
 */
export function useTransactionBatch() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [batching, setBatching] = useState(false);
  const [batchSize, setBatchSize] = useState(0);

  const createBatch = useCallback(() => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      throw new Error("Wallet not connected");
    }
    return createTransactionBatcher(connection, wallet);
  }, [connection, wallet]);

  const executeBatch = useCallback(
    async (
      batcher: TransactionBatcher,
      options?: { skipPreflight?: boolean; maxRetries?: number }
    ): Promise<string> => {
      setBatching(true);
      try {
        const signature = await batcher.execute(options);
        setBatchSize(0);
        return signature;
      } finally {
        setBatching(false);
      }
    },
    []
  );

  return {
    createBatch,
    executeBatch,
    batching,
    batchSize,
  };
}

