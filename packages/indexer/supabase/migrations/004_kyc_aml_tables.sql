-- ================================================
-- KYC/AML Compliance Tables
-- ================================================

-- ========== KYC VERIFICATIONS ==========

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User details
    wallet TEXT NOT NULL UNIQUE,
    email TEXT,
    phone_number TEXT,
    
    -- Verification details
    external_id TEXT, -- ID from KYC provider
    level TEXT NOT NULL CHECK (level IN ('none', 'basic', 'intermediate', 'advanced', 'institutional')),
    status TEXT NOT NULL CHECK (status IN ('not_started', 'pending', 'in_review', 'approved', 'rejected', 'resubmission_required')),
    
    -- Provider info
    provider TEXT NOT NULL CHECK (provider IN ('sumsub', 'onfido', 'jumio', 'persona')),
    verification_url TEXT,
    
    -- Documents
    documents JSONB,
    
    -- Review details
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB
);

-- Indexes
CREATE INDEX idx_kyc_wallet ON kyc_verifications (wallet);
CREATE INDEX idx_kyc_status ON kyc_verifications (status);
CREATE INDEX idx_kyc_level ON kyc_verifications (level);
CREATE INDEX idx_kyc_expires ON kyc_verifications (expires_at) WHERE expires_at IS NOT NULL;

-- ========== AML SCREENINGS ==========

CREATE TABLE IF NOT EXISTS aml_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Address details
    address TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'solana',
    
    -- Risk assessment
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'severe')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Flags
    sanctions BOOLEAN NOT NULL DEFAULT FALSE,
    pep BOOLEAN NOT NULL DEFAULT FALSE, -- Politically Exposed Person
    adverse_media BOOLEAN NOT NULL DEFAULT FALSE,
    darknet_activity BOOLEAN NOT NULL DEFAULT FALSE,
    mixer_exposure BOOLEAN NOT NULL DEFAULT FALSE,
    ransomware_exposure BOOLEAN NOT NULL DEFAULT FALSE,
    scam_exposure BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Details
    flags TEXT[],
    category TEXT,
    provider TEXT NOT NULL,
    details JSONB,
    
    -- Validity
    screened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_aml_address ON aml_screenings (address);
CREATE INDEX idx_aml_risk ON aml_screenings (risk_level);
CREATE INDEX idx_aml_sanctions ON aml_screenings (sanctions) WHERE sanctions = TRUE;
CREATE INDEX idx_aml_high_risk ON aml_screenings (risk_level, screened_at) 
    WHERE risk_level IN ('high', 'severe');

-- ========== TRANSACTION SCREENINGS ==========

CREATE TABLE IF NOT EXISTS transaction_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Transaction details
    transaction_id TEXT NOT NULL,
    source_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    amount BIGINT NOT NULL,
    
    -- Risk assessment
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'severe')),
    approved BOOLEAN NOT NULL DEFAULT TRUE,
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    
    -- References
    source_screening_id UUID REFERENCES aml_screenings(id),
    destination_screening_id UUID REFERENCES aml_screenings(id),
    
    -- Review
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_notes TEXT
);

-- Indexes
CREATE INDEX idx_tx_screening_id ON transaction_screenings (transaction_id);
CREATE INDEX idx_tx_screening_source ON transaction_screenings (source_address);
CREATE INDEX idx_tx_screening_dest ON transaction_screenings (destination_address);
CREATE INDEX idx_tx_screening_blocked ON transaction_screenings (approved) WHERE approved = FALSE;
CREATE INDEX idx_tx_screening_review ON transaction_screenings (requires_review) WHERE requires_review = TRUE;

-- ========== USER LIMITS & VOLUMES ==========

CREATE TABLE IF NOT EXISTS user_limits (
    wallet TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- KYC level
    kyc_level TEXT NOT NULL DEFAULT 'none',
    
    -- Limits (in USD equivalent)
    daily_limit INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 0,
    transaction_limit INTEGER NOT NULL DEFAULT 0,
    
    -- Current usage
    daily_volume INTEGER NOT NULL DEFAULT 0,
    monthly_volume INTEGER NOT NULL DEFAULT 0,
    
    -- Reset times
    daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
    monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Metadata
    metadata JSONB
);

-- Indexes
CREATE INDEX idx_user_limits_wallet ON user_limits (wallet);
CREATE INDEX idx_user_limits_kyc ON user_limits (kyc_level);

-- ========== RATE LIMITING ==========

CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    user_id TEXT NOT NULL,
    endpoint TEXT,
    ip TEXT,
    
    -- For cleanup
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Indexes
CREATE INDEX idx_rate_limit_user ON rate_limit_requests (user_id, created_at);
CREATE INDEX idx_rate_limit_expires ON rate_limit_requests (expires_at);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_updated_at
    BEFORE UPDATE ON kyc_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_limits_updated_at
    BEFORE UPDATE ON user_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Reset daily/monthly volumes
CREATE OR REPLACE FUNCTION reset_user_volumes()
RETURNS void AS $$
BEGIN
    -- Reset daily volumes
    UPDATE user_limits
    SET daily_volume = 0,
        daily_reset_at = NOW() + INTERVAL '1 day'
    WHERE daily_reset_at <= NOW();
    
    -- Reset monthly volumes
    UPDATE user_limits
    SET monthly_volume = 0,
        monthly_reset_at = NOW() + INTERVAL '1 month'
    WHERE monthly_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule volume resets (requires pg_cron)
-- SELECT cron.schedule('reset-volumes', '0 0 * * *', 'SELECT reset_user_volumes()');

-- Cleanup expired rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_requests
    WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (every 15 minutes)
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_rate_limits()');

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own KYC data
CREATE POLICY kyc_user_own ON kyc_verifications
    FOR SELECT
    USING (wallet = auth.jwt() ->> 'wallet');

-- Admin can see all KYC data
CREATE POLICY kyc_admin_all ON kyc_verifications
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Service role has full access
CREATE POLICY kyc_service ON kyc_verifications
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Similar policies for other tables
CREATE POLICY aml_service ON aml_screenings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY tx_screening_service ON transaction_screenings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY user_limits_own ON user_limits
    FOR SELECT
    USING (wallet = auth.jwt() ->> 'wallet');

CREATE POLICY user_limits_service ON user_limits
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- VIEWS
-- ================================================

-- High risk users
CREATE OR REPLACE VIEW high_risk_users AS
SELECT 
    k.wallet,
    k.level as kyc_level,
    k.status as kyc_status,
    a.risk_level,
    a.risk_score,
    a.flags,
    a.screened_at
FROM kyc_verifications k
LEFT JOIN aml_screenings a ON a.address = k.wallet
WHERE a.risk_level IN ('high', 'severe')
    OR a.sanctions = TRUE
ORDER BY a.risk_score DESC;

-- Pending reviews
CREATE OR REPLACE VIEW pending_reviews AS
SELECT 
    'kyc' as review_type,
    k.id,
    k.wallet,
    k.level,
    k.status,
    k.created_at,
    NULL::TEXT as transaction_id
FROM kyc_verifications k
WHERE k.status IN ('pending', 'in_review', 'resubmission_required')

UNION ALL

SELECT 
    'transaction' as review_type,
    t.id,
    t.source_address as wallet,
    NULL::TEXT as level,
    NULL::TEXT as status,
    t.created_at,
    t.transaction_id
FROM transaction_screenings t
WHERE t.requires_review = TRUE
    AND t.reviewed_at IS NULL
ORDER BY created_at DESC;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE kyc_verifications IS 'KYC verification records for users';
COMMENT ON TABLE aml_screenings IS 'AML screening results for wallet addresses';
COMMENT ON TABLE transaction_screenings IS 'Transaction-level AML screening results';
COMMENT ON TABLE user_limits IS 'Per-user transaction limits based on KYC level';
COMMENT ON TABLE rate_limit_requests IS 'Rate limiting tracking table';

-- ================================================
-- GRANTS
-- ================================================

GRANT SELECT ON kyc_verifications TO authenticated;
GRANT ALL ON kyc_verifications TO service_role;

GRANT SELECT ON high_risk_users TO authenticated;
GRANT SELECT ON pending_reviews TO authenticated;

