"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { ArenaGrid } from "../../../components/ArenaGrid";
import { WalletMultiButton } from "../../../components/WalletMultiButton";
import { Button } from "../../../components/ui/button";
import { supabase } from "../../../lib/supabase/client";
import type { Arena } from "../../../lib/supabase/client";

type ArenaWithAccount = Arena & { arena_account: string };

// Tag emoji mapping
const TAG_EMOJIS: Record<string, string> = {
  crypto: "₿",
  politics: "🏛️",
  memes: "🐸",
  sports: "⚽",
  gaming: "🎮",
  entertainment: "🎬",
  science: "🔬",
  weather: "🌤️",
  other: "📌",
};

export default function TagPage() {
  const params = useParams();
  const tag = (params.tag as string).toLowerCase();
  const { connected } = useWallet();
  
  const [arenas, setArenas] = useState<ArenaWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // Fetch arenas filtered by tag
  const fetchArenas = async (pageNum: number) => {
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const limit = 20;
      const offset = pageNum * limit;

      // Query arenas with matching tag in tags array
      const { data, error } = await supabase
        .from("arenas")
        .select("*")
        .contains("tags", [tag])
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (data) {
        const processedArenas = data as ArenaWithAccount[];

        if (pageNum === 0) {
          setArenas(processedArenas);
        } else {
          setArenas((prev) => [...prev, ...processedArenas]);
        }

        setHasMore(data.length === limit);
      }
    } catch (error) {
      console.error("Error fetching arenas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setPage(0);
    setArenas([]);
    fetchArenas(0);
  }, [tag]);

  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchArenas(nextPage);
    }
  }, [inView, hasMore, loading]);

  const tagEmoji = TAG_EMOJIS[tag] || "🏷️";
  const tagDisplay = tag.charAt(0).toUpperCase() + tag.slice(1);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
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
        {/* Tag Header */}
        <div className="mb-2xl">
          <Link
            href="/feed"
            className="inline-flex items-center text-body text-light-gray hover:text-white mb-md"
          >
            ← Back to Feed
          </Link>

          <div className="flex items-center gap-md mb-md">
            <div className="text-6xl">{tagEmoji}</div>
            <div>
              <h1 className="text-h1 font-bold mb-xs">{tagDisplay} Arenas</h1>
              <p className="text-body text-light-gray">
                {loading
                  ? "Loading..."
                  : `${arenas.length} active ${tag} prediction markets`}
              </p>
            </div>
          </div>

          {/* Popular Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-small text-light-gray mr-2">
              Browse by tag:
            </span>
            {Object.entries(TAG_EMOJIS).map(([tagKey, emoji]) => (
              <Link key={tagKey} href={`/tag/${tagKey}`}>
                <Button
                  variant={tag === tagKey ? "default" : "ghost"}
                  size="sm"
                >
                  {emoji} {tagKey.charAt(0).toUpperCase() + tagKey.slice(1)}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Arenas Grid - same as /feed but filtered */}
        <ArenaGrid arenas={arenas} loading={loading} />

        {/* Load More Trigger */}
        {hasMore && !loading && (
          <div ref={loadMoreRef} className="py-lg text-center">
            <div className="animate-spin w-8 h-8 mx-auto border-4 border-electric-purple border-t-transparent rounded-full" />
          </div>
        )}

        {!hasMore && arenas.length > 0 && (
          <div className="text-center py-lg">
            <p className="text-light-gray mb-md">
              You've seen all {tag} arenas!
            </p>
            <Link href="/create">
              <Button variant="outline">Create New {tagDisplay} Arena</Button>
            </Link>
          </div>
        )}

        {!loading && arenas.length === 0 && (
          <div className="text-center py-3xl">
            <div className="text-6xl mb-md">{tagEmoji}</div>
            <h3 className="text-h2 font-bold mb-md">
              No {tag} arenas yet
            </h3>
            <p className="text-body text-light-gray mb-lg">
              Be the first to create a {tag} prediction battle!
            </p>
            <Link href="/create">
              <Button variant="success" size="lg">
                Create First {tagDisplay} Arena
              </Button>
            </Link>
          </div>
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

      {/* Spacer for mobile tab bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

