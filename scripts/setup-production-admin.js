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

async function setupProductionAdmin() {
  try {
    console.log('🔍 Setting up production admin user...');
    console.log('📧 Admin email:', process.env.ADMIN_EMAIL);
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
      return;
    }
    
    // Check if admin user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
    
    if (userResult.rows.length === 0) {
      console.log('📝 Creating admin user...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      
      const insertResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        process.env.ADMIN_EMAIL,
        hashedPassword,
        'Admin',
        'User',
        'enterprise',
        true
      ]);
      
      console.log('✅ Admin user created successfully:');
      console.log('  Email:', insertResult.rows[0].email);
      console.log('  Name:', insertResult.rows[0].first_name, insertResult.rows[0].last_name);
      console.log('  Plan:', insertResult.rows[0].subscription_plan);
    } else {
      console.log('✅ Admin user already exists');
      const user = userResult.rows[0];
      
      // Update password to ensure it's correct
      console.log('🔧 Updating admin password...');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await pool.query('UPDATE users SET password_hash = $1, subscription_plan = $2, is_verified = $3 WHERE email = $4', [
        hashedPassword, 
        'enterprise', 
        true, 
        process.env.ADMIN_EMAIL
      ]);
      
      console.log('✅ Admin user updated:');
      console.log('  Email:', user.email);
      console.log('  Name:', user.first_name, user.last_name);
      console.log('  Plan: enterprise (updated)');
    }
    
    // Test admin functions exist
    console.log('🔍 Checking admin functions...');
    
    try {
      await pool.query('SELECT admin_reset_user_usage($1, $2)', ['00000000-0000-0000-0000-000000000000', process.env.ADMIN_EMAIL]);
      console.log('✅ admin_reset_user_usage function exists');
    } catch (error) {
      console.log('❌ admin_reset_user_usage function missing or broken');
    }
    
    try {
      await pool.query('SELECT admin_add_bonus_credits($1, $2, $3)', ['00000000-0000-0000-0000-000000000000', 10, process.env.ADMIN_EMAIL]);
      console.log('✅ admin_add_bonus_credits function exists');
    } catch (error) {
      console.log('❌ admin_add_bonus_credits function missing or broken');
    }
    
    // Check admin view
    try {
      const viewResult = await pool.query('SELECT COUNT(*) FROM admin_user_overview');
      console.log('✅ admin_user_overview view exists, users:', viewResult.rows[0].count);
    } catch (error) {
      console.log('❌ admin_user_overview view missing or broken');
    }
    
    console.log('🎉 Production admin setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up production admin:', error);
  } finally {
    await pool.end();
  }
}

setupProductionAdmin();