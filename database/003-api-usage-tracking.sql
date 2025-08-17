-- API Usage Tracking System
-- This migration adds comprehensive API usage monitoring and subscription management

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL, -- '/api/analyze', '/api/auth/login', etc.
    method VARCHAR(10) NOT NULL, -- 'GET', 'POST', etc.
    status_code INTEGER NOT NULL, -- 200, 400, 500, etc.
    response_time_ms INTEGER, -- Response time in milliseconds
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER, -- Request payload size in bytes
    response_size INTEGER, -- Response payload size in bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month_year VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM') -- '2024-01' for indexing
);

-- Create monthly usage summary table for faster queries
CREATE TABLE IF NOT EXISTS monthly_usage_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- '2024-01'
    total_calls INTEGER DEFAULT 0,
    analyze_calls INTEGER DEFAULT 0, -- Most important metric
    auth_calls INTEGER DEFAULT 0,
    other_calls INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_year)
);

-- Add subscription plan limits table
CREATE TABLE IF NOT EXISTS subscription_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    monthly_api_limit INTEGER NOT NULL,
    analyze_limit INTEGER NOT NULL, -- Specific limit for /analyze endpoint
    features JSONB,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_limits (plan_name, monthly_api_limit, analyze_limit, features, price_monthly) VALUES
('free', 50, 10, '{"features": ["Basic PR analysis", "10 analyses/month", "Community support"]}', 0),
('pro', 500, 100, '{"features": ["Advanced PR analysis", "100 analyses/month", "Priority support", "Custom templates"]}', 9.99),
('enterprise', 5000, 1000, '{"features": ["Enterprise PR analysis", "1000 analyses/month", "Dedicated support", "Custom integrations", "SSO"]}', 49.99)
ON CONFLICT (plan_name) DO UPDATE SET
    monthly_api_limit = EXCLUDED.monthly_api_limit,
    analyze_limit = EXCLUDED.analyze_limit,
    features = EXCLUDED.features,
    price_monthly = EXCLUDED.price_monthly;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_month ON api_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_month ON monthly_usage_summary(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan);

-- Function to update monthly summary
CREATE OR REPLACE FUNCTION update_monthly_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update monthly summary
    INSERT INTO monthly_usage_summary (
        user_id, 
        month_year, 
        total_calls,
        analyze_calls,
        auth_calls,
        other_calls,
        total_response_time_ms,
        avg_response_time_ms
    )
    SELECT 
        NEW.user_id,
        NEW.month_year,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE endpoint LIKE '%/analyze%') as analyze_calls,
        COUNT(*) FILTER (WHERE endpoint LIKE '%/auth/%') as auth_calls,
        COUNT(*) FILTER (WHERE endpoint NOT LIKE '%/analyze%' AND endpoint NOT LIKE '%/auth/%') as other_calls,
        COALESCE(SUM(response_time_ms), 0) as total_response_time_ms,
        COALESCE(AVG(response_time_ms), 0)::INTEGER as avg_response_time_ms
    FROM api_usage 
    WHERE user_id = NEW.user_id AND month_year = NEW.month_year
    GROUP BY user_id, month_year
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        analyze_calls = EXCLUDED.analyze_calls,
        auth_calls = EXCLUDED.auth_calls,
        other_calls = EXCLUDED.other_calls,
        total_response_time_ms = EXCLUDED.total_response_time_ms,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        last_updated = CURRENT_TIMESTAMP;
    
    -- Update user's current usage count
    UPDATE users 
    SET api_usage_count = (
        SELECT COALESCE(analyze_calls, 0) 
        FROM monthly_usage_summary 
        WHERE user_id = NEW.user_id 
        AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update summary on new API usage
DROP TRIGGER IF EXISTS trigger_update_monthly_usage ON api_usage;
CREATE TRIGGER trigger_update_monthly_usage
    AFTER INSERT ON api_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_usage_summary();