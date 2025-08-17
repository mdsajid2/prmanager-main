const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') 
    ? { rejectUnauthorized: false }
    : false,
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    const email = 'test@prmanager.com';
    const password = 'test1234';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists');
      return;
    }
    
    // Create test user
    const result = await client.query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, 
        is_verified, subscription_plan, api_usage_count, api_usage_limit
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, 
        true, 'free', 0, 10
      ) RETURNING id, email
    `, [email, hashedPassword, 'Test', 'User']);
    
    console.log('✅ Test user created successfully:');
    console.log('   Email:', result.rows[0].email);
    console.log('   Password: test1234');
    console.log('   ID:', result.rows[0].id);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();