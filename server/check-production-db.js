const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production database connection
const productionPool = new Pool({
  connectionString: 'postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkProductionDatabase() {
  const client = await productionPool.connect();
  
  try {
    console.log('🔍 Checking production database...');
    
    // Test connection
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Production database connected at:', testResult.rows[0].now);
    
    // Check required tables
    const requiredTables = [
      'users',
      'user_sessions', 
      'user_tokens',
      'api_usage',
      'monthly_usage_summary',
      'subscription_limits',
      'user_referrals'
    ];
    
    console.log('\n📊 Checking required tables...');
    for (const tableName of requiredTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      const exists = tableCheck.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    // Check required functions
    const requiredFunctions = [
      'get_user_usage_stats',
      'complete_referral',
      'get_user_effective_limits',
      'admin_reset_user_usage',
      'admin_add_bonus_credits'
    ];
    
    console.log('\n⚙️ Checking required functions...');
    for (const funcName of requiredFunctions) {
      const funcCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = $1
        );
      `, [funcName]);
      
      const exists = funcCheck.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${funcName}(): ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    // Check subscription plans
    console.log('\n💰 Checking subscription plans...');
    try {
      const plansCheck = await client.query('SELECT plan_name, analyze_limit, price_monthly FROM subscription_limits ORDER BY price_monthly');
      if (plansCheck.rows.length > 0) {
        console.log('✅ Subscription plans found:');
        plansCheck.rows.forEach(plan => {
          console.log(`  - ${plan.plan_name}: ${plan.analyze_limit} analyses/month ($${plan.price_monthly})`);
        });
      } else {
        console.log('❌ No subscription plans found');
      }
    } catch (error) {
      console.log('❌ Error checking subscription plans:', error.message);
    }
    
    // Check users table structure
    console.log('\n👥 Checking users table structure...');
    try {
      const userColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      const requiredUserColumns = [
        'referral_code',
        'referred_by', 
        'total_referrals',
        'bonus_credits',
        'referral_multiplier',
        'subscription_plan'
      ];
      
      const existingColumns = userColumns.rows.map(col => col.column_name);
      
      for (const colName of requiredUserColumns) {
        const exists = existingColumns.includes(colName);
        console.log(`${exists ? '✅' : '❌'} users.${colName}: ${exists ? 'EXISTS' : 'MISSING'}`);
      }
    } catch (error) {
      console.log('❌ Error checking users table:', error.message);
    }
    
    // Count existing data
    console.log('\n📈 Checking existing data...');
    try {
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Total users: ${userCount.rows[0].count}`);
      
      if (parseInt(userCount.rows[0].count) > 0) {
        const referralCount = await client.query('SELECT COUNT(*) FROM users WHERE total_referrals > 0');
        console.log(`🔗 Users with referrals: ${referralCount.rows[0].count}`);
        
        const usageCount = await client.query('SELECT COUNT(*) FROM api_usage');
        console.log(`📊 Total API calls tracked: ${usageCount.rows[0].count}`);
      }
    } catch (error) {
      console.log('❌ Error checking data:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    client.release();
    await productionPool.end();
  }
}

checkProductionDatabase();