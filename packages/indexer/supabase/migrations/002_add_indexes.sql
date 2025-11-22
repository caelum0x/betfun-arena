-- Migration: Add indexes for performance optimization
-- Created: Phase 3 Architecture Improvements

-- Indexes for arenas table
CREATE INDEX IF NOT EXISTS idx_arenas_creator_wallet ON arenas(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_arenas_created_at_desc ON arenas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arenas_resolved_end_time ON arenas(resolved, end_time);
CREATE INDEX IF NOT EXISTS idx_arenas_pot_desc ON arenas(pot DESC);
CREATE INDEX IF NOT EXISTS idx_arenas_resolved ON arenas(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_arenas_arena_account ON arenas(arena_account);
CREATE INDEX IF NOT EXISTS idx_arenas_tags ON arenas USING GIN(tags);

-- Indexes for participants table
CREATE INDEX IF NOT EXISTS idx_participants_arena_id ON participants(arena_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet);
CREATE INDEX IF NOT EXISTS idx_participants_arena_wallet ON participants(arena_id, wallet);
CREATE INDEX IF NOT EXISTS idx_participants_joined_at_desc ON participants(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_claimed ON participants(claimed) WHERE claimed = false;
CREATE INDEX IF NOT EXISTS idx_participants_tx_signature ON participants(tx_signature);

-- Index for processed_transactions table (for deduplication)
CREATE TABLE IF NOT EXISTS processed_transactions (
  id BIGSERIAL PRIMARY KEY,
  signature TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_transactions_signature ON processed_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_processed_transactions_processed_at ON processed_transactions(processed_at DESC);

-- Partial index for active arenas (most common query)
CREATE INDEX IF NOT EXISTS idx_arenas_active ON arenas(created_at DESC, pot DESC)
WHERE resolved = false AND end_time > NOW();

-- Composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_participants_wallet_joined ON participants(wallet, joined_at DESC);

-- Index for full-text search on titles (if needed)
-- CREATE INDEX IF NOT EXISTS idx_arenas_title_search ON arenas USING GIN(to_tsvector('english', title));

COMMENT ON INDEX idx_arenas_creator_wallet IS 'Fast lookup of arenas by creator';
COMMENT ON INDEX idx_arenas_resolved_end_time IS 'Fast filtering of active/ended arenas';
COMMENT ON INDEX idx_arenas_pot_desc IS 'Fast sorting by volume';
COMMENT ON INDEX idx_participants_arena_wallet IS 'Fast lookup of user participation in arena';
COMMENT ON INDEX idx_processed_transactions_signature IS 'Fast deduplication check';

