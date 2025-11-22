-- BetFun Arena Database Schema
-- Migration: Initial schema setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Arenas table
CREATE TABLE arenas (
  id BIGSERIAL PRIMARY KEY,
  arena_account TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  question TEXT NOT NULL,
  outcomes TEXT[] NOT NULL,
  entry_fee BIGINT NOT NULL,
  pot BIGINT DEFAULT 0,
  participants_count INTEGER DEFAULT 0,
  outcome_counts INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  outcome_pots BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  resolved BOOLEAN DEFAULT FALSE,
  winner_outcome INTEGER,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creator_wallet TEXT NOT NULL,
  token_mint TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  creator_fee_bps INTEGER DEFAULT 500,
  manual_resolve BOOLEAN DEFAULT FALSE
);

-- Participants table
CREATE TABLE participants (
  id BIGSERIAL PRIMARY KEY,
  arena_id BIGINT REFERENCES arenas(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  outcome_chosen INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  tx_signature TEXT UNIQUE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed BOOLEAN DEFAULT FALSE,
  trophy_mint TEXT,
  UNIQUE(arena_id, wallet)
);

-- Leaderboard table
CREATE TABLE leaderboard (
  wallet TEXT PRIMARY KEY,
  total_wagered BIGINT DEFAULT 0,
  total_won BIGINT DEFAULT 0,
  arenas_created INTEGER DEFAULT 0,
  arenas_joined INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trophies table
CREATE TABLE trophies (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  arena_id BIGINT REFERENCES arenas(id) ON DELETE CASCADE,
  nft_mint TEXT UNIQUE NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary')),
  minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_arenas_creator ON arenas(creator_wallet);
CREATE INDEX idx_arenas_resolved ON arenas(resolved);
CREATE INDEX idx_arenas_created_at ON arenas(created_at DESC);
CREATE INDEX idx_arenas_end_time ON arenas(end_time);
CREATE INDEX idx_participants_wallet ON participants(wallet);
CREATE INDEX idx_participants_arena ON participants(arena_id);
CREATE INDEX idx_trophies_wallet ON trophies(wallet);
CREATE INDEX idx_leaderboard_total_won ON leaderboard(total_won DESC);

-- Row Level Security (RLS)
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;

-- Policies: Allow read access to all, write access to service role only
CREATE POLICY "Allow public read on arenas" ON arenas FOR SELECT USING (true);
CREATE POLICY "Allow public read on participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public read on leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Allow public read on trophies" ON trophies FOR SELECT USING (true);

-- Functions

-- Calculate hotness score
CREATE OR REPLACE FUNCTION calculate_hotness(
  pot_amount BIGINT,
  participant_count INTEGER,
  created_time TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL AS $$
DECLARE
  age_hours DECIMAL;
  age_factor DECIMAL;
  volume_factor DECIMAL;
  participant_factor DECIMAL;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (NOW() - created_time)) / 3600;
  age_factor := GREATEST(0, 1 - (age_hours / 168)); -- Decay over 1 week
  volume_factor := LOG(10, pot_amount / 1e9 + 1); -- Convert to SOL
  participant_factor := LOG(10, participant_count + 1);
  
  RETURN (volume_factor + participant_factor) * age_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update leaderboard on participant join
CREATE OR REPLACE FUNCTION update_leaderboard_on_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leaderboard (wallet, arenas_joined, total_wagered)
  VALUES (NEW.wallet, 1, NEW.amount)
  ON CONFLICT (wallet) DO UPDATE SET
    arenas_joined = leaderboard.arenas_joined + 1,
    total_wagered = leaderboard.total_wagered + NEW.amount,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_on_join
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard_on_join();

-- Update leaderboard on win claim
CREATE OR REPLACE FUNCTION update_leaderboard_on_claim()
RETURNS TRIGGER AS $$
DECLARE
  arena_resolved BOOLEAN;
  arena_winner INTEGER;
  participant_won BOOLEAN;
  payout BIGINT;
BEGIN
  -- Check if participant won
  SELECT resolved, winner_outcome INTO arena_resolved, arena_winner
  FROM arenas WHERE id = NEW.arena_id;
  
  IF arena_resolved AND arena_winner = NEW.outcome_chosen AND NEW.claimed THEN
    -- Calculate payout (simplified - actual calculation in smart contract)
    payout := NEW.amount * 2; -- Approximate 2x
    
    UPDATE leaderboard SET
      total_won = total_won + payout,
      win_rate = CASE 
        WHEN arenas_joined > 0 THEN (total_won::DECIMAL / total_wagered::DECIMAL) * 100
        ELSE 0
      END,
      level = CASE 
        WHEN total_won > 1000000000000 THEN 10 -- 1000 SOL
        WHEN total_won > 100000000000 THEN 5 -- 100 SOL
        ELSE 1
      END,
      updated_at = NOW()
    WHERE wallet = NEW.wallet;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_on_claim
AFTER UPDATE ON participants
FOR EACH ROW
WHEN (NEW.claimed = TRUE AND OLD.claimed = FALSE)
EXECUTE FUNCTION update_leaderboard_on_claim();

-- Update leaderboard on arena creation
CREATE OR REPLACE FUNCTION update_leaderboard_on_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leaderboard (wallet, arenas_created)
  VALUES (NEW.creator_wallet, 1)
  ON CONFLICT (wallet) DO UPDATE SET
    arenas_created = leaderboard.arenas_created + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_on_create
AFTER INSERT ON arenas
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard_on_create();

-- Comments for documentation
COMMENT ON TABLE arenas IS 'Stores all prediction arenas';
COMMENT ON TABLE participants IS 'Stores participant bets in arenas';
COMMENT ON TABLE leaderboard IS 'Global leaderboard rankings';
COMMENT ON TABLE trophies IS 'NFT trophies minted for winners';

