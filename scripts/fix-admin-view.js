const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

async function fixAdminView() {
  try {
    console.log('🔧 Fixing admin_user_overview view...');
    
    // Drop and recreate the view
    await pool.query('DROP VIEW IF EXISTS admin_user_overview');
    console.log('✅ Dropped existing view');
    
    // Create the view with proper structure
    await pool.query(`
      CREATE OR REPLACE VIEW admin_user_overview AS
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.subscription_plan,
        COALESCE(u.total_referrals, 0) as total_referrals,
        COALESCE(u.bonus_credits, 0) as bonus_credits,
        COALESCE(u.referral_multiplier, 1.0) as referral_multiplier,
        COALESCE(u.referral_code, '') as referral_code,
        COALESCE(mus.analyze_calls, 0) as current_usage,
        CASE 
          WHEN u.subscription_plan = 'free' THEN (10 * COALESCE(u.referral_multiplier, 1.0) + COALESCE(u.bonus_credits, 0))
          WHEN u.subscription_plan = 'pro' THEN (100 * COALESCE(u.referral_multiplier, 1.0) + COALESCE(u.bonus_credits, 0))
          WHEN u.subscription_plan = 'enterprise' THEN (1000 * COALESCE(u.referral_multiplier, 1.0) + COALESCE(u.bonus_credits, 0))
          ELSE 10
        END::INTEGER as effective_limit,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN monthly_usage_summary mus ON u.id = mus.user_id 
        AND mus.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      ORDER BY u.created_at DESC;
    `);
    
    console.log('✅ Created admin_user_overview view');
    
    // Test the view
    const result = await pool.query('SELECT COUNT(*) as user_count FROM admin_user_overview');
    console.log('📊 Users in view:', result.rows[0].user_count);
    
    if (result.rows[0].user_count > 0) {
      const sampleResult = await pool.query('SELECT email, first_name, last_name, subscription_plan FROM admin_user_overview LIMIT 5');
      console.log('👥 Sample users:');
      sampleResult.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.first_name} ${user.last_name}) - ${user.subscription_plan}`);
      });
    } else {
      console.log('⚠️ No users found in the view');
      
      // Check if there are users in the base table
      const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
      console.log('👤 Total users in users table:', usersResult.rows[0].total);
    }
    
    console.log('🎉 Admin view fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing admin view:', error);
  } finally {
    await pool.end();
  }
}

fixAdminView();