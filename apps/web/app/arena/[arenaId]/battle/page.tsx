"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ModdioBattle } from "../../../../components/ModdioBattle";
import { Button } from "../../../../components/ui/button";
import { ShareToXButton } from "../../../../components/ShareToXButton";
import { supabase } from "../../../../lib/supabase/client";
import type { Arena } from "../../../../lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function BattlePage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const arenaId = params.arenaId as string;

  const [arena, setArena] = useState<Arena | null>(null);
  const [userPosition, setUserPosition] = useState<{
    outcome: number;
    amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch arena data
  useEffect(() => {
    const fetchArena = async () => {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("arenas")
          .select("*")
          .eq("arena_account", arenaId)
          .single();

        if (error) throw error;
        setArena(data);

        // Check if resolved → redirect to win screen
        if (data.is_resolved) {
          router.push(`/arena/${arenaId}?tab=results`);
        }
      } catch (error) {
        console.error("Error fetching arena:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArena();

    // Subscribe to real-time updates
    if (!supabase) return;
    
    const subscription = supabase
      .channel(`arena:${arenaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arenas",
          filter: `arena_account=eq.${arenaId}`,
        },
        (payload) => {
          setArena(payload.new as Arena);
          
          // Redirect if resolved
          if ((payload.new as Arena).is_resolved) {
            router.push(`/arena/${arenaId}?tab=results`);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };

    return () => {
      subscription.unsubscribe();
    };
  }, [arenaId, router]);

  // Fetch user position
  useEffect(() => {
    const fetchUserPosition = async () => {
      if (!publicKey) return;

      try {
        const { data, error } = await supabase
          .from("participants")
          .select("*")
          .eq("arena_account", arenaId)
          .eq("wallet", publicKey.toBase58())
          .single();

        if (error) {
          // No position found
          setUserPosition(null);
        } else {
          setUserPosition({
            outcome: data.outcome,
            amount: data.amount,
          });
        }
      } catch (error) {
        console.error("Error fetching user position:", error);
      }
    };

    fetchUserPosition();
  }, [arenaId, publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin w-12 h-12 border-4 border-electric-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-6xl mb-md">❌</div>
          <h3 className="text-h2 font-bold mb-md">Arena not found</h3>
          <Button onClick={() => router.push("/feed")} variant="outline">
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  const timeLeft = arena.end_time
    ? formatDistanceToNow(new Date(arena.end_time), { addSuffix: true })
    : "No deadline";

  const outcomeLabels = ["Yes", "No"]; // Simplified for binary markets

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Full-screen Moddio Battle Iframe */}
      <ModdioBattle
        arenaId={arenaId}
        userOutcome={userPosition?.outcome}
        userBetAmount={userPosition?.amount}
        userWallet={publicKey?.toBase58()}
      />

      {/* Top Overlay Bar - Pot & Countdown */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/70 to-transparent px-md py-lg"
      >
        <div className="container mx-auto flex items-center justify-between">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/arena/${arenaId}`)}
            className="backdrop-blur-md bg-medium-gray/20"
          >
            ← Back
          </Button>

          {/* Pot Display */}
          <div className="flex items-center gap-lg">
            <div className="backdrop-blur-md bg-medium-gray/20 px-lg py-sm rounded-lg border border-electric-purple/30">
              <span className="text-body-small text-light-gray mr-2">Total Pot</span>
              <span className="text-h3 font-bold text-electric-purple">
                {(arena.pot / 1e9).toFixed(2)} SOL
              </span>
            </div>

            <div className="backdrop-blur-md bg-medium-gray/20 px-lg py-sm rounded-lg border border-hot-pink/30">
              <span className="text-body-small text-light-gray mr-2">⏰</span>
              <span className="text-body font-medium">{timeLeft}</span>
            </div>
          </div>

          {/* User Position Indicator */}
          {userPosition && (
            <div className="backdrop-blur-md bg-neon-green/20 px-lg py-sm rounded-lg border border-neon-green/50">
              <span className="text-body-small text-light-gray mr-2">Your bet:</span>
              <span className="text-body font-bold text-neon-green">
                {outcomeLabels[userPosition.outcome]} •{" "}
                {(userPosition.amount / 1e9).toFixed(2)} SOL
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Overlay Bar - Actions */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-md py-lg"
      >
        <div className="container mx-auto flex items-center justify-center gap-lg">
          {/* Share Button */}
          <ShareToXButton
            text={`⚔️ Live battle in ${arena.question}\n\nTotal pot: ${(arena.pot / 1e9).toFixed(2)} SOL\n${arena.participants_count} warriors fighting!`}
            url={`https://betfun.arena/arena/${arenaId}/battle`}
          />

          {/* Place Bet Button (if not already bet) */}
          {!userPosition && connected && (
            <Button
              variant="success"
              size="lg"
              onClick={() => router.push(`/arena/${arenaId}`)}
              className="shadow-glow-green"
            >
              <span className="mr-2">💰</span>
              Place Your Bet
            </Button>
          )}

          {/* Meta-Bet on Winner (future feature) */}
          <Button
            variant="outline"
            size="lg"
            disabled
            className="opacity-50"
          >
            <span className="mr-2">🎯</span>
            Meta-Bet (Soon)
          </Button>

          {/* Watch Mode Indicator */}
          {!userPosition && (
            <div className="backdrop-blur-md bg-medium-gray/20 px-lg py-sm rounded-lg border border-light-gray/30">
              <span className="text-body-small text-light-gray">
                👁️ Spectator Mode
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Connect Wallet Overlay (if not connected) */}
      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center max-w-md mx-auto p-2xl bg-dark-gray rounded-2xl border border-electric-purple/30">
              <div className="text-6xl mb-md">🔒</div>
              <h3 className="text-h2 font-bold mb-md">Connect to Join Battle</h3>
              <p className="text-body text-light-gray mb-lg">
                Connect your wallet to place bets and join the live arena
              </p>
              <Button
                variant="default"
                size="lg"
                onClick={() => router.push(`/arena/${arenaId}`)}
              >
                Connect Wallet
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

