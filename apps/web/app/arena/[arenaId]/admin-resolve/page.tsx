"use client";

import { use, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { WalletMultiButton } from "../../../../components/WalletMultiButton";
import { useArena } from "../../../../hooks/useArena";
import { formatSOL } from "../../../../lib/utils";

/**
 * Admin Resolve Screen (Creator Only)
 * USERFLOW.md spec: Show current odds, pot distribution, reason input
 */
export default function AdminResolvePage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { arena, loading, resolveArena } = useArena(arenaId);
  
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [resolving, setResolving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 mx-auto mb-lg border-4 border-electric-purple border-t-transparent rounded-full" />
          <p className="text-body text-light-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md bg-black">
        <div className="text-6xl mb-lg">⚠️</div>
        <h1 className="text-h1 font-bold mb-md">Arena Not Found</h1>
        <Link href="/feed">
          <Button>Back to Feed</Button>
        </Link>
      </div>
    );
  }

  const isCreator = publicKey && arena.creator.toString() === publicKey.toString();

  if (!isCreator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md bg-black">
        <div className="text-6xl mb-lg">🔒</div>
        <h1 className="text-h1 font-bold mb-md">Access Denied</h1>
        <p className="text-body text-light-gray mb-lg">
          Only the arena creator can resolve this arena
        </p>
        <Link href={`/arena/${arenaId}`}>
          <Button>Back to Arena</Button>
        </Link>
      </div>
    );
  }

  if (arena.resolved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md bg-black">
        <div className="text-6xl mb-lg">✅</div>
        <h1 className="text-h1 font-bold mb-md">Already Resolved</h1>
        <p className="text-body text-light-gray mb-lg">
          This arena has already been resolved
        </p>
        <Link href={`/arena/${arenaId}/resolve`}>
          <Button>View Results</Button>
        </Link>
      </div>
    );
  }

  const totalPot = arena.pot.toNumber();
  const outcomePots = arena.outcomePots.map((p) => p.toNumber());
  const outcomePercentages = outcomePots.map((pot) =>
    totalPot > 0 ? (pot / totalPot) * 100 : 0
  );

  const handleResolve = async () => {
    if (selectedOutcome === null || !connected) return;

    const confirmed = confirm(
      `Resolve arena as "${arena.outcomes[selectedOutcome]}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setResolving(true);
    try {
      await resolveArena(selectedOutcome);
      router.push(`/arena/${arenaId}/resolve`);
    } catch (error) {
      console.error("Error resolving arena:", error);
      alert("Failed to resolve arena. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href={`/arena/${arenaId}`} className="flex items-center gap-2">
            <span className="text-2xl">←</span>
            <span className="text-body-large font-bold">Resolve Market</span>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Arena Info */}
          <Card className="p-lg mb-lg">
            <h1 className="text-h2 font-bold text-white mb-md">
              {arena.question}
            </h1>
            
            {/* Current Odds - USERFLOW.md spec */}
            <div className="bg-medium-gray/20 rounded-lg p-md mb-lg">
              <p className="text-body-small text-light-gray mb-sm">
                Current odds:
              </p>
              <div className="flex items-center gap-md flex-wrap">
                {arena.outcomes.map((outcome, idx) => (
                  <span
                    key={idx}
                    className="text-body font-medium"
                    style={{
                      color: idx === 0 ? "#39FF14" : "#FF2D55",
                    }}
                  >
                    {outcome} {outcomePercentages[idx].toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-md text-center mb-lg">
              <div className="bg-medium-gray/20 rounded-lg p-md">
                <p className="text-body-small text-light-gray mb-xs">Total Pot</p>
                <p className="text-h3 font-bold text-electric-purple">
                  {formatSOL(totalPot)} SOL
                </p>
              </div>
              <div className="bg-medium-gray/20 rounded-lg p-md">
                <p className="text-body-small text-light-gray mb-xs">Players</p>
                <p className="text-h3 font-bold text-white">
                  {arena.participantsCount}
                </p>
              </div>
            </div>
          </Card>

          {/* Outcome Selection - USERFLOW.md spec */}
          <Card className="p-lg mb-lg">
            <h3 className="text-h3 font-bold mb-md">Winning outcome:</h3>
            
            <div className="space-y-sm mb-lg">
              {arena.outcomes.map((outcome, idx) => {
                const outcomePot = outcomePots[idx];
                const percentage = outcomePercentages[idx];
                const isSelected = selectedOutcome === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOutcome(idx)}
                    className={`w-full text-left p-md rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-electric-purple bg-electric-purple/20 shadow-glow-purple"
                        : "border-medium-gray bg-medium-gray/10 hover:border-light-gray"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-electric-purple bg-electric-purple"
                              : "border-light-gray"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-3 h-3 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-body-large font-bold text-white">
                          {outcome}
                        </span>
                      </div>
                      
                      {/* Pot Distribution - USERFLOW.md spec */}
                      <div className="text-right">
                        <p className="text-body-small text-light-gray">
                          {percentage.toFixed(0)}% of pot
                        </p>
                        <p className="text-body font-medium text-white">
                          {formatSOL(outcomePot)} SOL
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Reason Input - USERFLOW.md spec: Inter 16px */}
            <div>
              <label className="block text-body font-medium text-white mb-sm">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="He just posted Shiba #69!"
                className="w-full bg-dark-gray border border-medium-gray rounded-lg px-4 py-3 text-white placeholder:text-light-gray focus:outline-none focus:border-electric-purple focus:shadow-glow-purple transition-all"
                style={{
                  fontFamily: '"Inter", system-ui, sans-serif',
                  fontSize: "16px",
                  minHeight: "80px",
                }}
                maxLength={280}
              />
              <p className="text-body-small text-light-gray mt-xs">
                {reason.length}/280 characters
              </p>
            </div>
          </Card>

          {/* Resolve Button - USERFLOW.md spec: red 56px button */}
          <Button
            onClick={handleResolve}
            disabled={selectedOutcome === null || resolving}
            className="w-full font-bold transition-all"
            style={{
              height: "56px",
              fontSize: "18px",
              background: selectedOutcome !== null ? "#FF2D55" : "#666666",
              color: "white",
            }}
          >
            {resolving && <span className="spinner w-5 h-5 mr-2" />}
            {resolving ? "Resolving..." : "RESOLVE & PAY OUT"}
          </Button>

          {selectedOutcome === null && (
            <p className="text-body-small text-light-gray text-center mt-sm">
              Select a winning outcome to continue
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

