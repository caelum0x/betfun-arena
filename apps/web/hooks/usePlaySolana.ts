"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PLAY_SOLANA_PROJECT_ID, PLAY_SOLANA_API_KEY, PLAY_SOLANA_API_URL } from "../lib/constants";

/**
 * Play Solana SDK Integration
 * SPONSOR_APIS.md spec: project ID "betfun-arena-2025"
 */

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  username?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export function usePlaySolana() {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit score to leaderboard
  const submitScore = async (leaderboardId: string, score: number) => {
    if (!publicKey || !PLAY_SOLANA_API_KEY) {
      console.warn("Play Solana not configured or wallet not connected");
      return;
    }

    try {
      const response = await fetch(
        `${PLAY_SOLANA_API_URL}/leaderboards/${leaderboardId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PLAY_SOLANA_API_KEY,
          },
          body: JSON.stringify({
            projectId: PLAY_SOLANA_PROJECT_ID,
            wallet: publicKey.toBase58(),
            score,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Play Solana API error: ${response.statusText}`);
      }

      console.log("Score submitted to Play Solana:", score);
    } catch (error) {
      console.error("Failed to submit score to Play Solana:", error);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async (leaderboardId: string, limit = 100) => {
    try {
      const response = await fetch(
        `${PLAY_SOLANA_API_URL}/leaderboards/${leaderboardId}?projectId=${PLAY_SOLANA_PROJECT_ID}&limit=${limit}`,
        {
          headers: {
            "X-API-Key": PLAY_SOLANA_API_KEY || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Play Solana API error: ${response.statusText}`);
      }

      const data = await response.json();
      setLeaderboard(data.entries || []);

      // Find user's rank
      if (publicKey) {
        const userEntry = data.entries.find(
          (entry: LeaderboardEntry) => entry.wallet === publicKey.toBase58()
        );
        setUserRank(userEntry ? userEntry.rank : null);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      // Use real API from play-solana/leaderboard instead of mock data
      try {
        const { getLeaderboard } = await import("../lib/play-solana/leaderboard");
        const realLeaderboard = await getLeaderboard("all-time", limit);
        setLeaderboard(realLeaderboard);
        
        // Find user's rank
        if (publicKey) {
          const { getUserRank } = await import("../lib/play-solana/leaderboard");
          const rank = await getUserRank(publicKey.toBase58());
          setUserRank(rank);
        }
      } catch (fallbackError) {
        console.error("Fallback leaderboard fetch also failed:", fallbackError);
        setLeaderboard([]); // Empty array instead of mock data
      }
    } finally {
      setLoading(false);
    }
  };

  // Unlock achievement
  const unlockAchievement = async (achievementId: string) => {
    if (!publicKey || !PLAY_SOLANA_API_KEY) {
      console.warn("Play Solana not configured or wallet not connected");
      return;
    }

    try {
      const response = await fetch(
        `${PLAY_SOLANA_API_URL}/achievements/${achievementId}/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PLAY_SOLANA_API_KEY,
          },
          body: JSON.stringify({
            projectId: PLAY_SOLANA_PROJECT_ID,
            wallet: publicKey.toBase58(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Play Solana API error: ${response.statusText}`);
      }

      console.log("Achievement unlocked:", achievementId);
    } catch (error) {
      console.error("Failed to unlock achievement:", error);
    }
  };

  // Fetch user achievements
  const fetchAchievements = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `${PLAY_SOLANA_API_URL}/achievements?projectId=${PLAY_SOLANA_PROJECT_ID}&wallet=${publicKey.toBase58()}`,
        {
          headers: {
            "X-API-Key": PLAY_SOLANA_API_KEY || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Play Solana API error: ${response.statusText}`);
      }

      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
      // Use real API from play-solana/leaderboard instead of mock data
      try {
        const { getUserAchievements } = await import("../lib/play-solana/leaderboard");
        const realAchievements = await getUserAchievements(publicKey.toBase58());
        setAchievements(realAchievements.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlocked: !!a.unlockedAt,
          unlockedAt: a.unlockedAt?.toISOString(),
        })));
      } catch (fallbackError) {
        console.error("Fallback achievements fetch also failed:", fallbackError);
        setAchievements([]); // Empty array instead of mock data
      }
    }
  };

  return {
    leaderboard,
    userRank,
    achievements,
    loading,
    submitScore,
    fetchLeaderboard,
    unlockAchievement,
    fetchAchievements,
  };
}

