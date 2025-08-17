-- Referral System Implementation
-- This migration adds the referral system for free platform growth

-- Update subscription limits for free platform
UPDATE subscription_limits SET 
    monthly_api_limit = 50,
    analyze_limit = 10,
    price_monthly = 0,
    features = '{"features": ["Basic PR analysis", "10 AI analyses/month", "Unlimited basic features", "Community support"]}'
WHERE plan_name = 'free';

-- Remove paid plans (keeping them disabled for future use)
UPDATE subscription_limits SET is_active = false WHERE plan_name IN ('pro', 'enterprise');

-- Add referral system tables
CREATE TABLE IF NOT EXISTS user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_email VARCHAR(255) NOT NULL,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    bonus_credits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(referrer_id, referred_email)
);

-- Add referral tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_multiplier DECIMAL(3,2) DEFAULT 1.00; -- 1.00 = 100%, 1.20 = 120%

-- Create referral codes for existing users
UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE referral_code IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Function to calculate user's effective API limit
CREATE OR REPLACE FUNCTION get_user_effective_limits(p_user_id UUID)
RETURNS TABLE(
    base_limit INTEGER,
    bonus_credits INTEGER,
    referral_multiplier DECIMAL(3,2),
    effective_limit INTEGER,
    total_referrals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.analyze_limit as base_limit,
        u.bonus_credits,
        u.referral_multiplier,
        (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::INTEGER as effective_limit,
        u.total_referrals
    FROM users u
    LEFT JOIN subscription_limits sl ON u.subscription_plan = sl.plan_name
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral completion
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID, p_referral_code VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    referrer_record RECORD;
    new_multiplier DECIMAL(3,2);
BEGIN
    -- Find the referrer
    SELECT u.id, u.total_referrals, u.referral_multiplier 
    INTO referrer_record
    FROM users u 
    WHERE u.referral_code = p_referral_code;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update referred user
    UPDATE users 
    SET referred_by = referrer_record.id 
    WHERE id = p_referred_user_id;
    
    -- Update referrer stats
    UPDATE users 
    SET 
        total_referrals = total_referrals + 1,
        bonus_credits = bonus_credits + 10, -- 10 extra API calls per referral
        referral_multiplier = LEAST(2.0, 1.0 + (total_referrals + 1) * 0.02) -- 2% increase per referral, max 200%
    WHERE id = referrer_record.id;
    
    -- Update referral record
    UPDATE user_referrals 
    SET 
        status = 'completed',
        referred_user_id = p_referred_user_id,
        completed_at = CURRENT_TIMESTAMP,
        bonus_credits = 10
    WHERE referrer_id = referrer_record.id 
    AND referred_email = (SELECT email FROM users WHERE id = p_referred_user_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update the usage stats function to include referral bonuses
CREATE OR REPLACE FUNCTION get_user_usage_stats(p_user_id UUID)
RETURNS TABLE(
    current_month_calls INTEGER,
    current_month_analyze_calls INTEGER,
    subscription_plan VARCHAR(50),
    monthly_limit INTEGER,
    analyze_limit INTEGER,
    base_limit INTEGER,
    bonus_credits INTEGER,
    referral_multiplier DECIMAL(3,2),
    effective_limit INTEGER,
    calls_remaining INTEGER,
    analyze_remaining INTEGER,
    usage_percentage DECIMAL(5,2),
    days_until_reset INTEGER,
    total_referrals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ms.total_calls, 0)::INTEGER as current_month_calls,
        COALESCE(ms.analyze_calls, 0)::INTEGER as current_month_analyze_calls,
        u.subscription_plan,
        sl.monthly_api_limit,
        sl.analyze_limit as base_analyze_limit,
        sl.analyze_limit as base_limit,
        u.bonus_credits,
        u.referral_multiplier,
        (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::INTEGER as effective_limit,
        GREATEST(0, sl.monthly_api_limit - COALESCE(ms.total_calls, 0))::INTEGER as calls_remaining,
        GREATEST(0, (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::INTEGER - COALESCE(ms.analyze_calls, 0))::INTEGER as analyze_remaining,
        CASE 
            WHEN (sl.analyze_limit * u.referral_multiplier + u.bonus_credits) > 0 THEN 
                ROUND((COALESCE(ms.analyze_calls, 0)::DECIMAL / (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as usage_percentage,
        EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE))::INTEGER as days_until_reset,
        u.total_referrals
    FROM users u
    LEFT JOIN subscription_limits sl ON u.subscription_plan = sl.plan_name
    LEFT JOIN monthly_usage_summary ms ON u.id = ms.user_id 
        AND ms.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Admin functions
CREATE OR REPLACE FUNCTION admin_reset_user_usage(p_user_id UUID, p_admin_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify admin access
    IF p_admin_email != 'mdsajid8636@gmail.com' THEN
        RETURN FALSE;
    END IF;
    
    -- Reset usage
    DELETE FROM api_usage WHERE user_id = p_user_id AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    DELETE FROM monthly_usage_summary WHERE user_id = p_user_id AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    UPDATE users SET api_usage_count = 0 WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION admin_add_bonus_credits(p_user_id UUID, p_credits INTEGER, p_admin_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify admin access
    IF p_admin_email != 'mdsajid8636@gmail.com' THEN
        RETURN FALSE;
    END IF;
    
    -- Add bonus credits
    UPDATE users SET bonus_credits = bonus_credits + p_credits WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create admin overview view
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.subscription_plan,
    u.total_referrals,
    u.bonus_credits,
    u.referral_multiplier,
    u.referral_code,
    COALESCE(ms.analyze_calls, 0) as current_usage,
    (10 * u.referral_multiplier + u.bonus_credits)::INTEGER as effective_limit,
    u.created_at,
    u.last_login
FROM users u
LEFT JOIN monthly_usage_summary ms ON u.id = ms.user_id 
    AND ms.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY u.created_at DESC;

-- Create view for easy usage monitoring
CREATE OR REPLACE VIEW user_usage_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_plan,
    sl.analyze_limit,
    COALESCE(ms.analyze_calls, 0) as current_usage,
    GREATEST(0, (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::INTEGER - COALESCE(ms.analyze_calls, 0)) as remaining_calls,
    CASE 
        WHEN (sl.analyze_limit * u.referral_multiplier + u.bonus_credits) > 0 THEN 
            ROUND((COALESCE(ms.analyze_calls, 0)::DECIMAL / (sl.analyze_limit * u.referral_multiplier + u.bonus_credits)::DECIMAL) * 100, 2)
        ELSE 0::DECIMAL
    END as usage_percentage,
    EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE))::INTEGER as days_until_reset,
    ms.last_updated
FROM users u
LEFT JOIN subscription_limits sl ON u.subscription_plan = sl.plan_name
LEFT JOIN monthly_usage_summary ms ON u.id = ms.user_id 
    AND ms.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');