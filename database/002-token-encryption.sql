-- Token Encryption System
-- This migration adds secure token storage with AES-256-CBC encryption

-- Create user tokens table for encrypted storage
CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL, -- 'github', 'openai', 'anthropic', 'gemini'
    encrypted_token TEXT NOT NULL,   -- JSON: {"encrypted":"...", "iv":"..."}
    token_name VARCHAR(100),         -- User-friendly name
    last_used TIMESTAMP,             -- Usage tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token_type)      -- One token per type per user
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_type ON user_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_user_tokens_last_used ON user_tokens(last_used);