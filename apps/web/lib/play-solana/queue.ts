/**
 * Score queuing system for Play Solana
 * Queues scores when offline and submits when online
 */

interface QueuedScore {
  wallet: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: number;
  attempts: number;
}

const QUEUE_KEY = "play-solana-score-queue";
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = 100;

/**
 * Queue a score for later submission
 */
export function queueScore(
  wallet: string,
  score: number,
  metadata?: Record<string, any>
): void {
  if (typeof window === "undefined") return;

  try {
    const queue = getQueue();
    
    // Prevent queue overflow
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn("Score queue full, dropping oldest entry");
      queue.shift();
    }

    queue.push({
      wallet,
      score,
      metadata,
      timestamp: Date.now(),
      attempts: 0,
    });

    saveQueue(queue);
  } catch (error) {
    console.error("Error queueing score:", error);
  }
}

/**
 * Get queued scores
 */
export function getQueue(): QueuedScore[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading score queue:", error);
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: QueuedScore[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving score queue:", error);
  }
}

/**
 * Remove a score from queue
 */
export function removeFromQueue(index: number): void {
  const queue = getQueue();
  queue.splice(index, 1);
  saveQueue(queue);
}

/**
 * Process queued scores
 */
export async function processQueue(
  submitFn: (wallet: string, score: number, metadata?: Record<string, any>) => Promise<void>
): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  const processed: number[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    
    // Skip if too many attempts
    if (item.attempts >= MAX_ATTEMPTS) {
      console.warn(`Dropping score after ${MAX_ATTEMPTS} failed attempts:`, item);
      processed.push(i);
      continue;
    }

    try {
      await submitFn(item.wallet, item.score, item.metadata);
      processed.push(i);
    } catch (error) {
      // Increment attempts
      item.attempts++;
      console.warn(`Failed to submit queued score (attempt ${item.attempts}):`, error);
    }
  }

  // Remove processed items (in reverse to maintain indices)
  for (let i = processed.length - 1; i >= 0; i--) {
    removeFromQueue(processed[i]);
  }

  // Save updated queue
  if (processed.length > 0) {
    saveQueue(queue);
  }
}

/**
 * Clear queue
 */
export function clearQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  return getQueue().length;
}

