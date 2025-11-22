import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "../lib/supabase/client";
import type { Participant } from "../lib/supabase/client";

export function useUserPositions() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setPositions([]);
      setLoading(false);
      return;
    }

    const fetchPositions = async () => {
      try {
        setLoading(true);
        
        if (!supabase) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("participants")
          .select("*, arena:arenas(*)")
          .eq("wallet", publicKey.toString())
          .order("joined_at", { ascending: false });

        if (error) throw error;

        setPositions(data || []);
      } catch (error) {
        console.error("Error fetching user positions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [publicKey]);

  return { positions, loading };
}

