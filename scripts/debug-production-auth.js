const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

async function debugAuth() {
  try {
    console.log('🔍 Debugging Production Authentication...');
    console.log('=====================================');
    
    // Check environment variables
    console.log('\n1️⃣ Environment Variables:');
    console.log('   ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'NOT SET');
    console.log('   ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET (' + process.env.JWT_SECRET.length + ' chars)' : 'NOT SET');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Check admin user in database
    console.log('\n2️⃣ Admin User in Database:');
    const userResult = await pool.query('SELECT id, email, first_name, last_name, subscription_plan, is_verified, created_at FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
    
    if (userResult.rows.length === 0) {
      console.log('   ❌ Admin user NOT FOUND in database');
      return;
    }
    
    const adminUser = userResult.rows[0];
    console.log('   ✅ Admin user found:');
    console.log('      ID:', adminUser.id);
    console.log('      Email:', adminUser.email);
    console.log('      Name:', adminUser.first_name, adminUser.last_name);
    console.log('      Plan:', adminUser.subscription_plan);
    console.log('      Verified:', adminUser.is_verified);
    console.log('      Created:', adminUser.created_at);
    
    // Test password
    console.log('\n3️⃣ Password Verification:');
    const fullUserResult = await pool.query('SELECT password_hash FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
    const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, fullUserResult.rows[0].password_hash);
    console.log('   Password matches:', passwordMatch ? '✅ YES' : '❌ NO');
    
    // Test JWT token creation
    console.log('\n4️⃣ JWT Token Test:');
    if (process.env.JWT_SECRET) {
      try {
        const testToken = jwt.sign(
          { 
            userId: adminUser.id, 
            email: adminUser.email 
          }, 
          process.env.JWT_SECRET, 
          { expiresIn: '24h' }
        );
        console.log('   ✅ JWT token creation successful');
        console.log('   Token preview:', testToken.substring(0, 50) + '...');
        
        // Test token verification
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
        console.log('   ✅ JWT token verification successful');
        console.log('   Decoded user ID:', decoded.userId);
        console.log('   Decoded email:', decoded.email);
      } catch (error) {
        console.log('   ❌ JWT token test failed:', error.message);
      }
    } else {
      console.log('   ❌ JWT_SECRET not set');
    }
    
    // Test admin view
    console.log('\n5️⃣ Admin Database View:');
    try {
      const viewResult = await pool.query('SELECT COUNT(*) as user_count FROM admin_user_overview');
      console.log('   ✅ admin_user_overview view working');
      console.log('   Total users in view:', viewResult.rows[0].user_count);
      
      // Show first few users
      const usersResult = await pool.query('SELECT email, first_name, last_name FROM admin_user_overview LIMIT 3');
      console.log('   Sample users:');
      usersResult.rows.forEach(user => {
        console.log('      -', user.email, '(' + user.first_name, user.last_name + ')');
      });
    } catch (error) {
      console.log('   ❌ admin_user_overview view error:', error.message);
    }
    
    // Test user sessions
    console.log('\n6️⃣ User Sessions:');
    try {
      const sessionsResult = await pool.query('SELECT COUNT(*) as session_count FROM user_sessions WHERE user_id = $1', [adminUser.id]);
      console.log('   Admin user sessions:', sessionsResult.rows[0].session_count);
    } catch (error) {
      console.log('   ❌ Sessions check failed:', error.message);
    }
    
    console.log('\n🎉 Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugAuth();