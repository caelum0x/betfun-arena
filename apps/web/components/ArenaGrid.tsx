"use client";

import { ArenaCard } from "./ArenaCard";
import { ArenaCardSkeleton } from "./ArenaCardSkeleton";
import type { Arena } from "../lib/supabase/client";

interface ArenaGridProps {
  arenas: (Arena & { arena_account: string })[];
  loading?: boolean;
}

export function ArenaGrid({ arenas, loading = false }: ArenaGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 px-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArenaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (arenas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-lg">⚔️</div>
        <h3 className="text-h3 font-bold text-white mb-sm">No arenas yet</h3>
        <p className="text-body text-light-gray max-w-md">
          Be the first to create a prediction arena and start battling!
        </p>
      </div>
    );
  }

  return (
    // USERFLOW.md spec: 8px card spacing, 20px card margin
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 px-5">
      {arenas.map((arena, index) => (
        <ArenaCard key={arena.id || arena.arena_account} arena={arena} index={index} />
      ))}
    </div>
  );
}

