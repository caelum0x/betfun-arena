"use client";

import { use, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { WalletMultiButton } from "../../../components/WalletMultiButton";
import { BetButtons } from "../../../components/BetButtons";
import { LivePotBar } from "../../../components/LivePotBar";
import { ModdioBattle } from "../../../components/ModdioBattle";
import { ShareToXButton } from "../../../components/ShareToXButton";
import dynamic from "next/dynamic";

// Dynamic imports for performance optimization
const TrophyNFT = dynamic(() => import("../../../components/TrophyNFT").then(mod => ({ default: mod.TrophyNFT })), { ssr: false });
const ConfettiExplosion = dynamic(() => import("../../../components/ConfettiExplosion").then(mod => ({ default: mod.ConfettiExplosion })), { ssr: false });
const IndieFunWidget = dynamic(() => import("../../../components/IndieFunWidget").then(mod => ({ default: mod.IndieFunWidget })), { ssr: false });
import { useArena, useUserPosition } from "../../../hooks/useArena";
import { useShareTrading } from "../../../hooks/useShareTrading";
import {
  formatSOL,
  formatCountdown,
  truncateAddress,
  playSound,
  triggerHaptic,
} from "../../../lib/utils";
import { formatErrorForDisplay } from "../../../lib/errorHandler";
import { APP_URL } from "../../../lib/constants";

type TabType = "battle" | "info" | "position" | "comments";

export default function ArenaPage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const searchParams = useSearchParams();
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { arena, loading, error, joinArena, resolveArena } = useArena(arenaId);
  const { participant } = useUserPosition(arenaId);
  const [joiningOutcome, setJoiningOutcome] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("battle");
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedOutcomeForShares, setSelectedOutcomeForShares] = useState<number | null>(null);
  const [creatingShares, setCreatingShares] = useState(false);
  
  // Use share trading hook for the first outcome (for creating share tokens)
  const shareTrading = useShareTrading(
    arenaId,
    selectedOutcomeForShares ?? 0
  );

  // Check URL params for tab or results
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "results" && arena?.resolved) {
      setShowConfetti(true);
      setActiveTab("position");
    } else if (tab && ["battle", "info", "position", "comments"].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [searchParams, arena]);

  const handleBet = async (outcomeIndex: number) => {
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    setJoiningOutcome(outcomeIndex);
    try {
      await joinArena(outcomeIndex);
      playSound("whale-alert.mp3", 0.3);
      triggerHaptic("heavy");
      setActiveTab("battle"); // Switch to battle tab after betting
      alert("Successfully joined arena! 🎉");
    } catch (error: any) {
      console.error("Error joining arena:", error);
      const errorInfo = formatErrorForDisplay(error);
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    } finally {
      setJoiningOutcome(null);
    }
  };

  const handleResolve = async (outcomeIndex: number) => {
    if (!arena || !publicKey) return;

    const isCreator = arena.creator.toString() === publicKey.toString();
    if (!isCreator) {
      alert("Only the creator can resolve this arena");
      return;
    }

    const confirmed = confirm(
      `Resolve arena with winner: ${arena.outcomes[outcomeIndex]}?`
    );
    if (!confirmed) return;

    try {
      await resolveArena(outcomeIndex);
      playSound("victory.mp3");
      router.push(`/arena/${arenaId}/resolve`);
    } catch (error) {
      console.error("Error resolving arena:", error);
      alert("Failed to resolve arena");
    }
  };

  const handleCreateShareTokens = async (outcomeIndex: number) => {
    if (!publicKey || !arena) return;

    const isCreator = arena.creator.toString() === publicKey.toString();
    if (!isCreator) {
      alert("Only the creator can create share tokens");
      return;
    }

    setCreatingShares(true);
    setSelectedOutcomeForShares(outcomeIndex);

    try {
      // Default initial price: 0.5 SOL (50% probability)
      const initialPrice = 0.5; // in SOL
      const initialPriceLamports = Math.floor(initialPrice * 1e9);

      await shareTrading.createShareTokens(initialPriceLamports);
      
      alert(`Share tokens created successfully for "${arena.outcomes[outcomeIndex]}"!`);
      playSound("whale-alert.mp3", 0.3);
      triggerHaptic("medium");
    } catch (error: any) {
      console.error("Error creating share tokens:", error);
      const errorInfo = formatErrorForDisplay(error);
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    } finally {
      setCreatingShares(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 mx-auto mb-lg border-4 border-electric-purple border-t-transparent rounded-full" />
          <p className="text-body text-light-gray">Loading arena...</p>
        </div>
      </div>
    );
  }

  if (error || !arena) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md bg-black">
        <div className="text-6xl mb-lg">⚠️</div>
        <h1 className="text-h1 font-bold mb-md">Arena Not Found</h1>
        <p className="text-body text-light-gray mb-lg">
          {error || "This arena doesn't exist"}
        </p>
        <Link href="/feed">
          <Button>Back to Feed</Button>
        </Link>
      </div>
    );
  }

  const hasEnded =
    arena.resolved || new Date() >= new Date(arena.endTime.toNumber() * 1000);
  const isCreator =
    publicKey && arena.creator.toString() === publicKey.toString();
  const userOutcome = participant?.outcomeChosen;
  const timeRemaining = formatCountdown(
    new Date(arena.endTime.toNumber() * 1000)
  );
  const isUserWinner =
    arena.resolved &&
    participant &&
    participant.outcomeChosen === arena.winnerOutcome;

  return (
    <div className="min-h-screen bg-black pb-24">
      {showConfetti && <ConfettiExplosion />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-body-large font-bold">Arena</span>
          </Link>
          <div className="flex items-center gap-md">
            <Link href={`/arena/${arenaId}/battle`} className="hidden md:block">
              <Button variant="outline" size="sm">
                🎮 Full Battle View
              </Button>
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-6xl">
        {/* Arena Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-lg mb-lg">
            {/* Hero Image (if provided) - Next.js Image for optimization */}
            {arena.imageUri && (
              <div className="w-full h-64 mb-lg rounded-lg overflow-hidden relative">
                <Image
                  src={arena.imageUri}
                  alt={arena.title || "Arena image"}
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 1200px"
                  priority
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-md mb-md">
              <div className="flex-1">
                <h1 className="text-h1 font-bold text-white mb-sm">
                  {arena.question}
                </h1>
                <p className="text-body text-light-gray mb-md">
                  {arena.description}
                </p>
                <div className="flex items-center gap-lg text-body-small flex-wrap">
                  <span className="text-light-gray">
                    by {truncateAddress(arena.creator.toString())}
                  </span>
                  {arena.tags.length > 0 && (
                    <div className="flex gap-xs">
                      {arena.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/tag/${tag}`}
                          className="px-2 py-1 rounded-sm bg-medium-gray text-light-gray hover:bg-electric-purple hover:text-white transition-colors"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {arena.tokenMint && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-electric-purple/20 text-electric-purple text-body-small font-bold border border-electric-purple">
                    🚀 TOKENIZED
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
              <div className="text-center">
                <p className="text-body-small text-light-gray mb-xs">Total Pot</p>
                <p className="text-h3 font-bold text-electric-purple">
                  {formatSOL(arena.pot.toNumber())} SOL
                </p>
              </div>
              <div className="text-center">
                <p className="text-body-small text-light-gray mb-xs">Players</p>
                <p className="text-h3 font-bold text-white">
                  {arena.participantsCount}
                </p>
              </div>
              <div className="text-center">
                <p className="text-body-small text-light-gray mb-xs">Entry Fee</p>
                <p className="text-h3 font-bold text-white">
                  {formatSOL(arena.entryFee.toNumber())} SOL
                </p>
              </div>
              <div className="text-center">
                <p className="text-body-small text-light-gray mb-xs">
                  {arena.resolved ? "Status" : "Time Left"}
                </p>
                <p
                  className={`text-h3 font-bold ${
                    arena.resolved
                      ? "text-neon-green"
                      : hasEnded
                      ? "text-blood-red"
                      : "text-hot-pink"
                  }`}
                >
                  {arena.resolved ? "RESOLVED" : hasEnded ? "ENDED" : timeRemaining}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <LivePotBar
              outcomes={arena.outcomes}
              pot={arena.pot.toNumber()}
              outcomePots={arena.outcomePots.map((p) => p.toNumber())}
              resolved={arena.resolved}
              winnerOutcome={arena.winnerOutcome}
            />

            {/* Big Bet Buttons (if not bet yet) */}
            {!arena.resolved && !hasEnded && !participant && (
              <div className="mt-lg">
                <BetButtons
                  outcomes={arena.outcomes}
                  onBet={handleBet}
                  disabled={!connected || joiningOutcome !== null}
                  loading={joiningOutcome}
                />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Tabs - Polymarket Style (USER_FLOW.md spec) */}
        <div className="mb-lg">
          <div className="border-b border-medium-gray flex items-center gap-md overflow-x-auto">
            <button
              onClick={() => setActiveTab("battle")}
              className={`px-lg py-md text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "battle"
                  ? "border-electric-purple text-electric-purple"
                  : "border-transparent text-light-gray hover:text-white"
              }`}
            >
              🎮 Battle
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`px-lg py-md text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "info"
                  ? "border-electric-purple text-electric-purple"
                  : "border-transparent text-light-gray hover:text-white"
              }`}
            >
              ℹ️ Info
            </button>
            <button
              onClick={() => setActiveTab("position")}
              className={`px-lg py-md text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "position"
                  ? "border-electric-purple text-electric-purple"
                  : "border-transparent text-light-gray hover:text-white"
              }`}
            >
              📊 My Position
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-lg py-md text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "comments"
                  ? "border-electric-purple text-electric-purple"
                  : "border-transparent text-light-gray hover:text-white"
              }`}
            >
              💬 Comments
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Battle Tab */}
          {activeTab === "battle" && (
            <Card className="p-md">
              <ModdioBattle
                arenaId={arenaId}
                userWallet={publicKey?.toString()}
                userOutcome={userOutcome}
                className="w-full h-[400px] md:h-[600px] rounded-lg overflow-hidden"
              />
              <div className="mt-md flex items-center justify-between">
                <p className="text-body-small text-light-gray">
                  {participant
                    ? "🎮 You're in the battle!"
                    : "👁️ Spectator mode - place a bet to join"}
                </p>
                <ShareToXButton
                  text={`⚔️ ${arena.question}\n\n${arena.participantsCount} warriors battling for ${formatSOL(arena.pot.toNumber())} SOL!`}
                  url={`${APP_URL}/arena/${arenaId}`}
                />
              </div>
            </Card>
          )}

          {/* Info Tab */}
          {activeTab === "info" && (
            <Card className="p-lg">
              <h3 className="text-h3 font-bold mb-lg">Arena Information</h3>
              
              <div className="space-y-md">
                <div>
                  <p className="text-body-small text-light-gray mb-xs">Question</p>
                  <p className="text-body font-medium">{arena.question}</p>
                </div>

                {arena.description && (
                  <div>
                    <p className="text-body-small text-light-gray mb-xs">Description</p>
                    <p className="text-body">{arena.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-body-small text-light-gray mb-xs">Possible Outcomes</p>
                  <div className="flex flex-wrap gap-2">
                    {arena.outcomes.map((outcome, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-2 bg-medium-gray rounded-md text-body font-medium"
                      >
                        {outcome}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-body-small text-light-gray mb-xs">Creator</p>
                  <p className="text-body font-mono">
                    {arena.creator.toString()}
                  </p>
                </div>

                <div>
                  <p className="text-body-small text-light-gray mb-xs">
                    End Time
                  </p>
                  <p className="text-body">
                    {new Date(arena.endTime.toNumber() * 1000).toLocaleString()}
                  </p>
                </div>

                {arena.tokenMint && (
                  <div>
                    <p className="text-body-small text-light-gray mb-xs">
                      Token Mint (Indie.fun)
                    </p>
                    <p className="text-body font-mono break-all mb-md">
                      {arena.tokenMint.toString()}
                    </p>
                    
                    {/* Indie.fun Embed Widget - SPONSOR_APIS.md spec */}
                    <div className="mt-lg">
                      <h4 className="text-body-large font-bold mb-md">
                        Trading & Bonding Curve
                      </h4>
                      <IndieFunWidget
                        tokenMint={arena.tokenMint.toString()}
                        tokenName={arena.title}
                      />
                    </div>
                  </div>
                )}

                {/* Create Share Tokens Section (Creator Only) */}
                {!arena.resolved && publicKey && arena.creator.toString() === publicKey.toString() && (
                  <div className="mt-lg p-md bg-medium-gray/20 rounded-lg border border-electric-purple/30">
                    <h4 className="text-body-large font-bold mb-md text-electric-purple">
                      🎯 Create Share Tokens
                    </h4>
                    <p className="text-body-small text-light-gray mb-md">
                      Enable secondary market trading by creating share tokens for each outcome.
                      This allows users to buy and sell outcome shares before the arena resolves.
                    </p>
                    
                    <div className="space-y-sm mb-md">
                      {arena.outcomes.map((outcome, idx) => {
                        const outcomeShare = shareTrading.outcomeShare;
                        const hasShares = outcomeShare !== null;
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-sm bg-medium-gray/30 rounded"
                          >
                            <span className="text-body">{outcome}</span>
                            {hasShares ? (
                              <span className="text-sm text-neon-green">✓ Created</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOutcomeForShares(idx);
                                  handleCreateShareTokens(idx);
                                }}
                                disabled={creatingShares}
                                className="text-xs"
                              >
                                {creatingShares && selectedOutcomeForShares === idx
                                  ? "Creating..."
                                  : "Create"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* My Position Tab */}
          {activeTab === "position" && (
            <Card className="p-lg">
              {!connected ? (
                <div className="text-center py-2xl">
                  <div className="text-6xl mb-md">🔒</div>
                  <h3 className="text-h3 font-bold mb-md">Connect Your Wallet</h3>
                  <p className="text-body text-light-gray mb-lg">
                    Connect to view your position in this arena
                  </p>
                  <WalletMultiButton />
                </div>
              ) : !participant ? (
                <div className="text-center py-2xl">
                  <div className="text-6xl mb-md">💰</div>
                  <h3 className="text-h3 font-bold mb-md">No Position Yet</h3>
                  <p className="text-body text-light-gray mb-lg">
                    You haven't placed a bet in this arena
                  </p>
                  {!arena.resolved && !hasEnded && (
                    <BetButtons
                      outcomes={arena.outcomes}
                      onBet={handleBet}
                      disabled={joiningOutcome !== null}
                      loading={joiningOutcome}
                    />
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-h3 font-bold mb-lg">Your Position</h3>

                  <div className="space-y-lg">
                    <div className="grid grid-cols-2 gap-md">
                      <div className="p-md bg-medium-gray/20 rounded-lg">
                        <p className="text-body-small text-light-gray mb-xs">
                          Your Bet
                        </p>
                        <p className="text-h3 font-bold text-electric-purple">
                          {arena.outcomes[participant.outcomeChosen]}
                        </p>
                      </div>
                      <div className="p-md bg-medium-gray/20 rounded-lg">
                        <p className="text-body-small text-light-gray mb-xs">
                          Amount Staked
                        </p>
                        <p className="text-h3 font-bold">
                          {formatSOL(participant.amount.toNumber())} SOL
                        </p>
                      </div>
                    </div>

                    {arena.resolved && (
                      <div
                        className={`p-lg rounded-lg border-2 ${
                          isUserWinner
                            ? "bg-neon-green/10 border-neon-green"
                            : "bg-blood-red/10 border-blood-red"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-md">
                            {isUserWinner ? "🏆" : "😢"}
                          </div>
                          <h4 className="text-h2 font-bold mb-sm">
                            {isUserWinner ? "You Won!" : "Better Luck Next Time"}
                          </h4>
                          {isUserWinner && (
                            <div>
                              <p className="text-body text-light-gray mb-md">
                                Winning outcome: {arena.outcomes[arena.winnerOutcome!]}
                              </p>
                              <TrophyNFT arenaId={arenaId} />
                              <ShareToXButton
                                text={`Just 3x'd my money on BetFun ⚔️\n\n"${arena.question}"\n\nJoin the arena:`}
                                url={`${APP_URL}/arena/${arenaId}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <Card className="p-lg">
              <h3 className="text-h3 font-bold mb-lg">Comments</h3>
              <div className="text-center py-3xl">
                <div className="text-6xl mb-md">💬</div>
                <p className="text-body text-light-gray">
                  Comments coming soon! Chat with other warriors in the Battle tab.
                </p>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Creator Actions (if creator) */}
        {isCreator && hasEnded && !arena.resolved && (
          <Card className="p-lg mt-lg bg-hot-pink/10 border-hot-pink">
            <h3 className="text-h3 font-bold mb-md">Creator Actions</h3>
            <p className="text-body text-light-gray mb-lg">
              Time's up! Choose the winning outcome to resolve this arena.
            </p>
            <div className="flex flex-wrap gap-md">
              {arena.outcomes.map((outcome, idx) => (
                <Button
                  key={idx}
                  variant="success"
                  onClick={() => handleResolve(idx)}
                >
                  Resolve as "{outcome}"
                </Button>
              ))}
            </div>
          </Card>
        )}
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-dark-gray border-t border-medium-gray flex items-center justify-around py-2 px-4 z-50">
        <Link
          href="/feed"
          className="flex flex-col items-center gap-1 py-2 px-4 text-light-gray hover:text-white"
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/create" className="flex flex-col items-center gap-1 py-2 px-4">
          <div className="w-12 h-12 rounded-full bg-electric-purple flex items-center justify-center -mt-6 shadow-glow-purple">
            <span className="text-3xl">➕</span>
          </div>
          <span className="text-xs font-medium text-transparent">Create</span>
        </Link>
        <Link
          href="/leaderboard"
          className="flex flex-col items-center gap-1 py-2 px-4 text-light-gray hover:text-white"
        >
          <span className="text-2xl">🏆</span>
          <span className="text-xs">Top</span>
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 py-2 px-4 text-light-gray hover:text-white"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
