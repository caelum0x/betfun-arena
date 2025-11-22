/**
 * Retry utility for Play Solana API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function retryPlaySolana<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Don't retry on 4xx errors (client errors)
      if (errorMessage.includes("400") || errorMessage.includes("401") || errorMessage.includes("403")) {
        throw error;
      }

      if (attempt === opts.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      console.warn(`Play Solana API retry ${attempt}/${opts.maxAttempts} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Retry failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

