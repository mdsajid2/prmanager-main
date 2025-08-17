-- Daily usage tracking for system API key usage
-- This tracks usage only for logged-in users using system default keys

-- Create daily usage tracking table
CREATE TABLE IF NOT EXISTS daily_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    system_api_calls INTEGER DEFAULT 0, -- Only count system API calls, not user's own keys
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user per day
    UNIQUE(user_id, usage_date)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage_tracking(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_tracking(usage_date);

-- Function to get or create daily usage record
CREATE OR REPLACE FUNCTION get_or_create_daily_usage(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS daily_usage_tracking AS $$
DECLARE
    usage_record daily_usage_tracking;
BEGIN
    -- Try to get existing record
    SELECT * INTO usage_record 
    FROM daily_usage_tracking 
    WHERE user_id = p_user_id AND usage_date = p_date;
    
    -- If not found, create new record
    IF NOT FOUND THEN
        INSERT INTO daily_usage_tracking (user_id, usage_date, system_api_calls)
        VALUES (p_user_id, p_date, 0)
        RETURNING * INTO usage_record;
    END IF;
    
    RETURN usage_record;
END;
$$ LANGUAGE plpgsql;

-- Function to increment daily usage (only for system API calls)
CREATE OR REPLACE FUNCTION increment_daily_usage(p_user_id UUID, p_is_system_call BOOLEAN DEFAULT TRUE)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Only track system API calls, not user's own API key usage
    IF NOT p_is_system_call THEN
        RETURN -1; -- Return -1 to indicate no tracking needed
    END IF;
    
    -- Insert or update daily usage
    INSERT INTO daily_usage_tracking (user_id, usage_date, system_api_calls, updated_at)
    VALUES (p_user_id, today_date, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        system_api_calls = daily_usage_tracking.system_api_calls + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING system_api_calls INTO current_usage;
    
    RETURN current_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to check daily limit (only for system API calls)
CREATE OR REPLACE FUNCTION check_daily_limit(p_user_id UUID, p_daily_limit INTEGER DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
    current_usage INTEGER := 0;
    today_date DATE := CURRENT_DATE;
    result JSONB;
BEGIN
    -- Get current usage for today
    SELECT COALESCE(system_api_calls, 0) INTO current_usage
    FROM daily_usage_tracking
    WHERE user_id = p_user_id AND usage_date = today_date;
    
    -- Build result
    result := jsonb_build_object(
        'allowed', current_usage < p_daily_limit,
        'current_usage', current_usage,
        'daily_limit', p_daily_limit,
        'remaining', GREATEST(0, p_daily_limit - current_usage),
        'resets_at', (today_date + INTERVAL '1 day')::timestamp,
        'usage_date', today_date
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily usage stats for a user
CREATE OR REPLACE FUNCTION get_daily_usage_stats(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
    usage_date DATE,
    system_api_calls INTEGER,
    daily_limit INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.usage_date,
        COALESCE(dut.system_api_calls, 0) as system_api_calls,
        10 as daily_limit -- Default daily limit
    FROM (
        SELECT (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, p_days - 1))::DATE as usage_date
    ) d
    LEFT JOIN daily_usage_tracking dut ON dut.user_id = p_user_id AND dut.usage_date = d.usage_date
    ORDER BY d.usage_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function to remove old daily usage records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_daily_usage()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM daily_usage_tracking 
    WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy daily usage overview
CREATE OR REPLACE VIEW daily_usage_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_plan,
    dut.usage_date,
    COALESCE(dut.system_api_calls, 0) as system_api_calls,
    10 as daily_limit, -- Default daily limit
    GREATEST(0, 10 - COALESCE(dut.system_api_calls, 0)) as remaining_calls,
    CASE 
        WHEN COALESCE(dut.system_api_calls, 0) >= 10 THEN 'EXCEEDED'
        WHEN COALESCE(dut.system_api_calls, 0) >= 8 THEN 'WARNING'
        ELSE 'OK'
    END as status
FROM users u
LEFT JOIN daily_usage_tracking dut ON u.id = dut.user_id AND dut.usage_date = CURRENT_DATE
WHERE u.subscription_plan IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON TABLE daily_usage_tracking IS 'Tracks daily usage of system API keys for logged-in users only. Guest users with own API keys are not tracked.';
COMMENT ON FUNCTION increment_daily_usage IS 'Increments daily usage counter only for system API calls, not user-provided API keys.';
COMMENT ON FUNCTION check_daily_limit IS 'Checks if user has exceeded daily limit for system API calls. Returns detailed usage info.';