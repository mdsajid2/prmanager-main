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
});

async function checkAdminUser() {
  try {
    console.log('🔍 Checking for admin user...');
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', ['mdsajid8636@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin user found:');
      console.log('  Email:', result.rows[0].email);
      console.log('  Name:', result.rows[0].first_name, result.rows[0].last_name);
      console.log('  Plan:', result.rows[0].subscription_plan);
      console.log('  Created:', result.rows[0].created_at);
    } else {
      console.log('❌ Admin user not found in database');
      console.log('📝 Creating admin user...');
      
      // Create admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      
      const insertResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        'mdsajid8636@gmail.com',
        hashedPassword,
        'Admin',
        'User',
        'enterprise'
      ]);
      
      console.log('✅ Admin user created successfully:');
      console.log('  Email:', insertResult.rows[0].email);
      console.log('  Name:', insertResult.rows[0].first_name, insertResult.rows[0].last_name);
    }
    
  } catch (error) {
    console.error('❌ Error checking/creating admin user:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser();