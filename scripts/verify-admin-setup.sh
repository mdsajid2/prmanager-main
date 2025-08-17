#!/bin/bash

# Verify Admin Setup Script
echo "🔍 VERIFYING ADMIN SETUP"
echo "========================"

APP_DIR="/home/ec2-user/prmanager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[CHECK] $1${NC}"; }

cd $APP_DIR

echo ""
echo "1. CHECKING ENVIRONMENT VARIABLES"
echo "================================="

info "Checking .env file..."
if [ -f ".env" ]; then
    log "✅ .env file exists"
    
    # Check required variables
    ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)
    JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d'=' -f2)
    
    echo "Admin email: $ADMIN_EMAIL"
    echo "JWT secret length: ${#JWT_SECRET}"
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$JWT_SECRET" ]; then
        log "✅ Required environment variables are set"
    else
        error "❌ Missing required environment variables"
    fi
else
    error "❌ .env file not found"
    exit 1
fi

echo ""
echo "2. CHECKING DATABASE ADMIN USER"
echo "==============================="

info "Checking admin user in database..."

cd server

cat > check_admin_user.js << 'ADMIN_CHECK'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function checkAdminUser() {
  try {
    console.log('🔍 CHECKING ADMIN USER SETUP');
    console.log('============================');
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    
    console.log('Admin email:', adminEmail);
    console.log('JWT secret length:', jwtSecret?.length);
    console.log('Environment:', process.env.NODE_ENV);
    
    if (!adminEmail || !adminPassword || !jwtSecret) {
      console.error('❌ Missing required environment variables');
      process.exit(1);
    }
    
    // Check if admin user exists
    const userResult = await pool.query(
      'SELECT id, email, subscription_plan, is_verified, password_hash FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Admin user not found in database');
      console.log('Creating admin user...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const createResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan, is_verified, api_usage_limit)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, subscription_plan, is_verified
      `, [adminEmail, hashedPassword, 'Admin', 'User', 'enterprise', true, 10000]);
      
      console.log('✅ Admin user created:');
      console.table(createResult.rows);
      
    } else {
      const user = userResult.rows[0];
      console.log('✅ Admin user found in database:');
      console.table([{
        id: user.id,
        email: user.email,
        subscription_plan: user.subscription_plan,
        is_verified: user.is_verified
      }]);
      
      // Test password verification
      const passwordMatch = await bcrypt.compare(adminPassword, user.password_hash);
      console.log('Password verification:', passwordMatch ? '✅ MATCH' : '❌ NO MATCH');
      
      if (!passwordMatch) {
        console.log('🔧 Updating admin password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await pool.query(
          'UPDATE users SET password_hash = $1, subscription_plan = $2, is_verified = $3 WHERE email = $4',
          [hashedPassword, 'enterprise', true, adminEmail]
        );
        console.log('✅ Admin password updated');
      }
    }
    
    // Test JWT token generation and verification
    console.log('\n🔍 TESTING JWT TOKEN');
    console.log('====================');
    
    const userForToken = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (userForToken.rows.length > 0) {
      const user = userForToken.rows[0];
      
      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      console.log('✅ Token generated successfully');
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Verify token
      try {
        const decoded = jwt.verify(token, jwtSecret);
        console.log('✅ Token verification successful');
        console.log('Decoded user ID:', decoded.userId);
        console.log('Decoded email:', decoded.email);
      } catch (error) {
        console.error('❌ Token verification failed:', error.message);
      }
    }
    
    console.log('\n🎉 ADMIN SETUP VERIFICATION COMPLETE');
    
  } catch (error) {
    console.error('❌ Admin verification failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAdminUser();
ADMIN_CHECK

if node check_admin_user.js; then
    log "✅ Admin user verification completed"
else
    error "❌ Admin user verification failed"
    exit 1
fi

rm -f check_admin_user.js
cd ..

echo ""
echo "3. TESTING BACKEND API DIRECTLY"
echo "==============================="

info "Testing admin login and new admin API..."

# Test login
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/admin_login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$(grep '^ADMIN_PASSWORD=' .env | cut -d'=' -f2)\"}")

echo "Login response: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" = "200" ]; then
    log "✅ Admin login successful"
    
    # Extract token and test new admin API
    if command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/admin_login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            echo "Testing new admin users endpoint..."
            
            USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/admin_users.json \
                -H "Authorization: Bearer $TOKEN" \
                http://localhost:8080/api/new-admin/users)
            
            echo "New admin users response: $USERS_RESPONSE"
            
            if [ "$USERS_RESPONSE" = "200" ]; then
                log "✅ NEW ADMIN API WORKING!"
                echo "Users found:"
                cat /tmp/admin_users.json | jq length 2>/dev/null || echo "Users data available"
            else
                error "❌ New admin API failed"
                echo "Response:"
                cat /tmp/admin_users.json 2>/dev/null || echo "No response body"
                
                # Check server logs
                echo "Recent server logs:"
                pm2 logs pr-manager --lines 10 || echo "No PM2 logs available"
            fi
            rm -f /tmp/admin_users.json
        fi
    fi
else
    error "❌ Admin login failed"
    echo "Response:"
    cat /tmp/admin_login.json 2>/dev/null || echo "No response body"
fi

rm -f /tmp/admin_login.json

echo ""
echo "4. RESTARTING PM2 WITH FRESH CONFIG"
echo "==================================="

info "Restarting PM2 to ensure fresh environment..."

# Restart PM2
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart pr-manager || pm2 start server/dist/index.js --name pr-manager
    pm2 save
    log "✅ PM2 restarted"
    
    # Wait and test again
    sleep 3
    
    info "Testing after PM2 restart..."
    HEALTH_CHECK=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/new-admin/health 2>/dev/null)
    echo "New admin health after restart: $HEALTH_CHECK"
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        log "✅ New admin API responding after restart"
    else
        warn "New admin API not responding after restart"
    fi
else
    error "PM2 not found"
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
if [ "$LOGIN_RESPONSE" = "200" ] && [ "$USERS_RESPONSE" = "200" ]; then
    log "🎉 ADMIN SETUP IS WORKING!"
    echo ""
    echo "✅ Admin user is properly configured"
    echo "✅ JWT tokens are working"
    echo "✅ New admin API is responding"
    echo ""
    echo "🌐 Try the new admin panel:"
    echo "   http://$PUBLIC_IP:8080/new-admin"
    echo ""
    echo "👤 Admin credentials:"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Password: [from .env]"
else
    error "❌ ADMIN SETUP HAS ISSUES"
    echo ""
    echo "🔧 Issues found:"
    [ "$LOGIN_RESPONSE" != "200" ] && echo "- Admin login failed"
    [ "$USERS_RESPONSE" != "200" ] && echo "- New admin API not working"
    echo ""
    echo "Check the logs above for details"
fi

echo ""
pm2 status