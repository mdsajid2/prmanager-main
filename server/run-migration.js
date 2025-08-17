const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') 
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running API usage tracking migration...');
    
    // Read the SQL file
    const sqlFile = path.resolve(__dirname, '../database/api-usage-tracking.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('api_usage', 'monthly_usage_summary', 'subscription_limits')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:', tables.rows.map(r => r.table_name));
    
    // Check subscription plans
    const plans = await client.query('SELECT plan_name, analyze_limit, price_monthly FROM subscription_limits ORDER BY price_monthly');
    console.log('💰 Subscription plans:');
    plans.rows.forEach(plan => {
      console.log(`  - ${plan.plan_name}: ${plan.analyze_limit} analyses/month ($${plan.price_monthly})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();