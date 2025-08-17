const { Pool } = require("pg");
require("dotenv").config({ path: "../.env.production" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateProductionDB() {
  console.log("🚀 Migrating Production Database...");
  
  try {
    const client = await pool.connect();
    
    // Check existing columns
    console.log("🔍 Checking daily_usage table structure...");
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'daily_usage' 
      AND column_name IN ('bonus_calls', 'total_limit')
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    console.log("Existing columns:", existingColumns);
    
    // Add bonus_calls column if missing
    if (!existingColumns.includes('bonus_calls')) {
      console.log("🔄 Adding bonus_calls column...");
      await client.query(`
        ALTER TABLE daily_usage 
        ADD COLUMN IF NOT EXISTS bonus_calls INTEGER DEFAULT 0
      `);
      console.log("✅ bonus_calls column added!");
    } else {
      console.log("✅ bonus_calls column already exists");
    }
    
    // Add total_limit column if missing
    if (!existingColumns.includes('total_limit')) {
      console.log("🔄 Adding total_limit column...");
      await client.query(`
        ALTER TABLE daily_usage 
        ADD COLUMN IF NOT EXISTS total_limit INTEGER 
        GENERATED ALWAYS AS (daily_limit + COALESCE(bonus_calls, 0)) STORED
      `);
      console.log("✅ total_limit column added!");
    } else {
      console.log("✅ total_limit column already exists");
    }
    
    // Check if all users have referral stats
    console.log("🔍 Checking user referral stats...");
    const userCheck = await client.query(`
      SELECT COUNT(*) as missing_count 
      FROM users 
      WHERE id NOT IN (SELECT user_id FROM user_referral_stats)
    `);
    
    const missingCount = parseInt(userCheck.rows[0].missing_count);
    console.log(`Users without referral stats: ${missingCount}`);
    
    if (missingCount > 0) {
      console.log("🔄 Creating referral stats for existing users...");
      await client.query(`
        INSERT INTO user_referral_stats (user_id, referral_code)
        SELECT id, 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
        FROM users 
        WHERE id NOT IN (SELECT user_id FROM user_referral_stats)
      `);
      console.log(`✅ Created referral stats for ${missingCount} users!`);
    } else {
      console.log("✅ All users already have referral stats!");
    }
    
    // Verify table structures
    console.log("🔍 Final verification...");
    const finalCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM daily_usage) as daily_usage_count,
        (SELECT COUNT(*) FROM user_referral_stats) as referral_stats_count,
        (SELECT COUNT(*) FROM referrals) as referrals_count,
        (SELECT COUNT(*) FROM limit_requests) as limit_requests_count
    `);
    
    const counts = finalCheck.rows[0];
    console.log("📊 Table counts:");
    console.log(`  - daily_usage: ${counts.daily_usage_count}`);
    console.log(`  - user_referral_stats: ${counts.referral_stats_count}`);
    console.log(`  - referrals: ${counts.referrals_count}`);
    console.log(`  - limit_requests: ${counts.limit_requests_count}`);
    
    client.release();
    await pool.end();
    
    console.log("🎉 Production database migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateProductionDB();