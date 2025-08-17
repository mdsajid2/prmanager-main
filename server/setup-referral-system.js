const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
});

async function setupReferralSystem() {
  console.log("🎁 Setting up referral system...");
  
  try {
    const client = await pool.connect();
    
    // Read and execute the referral system SQL
    const sqlPath = path.resolve(__dirname, "../database/referral-system.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    await client.query(sql);
    console.log("✅ Referral system tables created successfully!");
    
    // Create referral stats for existing users
    console.log("🔄 Creating referral stats for existing users...");
    await client.query(`
      INSERT INTO user_referral_stats (user_id, referral_code)
      SELECT id, generate_referral_code()
      FROM users 
      WHERE id NOT IN (SELECT user_id FROM user_referral_stats)
    `);
    
    console.log("✅ Referral stats created for existing users!");
    
    client.release();
    await pool.end();
    
    console.log("🎉 Referral system setup complete!");
  } catch (error) {
    console.error("❌ Failed to setup referral system:", error);
    process.exit(1);
  }
}

setupReferralSystem();