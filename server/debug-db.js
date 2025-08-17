const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') 
    ? { rejectUnauthorized: false }
    : false,
});

async function debugDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', testResult.rows[0].now);
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    console.log('👤 Users table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Count users
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      console.log('📊 Total users in database:', userCount.rows[0].count);
      
      // Show first few users (without passwords)
      const users = await client.query(`
        SELECT id, email, first_name, last_name, created_at, subscription_plan 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('👥 Recent users:');
      users.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.first_name || 'No name'}) - ${user.subscription_plan || 'No plan'}`);
      });
      
      // Check for test user
      const testUser = await client.query('SELECT email FROM users WHERE email = $1', ['test@prmanager.com']);
      console.log('🧪 Test user exists:', testUser.rows.length > 0);
    } else {
      console.log('❌ Users table does not exist! Need to run migrations.');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugDatabase();