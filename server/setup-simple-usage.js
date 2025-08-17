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

async function setupSimpleUsage() {
  console.log("🔧 Setting up simple daily usage table...");
  
  try {
    const client = await pool.connect();
    
    // Read and execute the SQL file
    const sqlPath = path.resolve(__dirname, "../database/simple-daily-usage.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    await client.query(sql);
    console.log("✅ Simple daily usage table created successfully!");
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error("❌ Failed to setup simple usage table:", error);
    process.exit(1);
  }
}

setupSimpleUsage();