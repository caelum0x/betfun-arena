import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionError } from "@solana/web3.js";
import { 
  parseSolanaError, 
  isRetryableError, 
  formatErrorForDisplay,
  getErrorAction 
} from "@/lib/errorHandler";

interface TransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Hook for handling transactions with retry logic and error handling
 */
export function useTransaction() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTransaction = useCallback(
    async (
      transaction: Transaction,
      options: TransactionOptions = {}
    ): Promise<string> => {
      if (!wallet.publicKey || !wallet.sendTransaction) {
        throw new Error("Wallet not connected");
      }

      const {
        skipPreflight = false,
        maxRetries = 3,
        retryDelay = 1000,
      } = options;

      setSending(true);
      setError(null);

      let lastError: any = null;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          // Get latest blockhash
          const { blockhash, lastValidBlockHeight } = 
            await connection.getLatestBlockhash("confirmed");

          transaction.recentBlockhash = blockhash;
          transaction.feePayer = wallet.publicKey;

          // Send transaction
          const signature = await wallet.sendTransaction(
            transaction,
            connection,
            { skipPreflight }
          );

          // Wait for confirmation
          await connection.confirmTransaction(
            {
              signature,
              blockhash,
              lastValidBlockHeight,
            },
            "confirmed"
          );

          setSending(false);
          return signature;
        } catch (err: any) {
          lastError = err;
          attempt++;

          // Check if error is retryable
          if (!isRetryableError(err) || attempt >= maxRetries) {
            break;
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }

      // All retries failed
      const errorMessage = parseSolanaError(lastError);
      setError(errorMessage);
      setSending(false);
      throw lastError;
    },
    [connection, wallet]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendTransaction,
    sending,
    error: error ? formatErrorForDisplay({ message: error }) : null,
    clearError,
  };
}

