"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { formatErrorForDisplay } from "@/lib/errorHandler";

interface TransactionStatusProps {
  signature: string | null;
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function TransactionStatus({
  signature,
  error,
  onRetry,
  onDismiss,
}: TransactionStatusProps) {
  const { connection } = useConnection();
  const [status, setStatus] = useState<"pending" | "confirmed" | "failed">("pending");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (signature && !confirmed) {
      checkTransactionStatus(signature);
    }
  }, [signature, confirmed]);

  const checkTransactionStatus = async (sig: string) => {
    try {
      const tx = await connection.getSignatureStatus(sig);
      
      if (tx.value?.err) {
        setStatus("failed");
      } else if (tx.value?.confirmationStatus === "confirmed" || tx.value?.confirmationStatus === "finalized") {
        setStatus("confirmed");
        setConfirmed(true);
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
    }
  };

  if (error) {
    const errorInfo = formatErrorForDisplay(error);
    
    return (
      <Card className="bg-red-500/10 border-red-500/50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
          <div className="flex-1 text-red-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{errorInfo.title}</p>
                <p className="text-sm">{errorInfo.message}</p>
              </div>
              {errorInfo.retryable && onRetry && (
                <Button
                  size="sm"
                  onClick={onRetry}
                  className="ml-4 border border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (signature) {
    const explorerUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;
    
    if (status === "confirmed") {
      return (
        <Card className="bg-green-500/10 border-green-500/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div className="flex-1 text-green-400">
              <div className="flex items-center justify-between">
                <span>Transaction confirmed!</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm hover:underline"
                >
                  View on Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-blue-500/10 border-blue-500/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <div className="flex-1 text-blue-400">
            <div className="flex items-center justify-between">
              <span>Transaction pending...</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm hover:underline"
              >
                View on Solscan
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
