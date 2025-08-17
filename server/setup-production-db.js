const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production database connection
const productionPool = new Pool({
  connectionString: 'postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setupProductionDatabase() {
  const client = await productionPool.connect();
  
  try {
    console.log('🚀 Setting up production database for referral system...');
    
    // Step 1: Update subscription limits for free platform
    console.log('\n💰 Updating subscription plans...');
    await client.query(`
      UPDATE subscription_limits SET 
        monthly_api_limit = 50,
        analyze_limit = 10,
        price_monthly = 0,
        features = '{"features": ["Basic PR analysis", "10 AI analyses/month", "Unlimited basic features", "Community support"]}'
      WHERE plan_name = 'free';
    `);
    
    // Disable paid plans
    await client.query(`
      UPDATE subscription_limits SET is_active = false 
      WHERE plan_name IN ('pro', 'enterprise');
    `);
    console.log('✅ Updated subscription plans for free platform');
    
    // Step 2: Add referral system tables
    console.log('\n📊 Creating referral tables...');
    
    // Create user_referrals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_email VARCHAR(255) NOT NULL,
        referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        referral_code VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        bonus_credits INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(referrer_id, referred_email)
      );
    `);
    console.log('✅ Created user_referrals table');
    
    // Step 3: Add referral columns to users table
    console.log('\n👥 Adding referral columns to users table...');
    
    const referralColumns = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_multiplier DECIMAL(3,2) DEFAULT 1.00'
    ];
    
    for (const sql of referralColumns) {
      await client.query(sql);
    }
    console.log('✅ Added referral columns to users table');
    
    // Step 4: Generate referral codes for existing users
    console.log('\n🔗 Generating referral codes for existing users...');
    await client.query(`
      UPDATE users 
      SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) 
      WHERE referral_code IS NULL;
    `);
    console.log('✅ Generated referral codes for existing users');
    
    // Step 5: Create indexes
    console.log('\n📈 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code)',
      'CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)'
    ];
    
    for (const sql of indexes) {
      await client.query(sql);
    }
    console.log('✅ Created indexes');
    
    // Step 6: Create referral functions
    console.log('\n⚙️ Creating referral functions...');
    
    // Function to calculate user's effective API limit
    await client.query(`
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
    `);
    
    // Function to process referral completion
    await client.query(`
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
          bonus_credits = bonus_credits + 10,
          referral_multiplier = LEAST(2.0, 1.0 + (total_referrals + 1) * 0.02)
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
    `);
    
    // Admin functions
    await client.query(`
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
    `);
    
    await client.query(`
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
    `);
    
    console.log('✅ Created referral functions');
    
    // Step 7: Update the usage stats function to include referral bonuses
    console.log('\n📊 Updating usage stats function...');
    
    // Drop existing function first
    await client.query('DROP FUNCTION IF EXISTS get_user_usage_stats(UUID);');
    
    // Create updated function
    await client.query(`
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
    `);
    console.log('✅ Updated usage stats function');
    
    // Step 8: Create admin overview view
    console.log('\n🛠️ Creating admin overview view...');
    await client.query(`
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
    `);
    console.log('✅ Created admin overview view');
    
    // Step 9: Verify everything is working
    console.log('\n🔍 Verifying setup...');
    
    // Test the functions
    const users = await client.query('SELECT id FROM users LIMIT 1');
    if (users.rows.length > 0) {
      const testUserId = users.rows[0].id;
      
      // Test usage stats function
      const usageTest = await client.query('SELECT * FROM get_user_usage_stats($1)', [testUserId]);
      console.log('✅ Usage stats function working');
      
      // Test effective limits function
      const limitsTest = await client.query('SELECT * FROM get_user_effective_limits($1)', [testUserId]);
      console.log('✅ Effective limits function working');
      
      // Test admin view
      const adminTest = await client.query('SELECT COUNT(*) FROM admin_user_overview');
      console.log('✅ Admin overview view working');
    }
    
    console.log('\n🎉 Production database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Referral system tables created');
    console.log('✅ User table enhanced with referral columns');
    console.log('✅ Referral codes generated for existing users');
    console.log('✅ All required functions created');
    console.log('✅ Admin panel functions ready');
    console.log('✅ Free platform model activated');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await productionPool.end();
  }
}

setupProductionDatabase();