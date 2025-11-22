import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { createBetFunClient, Arena, Participant } from "@betfun/sdk";
import { cache, cacheKeys, withCache } from "@/lib/cache";

export function useArena(arenaAddress: string | null) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [arena, setArena] = useState<Arena | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArena = useCallback(async () => {
    if (!arenaAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = cacheKeys.arena(arenaAddress);
      const arenaData = await withCache(
        cacheKey,
        async () => {
          const client = createBetFunClient(connection, wallet);
          const arenaPDA = new PublicKey(arenaAddress);
          return await client.getArena(arenaPDA);
        },
        30000 // 30 second cache
      );
      
      if (arenaData) {
        setArena(arenaData);
      } else {
        setError("Arena not found");
      }
    } catch (err) {
      console.error("Error fetching arena:", err);
      setError("Failed to load arena");
    } finally {
      setLoading(false);
    }
  }, [arenaAddress, connection, wallet]);

  useEffect(() => {
    fetchArena();

    // Poll for updates every 10 seconds (cache will prevent unnecessary requests)
    const interval = setInterval(fetchArena, 10000);
    return () => clearInterval(interval);
  }, [fetchArena]);

  const joinArena = async (outcomeIndex: number) => {
    if (!arenaAddress || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const client = createBetFunClient(connection, wallet);
    const arenaPDA = new PublicKey(arenaAddress);
    const result = await client.joinArena(arenaPDA, outcomeIndex);
    
    // Refresh arena data
    const updatedArena = await client.getArena(arenaPDA);
    if (updatedArena) {
      setArena(updatedArena);
    }

    return result;
  };

  const resolveArena = async (winnerOutcome: number) => {
    if (!arenaAddress || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const client = createBetFunClient(connection, wallet);
    const arenaPDA = new PublicKey(arenaAddress);
    const signature = await client.resolveArena(arenaPDA, winnerOutcome);
    
    // Refresh arena data
    const updatedArena = await client.getArena(arenaPDA);
    if (updatedArena) {
      setArena(updatedArena);
    }

    return signature;
  };

  const claimWinnings = async () => {
    if (!arenaAddress || !wallet.publicKey || !arena) {
      throw new Error("Invalid state");
    }

    const client = createBetFunClient(connection, wallet);
    const arenaPDA = new PublicKey(arenaAddress);
    const signature = await client.claimWinnings(arenaPDA, arena.creator);

    return signature;
  };

  return {
    arena,
    loading,
    error,
    joinArena,
    resolveArena,
    claimWinnings,
  };
}

export function useUserPosition(arenaAddress: string | null) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!arenaAddress || !wallet.publicKey) {
      setLoading(false);
      return;
    }

    const fetchParticipant = async () => {
      try {
        setLoading(true);
        const client = createBetFunClient(connection, wallet);
        const arenaPDA = new PublicKey(arenaAddress);
        const [participantPDA] = client.getParticipantPDA(arenaPDA, wallet.publicKey!);
        const participantData = await client.getParticipant(participantPDA);
        
        setParticipant(participantData);
      } catch (err) {
        // User hasn't joined yet
        setParticipant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipant();

    const interval = setInterval(fetchParticipant, 10000);
    return () => clearInterval(interval);
  }, [arenaAddress, wallet.publicKey, connection]);

  return { participant, loading };
}

