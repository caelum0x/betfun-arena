-- ================================================
-- Audit Logs Table for Compliance & Security
-- ================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Action details
    action TEXT NOT NULL,
    actor TEXT NOT NULL, -- wallet address or 'system'
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system')),
    
    -- Resource details
    resource TEXT, -- arena ID, user ID, transaction signature
    resource_type TEXT CHECK (resource_type IN ('arena', 'user', 'transaction')),
    
    -- Request context
    ip TEXT,
    user_agent TEXT,
    
    -- Additional data
    metadata JSONB,
    
    -- Status
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    
    -- Indexes for common queries
    CONSTRAINT audit_logs_action_check CHECK (LENGTH(action) > 0),
    CONSTRAINT audit_logs_actor_check CHECK (LENGTH(actor) > 0)
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Time-based queries (most common)
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Actor-based queries
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor);

-- Action-based queries
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- Resource-based queries
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource) WHERE resource IS NOT NULL;

-- Severity-based queries (security monitoring)
CREATE INDEX idx_audit_logs_severity ON audit_logs (severity) WHERE severity IN ('error', 'critical');

-- Composite index for security dashboard
CREATE INDEX idx_audit_logs_security ON audit_logs (severity, created_at DESC) 
WHERE severity IN ('warning', 'error', 'critical');

-- Composite index for user activity
CREATE INDEX idx_audit_logs_user_activity ON audit_logs (actor, created_at DESC) 
WHERE actor_type = 'user';

-- Composite index for admin actions
CREATE INDEX idx_audit_logs_admin ON audit_logs (actor, created_at DESC) 
WHERE actor_type = 'admin';

-- GIN index for metadata JSON searches
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- ================================================
-- Row Level Security (RLS)
-- ================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
CREATE POLICY audit_logs_admin_all ON audit_logs
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users can only see their own logs
CREATE POLICY audit_logs_user_own ON audit_logs
    FOR SELECT
    USING (
        actor = auth.jwt() ->> 'wallet'
    );

-- Service role has full access
CREATE POLICY audit_logs_service ON audit_logs
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- ================================================
-- Partitioning for Performance (Optional)
-- ================================================

-- Partition by month for better performance on large datasets
-- Uncomment if you expect high volume (millions of logs)

/*
CREATE TABLE audit_logs_template (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs_template
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs_template
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Continue creating partitions or use pg_partman extension for automatic management
*/

-- ================================================
-- Retention Policy (Auto-delete old logs)
-- ================================================

-- Function to delete old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity = 'info'; -- Only delete info logs, keep warnings/errors longer
END;
$$;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT delete_old_audit_logs()');

-- ================================================
-- Views for Common Queries
-- ================================================

-- Security incidents view
CREATE OR REPLACE VIEW security_incidents AS
SELECT 
    id,
    created_at,
    action,
    actor,
    resource,
    ip,
    metadata,
    error_message
FROM audit_logs
WHERE severity IN ('error', 'critical')
    AND action LIKE 'security.%'
ORDER BY created_at DESC;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    actor as wallet,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE severity = 'error') as error_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    MAX(created_at) as last_activity,
    MIN(created_at) as first_activity
FROM audit_logs
WHERE actor_type = 'user'
GROUP BY actor;

-- Admin actions view
CREATE OR REPLACE VIEW admin_actions AS
SELECT 
    id,
    created_at,
    action,
    actor as admin_wallet,
    resource,
    resource_type,
    metadata
FROM audit_logs
WHERE actor_type = 'admin'
ORDER BY created_at DESC;

-- ================================================
-- Functions for Compliance Reports
-- ================================================

-- Get audit log statistics for a time period
CREATE OR REPLACE FUNCTION get_audit_stats(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_logs BIGINT,
    by_severity JSONB,
    by_action JSONB,
    by_actor_type JSONB,
    unique_actors BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_logs,
        jsonb_object_agg(
            severity,
            count
        ) as by_severity,
        jsonb_object_agg(
            action,
            count
        ) FILTER (WHERE action IS NOT NULL) as by_action,
        jsonb_object_agg(
            actor_type,
            count
        ) as by_actor_type,
        COUNT(DISTINCT actor)::BIGINT as unique_actors
    FROM (
        SELECT 
            severity,
            action,
            actor_type,
            actor,
            COUNT(*) as count
        FROM audit_logs
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY ROLLUP(severity, action, actor_type, actor)
    ) stats;
END;
$$;

-- ================================================
-- Triggers for Real-time Alerts
-- ================================================

-- Function to notify on critical events
CREATE OR REPLACE FUNCTION notify_critical_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.severity = 'critical' THEN
        PERFORM pg_notify(
            'critical_audit_log',
            json_build_object(
                'id', NEW.id,
                'action', NEW.action,
                'actor', NEW.actor,
                'timestamp', NEW.created_at
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for critical events
CREATE TRIGGER audit_logs_critical_notify
AFTER INSERT ON audit_logs
FOR EACH ROW
WHEN (NEW.severity = 'critical')
EXECUTE FUNCTION notify_critical_audit_log();

-- ================================================
-- Comments for Documentation
-- ================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all system actions, security events, and compliance tracking';
COMMENT ON COLUMN audit_logs.action IS 'Action identifier in format: category.action (e.g., user.login, security.fraud.detected)';
COMMENT ON COLUMN audit_logs.actor IS 'Wallet address of user/admin, or "system" for automated actions';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info (normal), warning (attention needed), error (failed action), critical (security incident)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context data in JSON format';

-- ================================================
-- Sample Data (for testing)
-- ================================================

-- Uncomment to insert sample audit logs
/*
INSERT INTO audit_logs (action, actor, actor_type, severity, status, metadata)
VALUES 
    ('user.login', '7xKX...9mPQ', 'user', 'info', 'success', '{"ip": "1.2.3.4"}'),
    ('arena.create', '7xKX...9mPQ', 'user', 'info', 'success', '{"arena_id": "arena_123"}'),
    ('security.fraud.detected', '9kLM...3fGH', 'system', 'critical', 'success', '{"risk_score": 85}');
*/

-- ================================================
-- Grants
-- ================================================

-- Grant read access to authenticated users (for their own logs)
GRANT SELECT ON audit_logs TO authenticated;

-- Grant full access to service role
GRANT ALL ON audit_logs TO service_role;

-- Grant read access to views
GRANT SELECT ON security_incidents TO authenticated;
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON admin_actions TO authenticated;

