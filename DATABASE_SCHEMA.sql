-- BetFun Arena Database Schema (Supabase/PostgreSQL)

-- ============================================
-- MARKETS TABLE
-- ============================================
CREATE TABLE markets (
    id TEXT PRIMARY KEY,
    creator TEXT NOT NULL,
    title TEXT NOT NULL,
    question TEXT,
    description TEXT,
    category TEXT NOT NULL,
    outcomes TEXT[] NOT NULL,
    entry_fee BIGINT NOT NULL DEFAULT 0,
    end_time BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    winner_outcome INTEGER,
    total_pot BIGINT DEFAULT 0,
    resolved_at BIGINT,
    volume BIGINT NOT NULL DEFAULT 0,
    volume_24h BIGINT NOT NULL DEFAULT 0,
    participant_count INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    trending BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_resolved ON markets(resolved);
CREATE INDEX idx_markets_end_time ON markets(end_time);
CREATE INDEX idx_markets_volume ON markets(volume DESC);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);

-- ============================================
-- OUTCOME SHARES TABLE
-- ============================================
CREATE TABLE outcome_shares (
    id SERIAL PRIMARY KEY,
    arena TEXT NOT NULL REFERENCES markets(id),
    outcome_index INTEGER NOT NULL,
    token_mint TEXT NOT NULL,
    total_supply BIGINT NOT NULL DEFAULT 0,
    price BIGINT NOT NULL,
    volume_24h BIGINT NOT NULL DEFAULT 0,
    high_24h BIGINT NOT NULL,
    low_24h BIGINT NOT NULL,
    price_change_24h BIGINT NOT NULL DEFAULT 0,
    UNIQUE(arena, outcome_index)
);

CREATE INDEX idx_outcome_shares_arena ON outcome_shares(arena);

-- ============================================
-- POSITIONS TABLE
-- ============================================
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    owner TEXT NOT NULL,
    arena TEXT NOT NULL REFERENCES markets(id),
    outcome_index INTEGER NOT NULL,
    token_account TEXT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    cost_basis BIGINT NOT NULL DEFAULT 0,
    realized_pnl BIGINT NOT NULL DEFAULT 0,
    last_updated BIGINT NOT NULL,
    UNIQUE(owner, arena, outcome_index)
);

CREATE INDEX idx_positions_owner ON positions(owner);
CREATE INDEX idx_positions_arena ON positions(arena);

-- ============================================
-- TRADES TABLE
-- ============================================
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES markets(id),
    user_address TEXT NOT NULL,
    outcome_index INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    amount BIGINT NOT NULL,
    price BIGINT NOT NULL,
    sol_amount BIGINT NOT NULL,
    pnl BIGINT,
    timestamp BIGINT NOT NULL,
    tx_signature TEXT
);

CREATE INDEX idx_trades_market ON trades(market_id, timestamp DESC);
CREATE INDEX idx_trades_user ON trades(user_address, timestamp DESC);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);

-- ============================================
-- LIMIT ORDERS TABLE
-- ============================================
CREATE TABLE limit_orders (
    id SERIAL PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES markets(id),
    user_address TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    outcome_index INTEGER NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
    price BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    filled_amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'filled', 'cancelled')),
    created_at BIGINT NOT NULL,
    updated_at BIGINT
);

CREATE INDEX idx_limit_orders_market ON limit_orders(market_id, status);
CREATE INDEX idx_limit_orders_user ON limit_orders(user_address, status);
CREATE INDEX idx_limit_orders_status ON limit_orders(status);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    address TEXT PRIMARY KEY,
    username TEXT,
    bio TEXT,
    avatar TEXT,
    twitter TEXT,
    discord TEXT,
    joined_at BIGINT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- USER STATS TABLE
-- ============================================
CREATE TABLE user_stats (
    address TEXT PRIMARY KEY REFERENCES users(address),
    total_volume BIGINT NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    total_pnl BIGINT NOT NULL DEFAULT 0,
    win_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    markets_created INTEGER NOT NULL DEFAULT 0,
    markets_won INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_updated BIGINT NOT NULL
);

CREATE INDEX idx_user_stats_pnl ON user_stats(total_pnl DESC);
CREATE INDEX idx_user_stats_volume ON user_stats(total_volume DESC);
CREATE INDEX idx_user_stats_win_rate ON user_stats(win_rate DESC);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    criteria JSONB NOT NULL
);

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL REFERENCES users(address),
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    unlocked_at BIGINT NOT NULL,
    UNIQUE(user_address, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_address);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL REFERENCES users(address),
    type TEXT NOT NULL CHECK (type IN ('trade', 'market', 'achievement', 'system', 'social')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_address, read, timestamp DESC);

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL REFERENCES users(address),
    type TEXT NOT NULL CHECK (type IN ('trade', 'liquidity', 'order', 'claim')),
    action TEXT NOT NULL,
    market_id TEXT REFERENCES markets(id),
    amount BIGINT,
    timestamp BIGINT NOT NULL,
    tx_signature TEXT
);

CREATE INDEX idx_activities_user ON activities(user_address, timestamp DESC);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES markets(id),
    user_address TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_comments_market ON comments(market_id, timestamp DESC);

-- ============================================
-- PRICE HISTORY TABLE
-- ============================================
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES markets(id),
    outcome_index INTEGER NOT NULL,
    price BIGINT NOT NULL,
    volume BIGINT NOT NULL,
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_price_history_market ON price_history(market_id, outcome_index, timestamp);

-- ============================================
-- PLATFORM METRICS TABLE
-- ============================================
CREATE TABLE platform_metrics (
    id SERIAL PRIMARY KEY,
    total_volume BIGINT NOT NULL,
    total_users INTEGER NOT NULL,
    total_markets INTEGER NOT NULL,
    total_trades INTEGER NOT NULL,
    active_users_24h INTEGER,
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_platform_metrics_timestamp ON platform_metrics(timestamp DESC);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Increment market volume
CREATE OR REPLACE FUNCTION increment_market_volume(
    market_id TEXT,
    amount BIGINT
)
RETURNS VOID AS $$
BEGIN
    UPDATE markets
    SET volume = volume + amount,
        volume_24h = volume_24h + amount
    WHERE id = market_id;
END;
$$ LANGUAGE plpgsql;

-- Upsert user position
CREATE OR REPLACE FUNCTION upsert_user_position(
    p_owner TEXT,
    p_arena TEXT,
    p_outcome_index INTEGER,
    p_shares_delta BIGINT,
    p_cost_delta BIGINT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO positions (owner, arena, outcome_index, amount, cost_basis, last_updated, token_account)
    VALUES (p_owner, p_arena, p_outcome_index, p_shares_delta, p_cost_delta, EXTRACT(EPOCH FROM NOW())::BIGINT, '')
    ON CONFLICT (owner, arena, outcome_index)
    DO UPDATE SET
        amount = positions.amount + p_shares_delta,
        cost_basis = positions.cost_basis + p_cost_delta,
        last_updated = EXTRACT(EPOCH FROM NOW())::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Update user P&L
CREATE OR REPLACE FUNCTION update_user_pnl(
    user_address TEXT,
    pnl_delta BIGINT
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_stats
    SET total_pnl = total_pnl + pnl_delta,
        last_updated = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE address = user_address;
END;
$$ LANGUAGE plpgsql;

-- Reset 24h volumes (run hourly)
CREATE OR REPLACE FUNCTION reset_24h_volumes()
RETURNS VOID AS $$
BEGIN
    UPDATE markets SET volume_24h = 0;
    UPDATE outcome_shares SET volume_24h = 0;
END;
$$ LANGUAGE plpgsql;

