"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase/client";

interface PlatformStats {
  totalArenas: number;
  totalVolume: number; // in lamports
  activeArenas: number;
}

/**
 * Hook to fetch real-time platform statistics
 * Updates every 30 seconds
 */
export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats>({
    totalArenas: 0,
    totalVolume: 0,
    activeArenas: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      if (!supabase) {
        // Supabase not configured, use default stats
        setStats({
          totalArenas: 0,
          totalVolume: 0,
          activeArenas: 0,
        });
        setLoading(false);
        return;
      }

      // Get total arenas count
      const { count: totalArenas, error: countError } = await supabase
        .from("arenas")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      // Get total volume (sum of all pots)
      const { data: volumeData, error: volumeError } = await supabase
        .from("arenas")
        .select("pot");

      if (volumeError) throw volumeError;

      const totalVolume = volumeData?.reduce((sum, arena) => sum + (arena.pot || 0), 0) || 0;

      // Get active arenas (not resolved, not ended)
      const { count: activeArenas, error: activeError } = await supabase
        .from("arenas")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false)
        .gt("end_time", new Date().toISOString());

      if (activeError) throw activeError;

      setStats({
        totalArenas: totalArenas || 0,
        totalVolume,
        activeArenas: activeArenas || 0,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      // Keep previous stats instead of mock values
      // This prevents showing fake data to users
      setStats((prev) => prev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Update every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  return { stats, loading };
}

