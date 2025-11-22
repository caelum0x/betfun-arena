/**
 * Error handling utilities for Solana transactions
 */

export interface SolanaError {
  code?: number;
  name?: string;
  message: string;
  logs?: string[];
}

/**
 * Parse Solana transaction errors into user-friendly messages
 */
export function parseSolanaError(error: any): string {
  if (!error) {
    return "An unknown error occurred";
  }

  // Check for error message
  const errorMessage = error.message || error.toString();

  // Common Solana error patterns
  if (errorMessage.includes("insufficient funds") || errorMessage.includes("InsufficientFunds")) {
    return "Insufficient SOL balance. Please add more SOL to your wallet.";
  }

  if (errorMessage.includes("User rejected") || errorMessage.includes("UserCancel")) {
    return "Transaction cancelled by user.";
  }

  if (errorMessage.includes("Network") || errorMessage.includes("ECONNREFUSED")) {
    return "Network error. Please check your connection and try again.";
  }

  if (errorMessage.includes("TransactionExpiredBlockheightExceeded")) {
    return "Transaction expired. Please try again.";
  }

  if (errorMessage.includes("BlockhashNotFound")) {
    return "Blockhash not found. Please try again.";
  }

  if (errorMessage.includes("SlippageToleranceExceeded")) {
    return "Slippage tolerance exceeded. The price moved too much. Please try again.";
  }

  if (errorMessage.includes("InsufficientLiquidity")) {
    return "Insufficient liquidity in the pool. Please try a smaller amount.";
  }

  if (errorMessage.includes("AlreadyResolved") || errorMessage.includes("ArenaEnded")) {
    return "This arena has already ended or been resolved.";
  }

  if (errorMessage.includes("InvalidOutcome")) {
    return "Invalid outcome selected. Please choose a valid outcome.";
  }

  if (errorMessage.includes("Unauthorized")) {
    return "You are not authorized to perform this action.";
  }

  if (errorMessage.includes("ArithmeticOverflow")) {
    return "Amount too large. Please try a smaller amount.";
  }

  // Anchor program errors
  if (error.code) {
    return parseAnchorError(error.code, errorMessage);
  }

  // Check error logs for more details
  if (error.logs && Array.isArray(error.logs)) {
    for (const log of error.logs) {
      if (log.includes("insufficient funds")) {
        return "Insufficient SOL balance. Please add more SOL to your wallet.";
      }
      if (log.includes("slippage")) {
        return "Slippage tolerance exceeded. Please try again.";
      }
    }
  }

  // Return original message if no pattern matches
  return errorMessage.length > 200 
    ? errorMessage.substring(0, 200) + "..." 
    : errorMessage;
}

/**
 * Parse Anchor program error codes
 */
function parseAnchorError(code: number, defaultMessage: string): string {
  const errorMap: Record<number, string> = {
    6000: "Insufficient funds for this transaction.",
    6001: "Invalid configuration. Please check your inputs.",
    6002: "Arena has already been resolved.",
    6003: "Arena has ended.",
    6004: "Invalid outcome selected.",
    6005: "Unauthorized action.",
    6006: "Invalid amount specified.",
    6007: "Slippage tolerance exceeded.",
    6008: "Insufficient liquidity.",
    6009: "Arithmetic overflow. Amount too large.",
  };

  return errorMap[code] || defaultMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || "";
  
  const retryablePatterns = [
    "Network",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "TransactionExpiredBlockheightExceeded",
    "BlockhashNotFound",
    "timeout",
    "connection",
  ];

  return retryablePatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if user has insufficient balance
 */
export function isInsufficientBalanceError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || "";
  
  return errorMessage.includes("insufficient funds") ||
         errorMessage.includes("InsufficientFunds") ||
         errorMessage.includes("insufficient SOL");
}

/**
 * Get suggested action for error
 */
export function getErrorAction(error: any): {
  action: string;
  message: string;
  retryable: boolean;
} {
  const parsedMessage = parseSolanaError(error);
  const retryable = isRetryableError(error);
  const insufficientBalance = isInsufficientBalanceError(error);

  if (insufficientBalance) {
    return {
      action: "add_funds",
      message: parsedMessage,
      retryable: false,
    };
  }

  if (retryable) {
    return {
      action: "retry",
      message: parsedMessage,
      retryable: true,
    };
  }

  return {
    action: "show_error",
    message: parsedMessage,
    retryable: false,
  };
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: any): {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
} {
  const parsed = parseSolanaError(error);
  const { action, retryable } = getErrorAction(error);

  let title = "Transaction Failed";
  if (isInsufficientBalanceError(error)) {
    title = "Insufficient Balance";
  } else if (isRetryableError(error)) {
    title = "Network Error";
  }

  return {
    title,
    message: parsed,
    action,
    retryable,
  };
}

