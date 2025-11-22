/**
 * Transaction deduplication utility
 * Prevents processing the same transaction multiple times
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

// In-memory cache for processed transactions (TTL: 1 hour)
const processedCache = new Map<string, number>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Check if transaction has already been processed
 */
export async function isProcessed(signature: string): Promise<boolean> {
  // Check in-memory cache first
  const cached = processedCache.get(signature);
  if (cached && Date.now() - cached < CACHE_TTL) {
    return true;
  }

  // Check database
  const { data } = await supabase
    .from("processed_transactions")
    .select("signature")
    .eq("signature", signature)
    .single();

  if (data) {
    // Update cache
    processedCache.set(signature, Date.now());
    return true;
  }

  return false;
}

/**
 * Mark transaction as processed
 */
export async function markProcessed(signature: string): Promise<void> {
  // Add to cache
  processedCache.set(signature, Date.now());

  // Store in database
  await supabase.from("processed_transactions").insert({
    signature,
    processed_at: new Date().toISOString(),
  });

  // Cleanup old cache entries
  if (processedCache.size > 10000) {
    const now = Date.now();
    for (const [sig, timestamp] of processedCache.entries()) {
      if (now - timestamp > CACHE_TTL) {
        processedCache.delete(sig);
      }
    }
  }
}

/**
 * Clear processed transaction (for testing)
 */
export async function clearProcessed(signature: string): Promise<void> {
  processedCache.delete(signature);
  await supabase
    .from("processed_transactions")
    .delete()
    .eq("signature", signature);
}

