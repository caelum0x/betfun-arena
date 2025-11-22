"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { ArenaGrid } from "../../components/ArenaGrid";
import { WalletMultiButton } from "../../components/WalletMultiButton";
import { Button } from "../../components/ui/button";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import { SearchBar } from "../../components/SearchBar";
import { BottomTabBar } from "../../components/BottomTabBar";
import { supabase } from "../../lib/supabase/client";
import type { Arena } from "../../lib/supabase/client";
import { calculateHotness } from "../../lib/utils";
import { useAllArenas } from "../../hooks/useAllArenas";
import { Arena as BlockchainArena } from "@betfun/sdk";
import { BN } from "@coral-xyz/anchor";

type ArenaWithAccount = Arena & { arena_account: string };

type SortMode = "hot" | "new" | "ending" | "volume" | "mybets";

// Convert blockchain Arena to Supabase Arena format
function convertBlockchainArenaToSupabase(arena: BlockchainArena): ArenaWithAccount {
  const createdAt = arena.createdAt ? new Date(arena.createdAt.toNumber() * 1000).toISOString() : new Date().toISOString();
  const endTime = arena.endTime ? new Date(arena.endTime.toNumber() * 1000).toISOString() : new Date().toISOString();
  
  return {
    id: 0, // Not used, arena_account is the identifier
    arena_account: arena.address.toBase58(),
    creator_wallet: arena.creator.toBase58(),
    title: arena.title,
    description: arena.description || "",
    question: arena.question,
    outcomes: arena.outcomes,
    tags: arena.tags || [],
    entry_fee: arena.entryFee ? arena.entryFee.toNumber() : 0,
    pot: arena.totalPot ? arena.totalPot.toNumber() : 0,
    participants_count: arena.participantCount || 0,
    resolved: arena.resolved || false,
    winner_outcome: arena.winnerOutcome,
    created_at: createdAt,
    end_time: endTime,
    token_mint: null,
  };
}

export default function FeedPage() {
  const { connected, publicKey } = useWallet();
  const { arenas: blockchainArenas, loading: blockchainLoading, error: blockchainError, isMockData, refetch } = useAllArenas();
  const [arenas, setArenas] = useState<ArenaWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredArenas, setFilteredArenas] = useState<ArenaWithAccount[]>([]);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // Convert and process blockchain arenas
  useEffect(() => {
    if (blockchainLoading) {
      setLoading(true);
      return;
    }

    try {
      // Convert blockchain arenas to Supabase format
      let processedArenas = blockchainArenas.map(convertBlockchainArenaToSupabase);

      // Apply sorting based on mode
      switch (sortMode) {
        case "new":
          processedArenas = processedArenas.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case "ending":
          processedArenas = processedArenas
            .filter(a => !a.resolved)
            .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
          break;
        case "volume":
          processedArenas = processedArenas.sort((a, b) => 
            parseInt(b.pot || "0") - parseInt(a.pot || "0")
          );
          break;
        case "mybets":
          // Filter arenas where user has participated (would need to check participants)
          // For now, show all arenas
          processedArenas = processedArenas.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case "hot":
        default:
          // Sort by hotness
          processedArenas = processedArenas
            .map((arena) => ({
              ...arena,
              hotness: calculateHotness(
                parseInt(arena.pot || "0"),
                arena.participants_count,
                arena.created_at
              ),
            }))
            .sort((a, b) => (b.hotness || 0) - (a.hotness || 0));
          break;
      }

      // Pagination
      const limit = 20;
      const startIndex = page * limit;
      const paginatedArenas = processedArenas.slice(startIndex, startIndex + limit);
      
      if (page === 0) {
        setArenas(paginatedArenas);
      } else {
        setArenas((prev) => [...prev, ...paginatedArenas]);
      }

      setHasMore(startIndex + limit < processedArenas.length);
    } catch (error) {
      console.error("Error processing arenas:", error);
    } finally {
      setLoading(false);
    }
  }, [blockchainArenas, blockchainLoading, sortMode, page]);

  // Reset page when sort mode changes
  useEffect(() => {
    setPage(0);
  }, [sortMode]);

  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !loading && !blockchainLoading) {
      setPage((prev) => prev + 1);
    }
  }, [inView, hasMore, loading, blockchainLoading]);

  // Filter arenas based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArenas(arenas);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = arenas.filter((arena) => {
      const titleMatch = arena.title?.toLowerCase().includes(query);
      const questionMatch = arena.question?.toLowerCase().includes(query);
      const tagsMatch = arena.tags?.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return titleMatch || questionMatch || tagsMatch;
    });

    setFilteredArenas(filtered);
  }, [searchQuery, arenas]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar - USERFLOW.md spec: 56px height */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray h-14">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-h3 font-bold text-gradient-purple">
              BetFun Arena
            </span>
          </Link>

          <div className="flex items-center gap-md">
            <Link href="/create" className="hidden md:block">
              <Button variant="success">
                <span className="mr-2">➕</span>
                Create Arena
              </Button>
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-md py-lg">
        {/* Mock Data Banner */}
        {isMockData && (
          <div className="mb-lg p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-yellow-400">Demonstration Mode: Mock Arenas</p>
                <p className="text-xs text-yellow-300/80">
                  These mock arenas are shown for demonstration purposes due to lack of SOL. Real arenas can be created if users have enough SOL to pay for transaction fees and entry fees.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Search Bar - USERFLOW.md spec */}
        <div className="mb-lg">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Sorting Tabs - Polymarket style */}
        <div className="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant={sortMode === "hot" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("hot")}
            >
              🔥 Trending
            </Button>
            <Button
              variant={sortMode === "new" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("new")}
            >
              🆕 New
            </Button>
            <Button
              variant={sortMode === "ending" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("ending")}
            >
              ⏰ Ending Soon
            </Button>
            <Button
              variant={sortMode === "volume" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("volume")}
            >
              💰 Volume
            </Button>
            {connected && (
              <Button
                variant={sortMode === "mybets" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortMode("mybets")}
              >
                📊 My Bets
              </Button>
            )}
          </div>
        </div>

        {/* Arenas Grid - 3-4 columns mobile → desktop */}
        <ArenaGrid arenas={filteredArenas} loading={loading} />

        {/* No search results */}
        {searchQuery && filteredArenas.length === 0 && !loading && (
          <div className="text-center py-3xl">
            <div className="text-6xl mb-md">🔍</div>
            <h3 className="text-h2 font-bold mb-md">No arenas found</h3>
            <p className="text-body text-light-gray mb-lg">
              Try a different search term or browse all arenas
            </p>
            <Button onClick={() => setSearchQuery("")} variant="outline">
              Clear Search
            </Button>
          </div>
        )}

        {/* Load More Trigger */}
        {hasMore && !loading && (
          <div ref={loadMoreRef} className="py-lg text-center">
            <div className="animate-spin w-8 h-8 mx-auto border-4 border-electric-purple border-t-transparent rounded-full" />
          </div>
        )}

        {!hasMore && arenas.length > 0 && (
          <p className="text-center text-light-gray py-lg">
            You've seen all the arenas! Create a new one? 🎯
          </p>
        )}

        {!loading && arenas.length === 0 && (
          <div className="text-center py-3xl">
            <div className="text-6xl mb-md">🏜️</div>
            <h3 className="text-h2 font-bold mb-md">No arenas yet</h3>
            {blockchainError ? (
              <>
                <p className="text-body text-light-gray mb-md">
                  Error loading arenas: {blockchainError}
                </p>
                <p className="text-sm text-light-gray mb-lg">
                  Please check your network connection and program ID configuration.
                </p>
                <Button onClick={() => refetch()} variant="outline" className="mr-2">
                  Retry
                </Button>
              </>
            ) : (
              <p className="text-body text-light-gray mb-lg">
                Be the first to create a prediction battle!
              </p>
            )}
            <Link href="/create">
              <Button variant="success" size="lg">
                Create First Arena
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Floating Action Button - USERFLOW.md spec: 64×64px, +48px from bottom */}
      <FloatingActionButton />

      {/* Bottom Tab Bar (Mobile) - USERFLOW.md spec: 64px height */}
      <BottomTabBar />

      {/* Spacer for mobile tab bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

