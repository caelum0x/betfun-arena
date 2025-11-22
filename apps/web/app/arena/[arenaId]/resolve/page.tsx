"use client";

import { use, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { WalletMultiButton } from "../../../../components/WalletMultiButton";
import { ConfettiExplosion, TrophyConfetti } from "../../../../components/ConfettiExplosion";
import { TrophyNFT } from "../../../../components/TrophyNFT";
import { ShareToXButton } from "../../../../components/ShareToXButton";
import { SolRainAnimation } from "../../../../components/SolRainAnimation";
import { useArena, useUserPosition } from "../../../../hooks/useArena";
import { formatSOL, playSound, triggerHaptic } from "../../../../lib/utils";
import { APP_URL } from "../../../../lib/constants";

export default function ResolvePage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { arena, loading, claimWinnings } = useArena(arenaId);
  const { participant } = useUserPosition(arenaId);
  
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [payout, setPayout] = useState<number | null>(null);

  useEffect(() => {
    if (arena && participant && participant.outcomeChosen === arena.winnerOutcome) {
      playSound("victory.mp3", 0.7);
      triggerHaptic("heavy");
    }
  }, [arena, participant]);

  const handleClaim = async () => {
    if (!connected || !arena || !participant) return;

    setClaiming(true);
    try {
      await claimWinnings();
      
      // Calculate payout (simplified - actual is in smart contract)
      const totalPot = arena.pot.toNumber();
      const winnerPot = arena.outcomePots[arena.winnerOutcome || 0].toNumber();
      const creatorFee = (totalPot * arena.creatorFeeBps) / 10000;
      const distributablePot = totalPot - creatorFee;
      const calculatedPayout = (participant.amount.toNumber() * distributablePot) / winnerPot;
      
      setPayout(calculatedPayout);
      setClaimed(true);
      triggerHaptic("heavy");
    } catch (error) {
      console.error("Error claiming winnings:", error);
      alert("Failed to claim winnings. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-16 h-16 mx-auto mb-lg" />
          <p className="text-body text-light-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!arena || !arena.resolved || arena.winnerOutcome === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md">
        <div className="text-6xl mb-lg">⚠️</div>
        <h1 className="text-h1 font-bold mb-md">Arena Not Resolved</h1>
        <p className="text-body text-light-gray mb-lg">
          This arena hasn't been resolved yet
        </p>
        <Link href={`/arena/${arenaId}`}>
          <Button>Back to Arena</Button>
        </Link>
      </div>
    );
  }

  const winnerOutcome = arena.outcomes[arena.winnerOutcome];
  const didUserWin = participant && participant.outcomeChosen === arena.winnerOutcome;
  const userBet = participant ? participant.amount.toNumber() : 0;
  const profit = payout ? payout - userBet : 0;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Confetti */}
      {didUserWin && <ConfettiExplosion />}
      {claimed && <TrophyConfetti />}
      
      {/* SOL Rain Animation - USERFLOW.md spec: 5 seconds */}
      {didUserWin && <SolRainAnimation duration={5000} />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-body-large font-bold">Resolution</span>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-4xl">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-center mb-3xl"
        >
          <div className="text-8xl mb-lg animate-bounce">
            {didUserWin ? "🎉" : "😔"}
          </div>
          <h1 className="text-display font-bold text-gradient-green mb-md">
            {winnerOutcome} WON!
          </h1>
          <p className="text-h2 text-white mb-lg">{arena.title}</p>
        </motion.div>

        {/* User Result Card */}
        {participant && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card
              className={`p-lg mb-lg ${
                didUserWin
                  ? "bg-gradient-to-br from-neon-green/20 to-electric-purple/20 border-2 border-neon-green shadow-glow-green"
                  : "bg-dark-gray border border-medium-gray"
              }`}
            >
              <div className="text-center">
                {didUserWin ? (
                  <>
                    <h2 className="text-h1 font-bold text-neon-green mb-md">
                      YOU WON! 💰
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-lg mb-lg">
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">
                          You Bet
                        </p>
                        <p className="text-h2 font-bold text-white">
                          {formatSOL(userBet)} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">
                          {claimed ? "You Won" : "You'll Win"}
                        </p>
                        <p className="text-h2 font-bold text-neon-green">
                          {payout ? formatSOL(payout) : "~" + formatSOL(userBet * 2)} SOL
                        </p>
                      </div>
                    </div>

                    {profit > 0 && (
                      <div className="bg-neon-green/10 rounded-md p-md mb-lg">
                        <p className="text-body-large font-bold text-neon-green">
                          Profit: +{formatSOL(profit)} SOL (+
                          {((profit / userBet) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    )}

                    {!participant.claimed && !claimed && (
                      <Button
                        variant="success"
                        size="lg"
                        onClick={handleClaim}
                        disabled={claiming}
                        className="w-full"
                      >
                        {claiming && <span className="spinner w-5 h-5 mr-2" />}
                        {claiming ? "Claiming..." : "Claim Winnings 💰"}
                      </Button>
                    )}

                    {(participant.claimed || claimed) && (
                      <div className="bg-neon-green/20 border border-neon-green rounded-md p-lg">
                        <p className="text-body-large font-bold text-neon-green mb-sm">
                          ✅ Winnings Claimed!
                        </p>
                        <p className="text-body-small text-light-gray">
                          Check your wallet for the payout
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-h2 font-bold text-blood-red mb-md">
                      Better Luck Next Time
                    </h2>
                    <p className="text-body text-light-gray mb-md">
                      You bet {formatSOL(userBet)} SOL on{" "}
                      <span className="font-bold">
                        {arena.outcomes[participant.outcomeChosen]}
                      </span>
                    </p>
                    <p className="text-body-small text-light-gray">
                      But {winnerOutcome} won this round
                    </p>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Trophy NFT (if claimed) */}
        {claimed && didUserWin && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.5, duration: 1 }}
          >
            <div className="mb-lg">
              <h3 className="text-h2 font-bold text-center text-white mb-md">
                Trophy Earned! 🏆
              </h3>
              <div className="max-w-md mx-auto">
                <TrophyNFT
                  mint={
                    participant?.trophyMint
                      ? participant.trophyMint.toString()
                      : "Not minted yet"
                  }
                  arenaTitle={arena.title}
                  rarity={
                    userBet > 10000000000
                      ? "Legendary"
                      : userBet > 1000000000
                      ? "Epic"
                      : "Common"
                  }
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Breakdown */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card className="p-lg mb-lg">
            <h3 className="text-h3 font-bold text-white mb-md">
              Arena Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-center">
              <div>
                <p className="text-body-small text-light-gray mb-xs">Total Pot</p>
                <p className="text-body-large font-bold text-white">
                  {formatSOL(arena.pot.toNumber())} SOL
                </p>
              </div>
              <div>
                <p className="text-body-small text-light-gray mb-xs">Winners</p>
                <p className="text-body-large font-bold text-neon-green">
                  {arena.outcomeCounts[arena.winnerOutcome]} players
                </p>
              </div>
              <div>
                <p className="text-body-small text-light-gray mb-xs">
                  Creator Fee
                </p>
                <p className="text-body-large font-bold text-electric-purple">
                  {formatSOL((arena.pot.toNumber() * arena.creatorFeeBps) / 10000)} SOL
                </p>
              </div>
              <div>
                <p className="text-body-small text-light-gray mb-xs">
                  Total Players
                </p>
                <p className="text-body-large font-bold text-white">
                  {arena.participantsCount}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-md"
        >
          {didUserWin && (
            <ShareToXButton
              type="win"
              arenaTitle={arena.title}
              arenaUrl={`${APP_URL}/arena/${arenaId}`}
              amount={payout ? parseFloat(formatSOL(payout)) : parseFloat(formatSOL(userBet * 2))}
              className="w-full sm:w-auto"
            />
          )}
          
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="success" className="w-full">
              Play Again ⚔️
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

