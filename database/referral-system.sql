-- Referral system tables
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL, -- User who shared the link
    referral_code TEXT UNIQUE NOT NULL, -- Unique referral code
    referred_email TEXT, -- Email of referred user (when they sign up)
    referred_user_id UUID, -- User ID when they complete signup
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    bonus_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Limit increase requests
CREATE TABLE IF NOT EXISTS limit_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    current_limit INTEGER NOT NULL,
    requested_limit INTEGER NOT NULL,
    reason TEXT NOT NULL,
    use_case TEXT,
    company TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User referral stats (denormalized for performance)
CREATE TABLE IF NOT EXISTS user_referral_stats (
    user_id UUID PRIMARY KEY,
    referral_code TEXT UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    bonus_calls_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_limit_requests_user ON limit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_requests_status ON limit_requests(status);

-- Functions
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
BEGIN
    RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Trigger to create referral stats when user signs up
CREATE OR REPLACE FUNCTION create_user_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_referral_stats (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update daily_usage table to include bonus calls
ALTER TABLE daily_usage 
ADD COLUMN IF NOT EXISTS bonus_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_limit INTEGER GENERATED ALWAYS AS (daily_limit + bonus_calls) STORED;