import { PLAY_SOLANA_API_URL, PLAY_SOLANA_API_KEY } from "../constants";
import { retryPlaySolana } from "./retry";
import { validateScoreSubmission } from "./validator";
import { queueScore, processQueue } from "./queue";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username?: string;
  score: number;
  level: number;
  achievements: string[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

/**
 * Submit score to Play Solana leaderboard
 * With validation, retry logic, and offline queuing
 */
export async function submitScore(
  wallet: string,
  score: number,
  metadata?: Record<string, any>
): Promise<void> {
  if (!PLAY_SOLANA_API_KEY) {
    console.warn("Play Solana API key not configured, queueing score");
    queueScore(wallet, score, metadata);
    return;
  }

  // Validate before submission
  const validation = validateScoreSubmission(wallet, score, metadata);
  if (!validation.valid) {
    throw new Error(`Score validation failed: ${validation.error}`);
  }

  // Check if online
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.warn("Offline, queueing score for later submission");
    queueScore(wallet, score, metadata);
    return;
  }

  try {
    await retryPlaySolana(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(`${PLAY_SOLANA_API_URL}/scores`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PLAY_SOLANA_API_KEY}`,
          },
          body: JSON.stringify({
            wallet,
            score,
            game: "betfun-arena",
            metadata,
            timestamp: Date.now(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Play Solana API error (${response.status}): ${errorText || response.statusText}`
          );
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Play Solana API request timeout");
        }
        throw error;
      }
    });
  } catch (error) {
    console.error("Error submitting score, queueing for retry:", error);
    // Queue for later retry
    queueScore(wallet, score, metadata);
    throw error;
  }
}

/**
 * Process queued scores (call this when app comes online)
 */
export async function processQueuedScores(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  await processQueue(submitScore);
}

// Auto-process queue when coming online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Connection restored, processing queued scores...");
    processQueuedScores().catch(console.error);
  });
}

/**
 * Fetch global leaderboard
 */
export async function getLeaderboard(
  timeframe: "daily" | "weekly" | "all-time" = "all-time",
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(
      `${PLAY_SOLANA_API_URL}/leaderboard?game=betfun-arena&timeframe=${timeframe}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${PLAY_SOLANA_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Play Solana API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
}

/**
 * Get user rank
 */
export async function getUserRank(wallet: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${PLAY_SOLANA_API_URL}/users/${wallet}/rank?game=betfun-arena`,
      {
        headers: {
          Authorization: `Bearer ${PLAY_SOLANA_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const { rank } = await response.json();
    return rank;
  } catch (error) {
    console.error("Error fetching user rank:", error);
    return null;
  }
}

/**
 * Unlock achievement
 */
export async function unlockAchievement(
  wallet: string,
  achievementId: string
): Promise<void> {
  if (!PLAY_SOLANA_API_KEY) return;

  try {
    const response = await fetch(`${PLAY_SOLANA_API_URL}/achievements/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PLAY_SOLANA_API_KEY}`,
      },
      body: JSON.stringify({
        wallet,
        achievementId,
        game: "betfun-arena",
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Play Solana API error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error unlocking achievement:", error);
  }
}

/**
 * Get user achievements
 */
export async function getUserAchievements(
  wallet: string
): Promise<Achievement[]> {
  try {
    const response = await fetch(
      `${PLAY_SOLANA_API_URL}/users/${wallet}/achievements?game=betfun-arena`,
      {
        headers: {
          Authorization: `Bearer ${PLAY_SOLANA_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
}

/**
 * Calculate level from score
 */
export function calculateLevel(score: number): number {
  // Simple level calculation: level = floor(sqrt(score / 1000))
  return Math.floor(Math.sqrt(score / 1000)) + 1;
}

/**
 * Calculate XP needed for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 1000;
}

