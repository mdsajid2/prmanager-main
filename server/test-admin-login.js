const { Pool } = require('pg');
const bcrypt = require('bcrypt');
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

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...');
    
    // Check if admin user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['mdsajid8636@gmail.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Admin user found:', user.email);
    
    // Test password
    const adminPassword = process.env.ADMIN_PASSWORD || 'SahYan@2020';
    const passwordMatch = await bcrypt.compare(adminPassword, user.password_hash);
    
    if (passwordMatch) {
      console.log('✅ Admin password is correct');
      console.log('👤 Admin user details:');
      console.log('  - Email:', user.email);
      console.log('  - Name:', user.first_name, user.last_name);
      console.log('  - Plan:', user.subscription_plan);
      console.log('  - Created:', user.created_at);
    } else {
      console.log('❌ Admin password is incorrect');
      console.log('🔧 Updating admin password...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'mdsajid8636@gmail.com']);
      
      console.log('✅ Admin password updated successfully');
    }
    
  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    await pool.end();
  }
}

testAdminLogin();