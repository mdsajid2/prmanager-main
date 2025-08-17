#!/bin/bash

# Simple Admin Fix Script
echo "🔧 SIMPLE ADMIN FIX"
echo "==================="

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[FIX] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    exit 1
fi

cd $APP_DIR

echo ""
echo "1. UPDATING EXISTING ADMIN USER"
echo "==============================="

info "Updating existing admin user with fresh password..."

cd server

cat > update_admin.js << 'UPDATE_ADMIN'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function updateAdmin() {
  try {
    console.log('🔄 Updating existing admin user...');
    console.log('Admin email:', process.env.ADMIN_EMAIL);
    console.log('JWT Secret length:', process.env.JWT_SECRET?.length);
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD not set');
    }
    
    // Hash password with current keys
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    // Update existing admin user
    const result = await pool.query(`
      UPDATE users 
      SET 
        password_hash = $1,
        subscription_plan = 'enterprise',
        is_verified = true,
        api_usage_limit = 10000,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, email, subscription_plan, is_verified, created_at
    `, [hashedPassword, process.env.ADMIN_EMAIL]);
    
    if (result.rows.length === 0) {
      console.log('Admin user not found, creating new one...');
      
      const createResult = await pool.query(`
        INSERT INTO users (
          email, 
          password_hash, 
          first_name, 
          last_name, 
          subscription_plan, 
          is_verified,
          api_usage_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, subscription_plan, is_verified, created_at
      `, [
        process.env.ADMIN_EMAIL,
        hashedPassword,
        'Admin',
        'User',
        'enterprise',
        true,
        10000
      ]);
      
      console.log('✅ New admin user created:');
      console.table(createResult.rows);
    } else {
      console.log('✅ Admin user updated:');
      console.table(result.rows);
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, hashedPassword);
    console.log('Password verification:', passwordMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    // Test database connection
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection verified:', testQuery.rows[0].current_time);
    
    console.log('🎉 Admin update completed successfully!');
    
  } catch (error) {
    console.error('❌ Admin update failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAdmin();
UPDATE_ADMIN

if node update_admin.js; then
    log "✅ Admin user updated"
else
    error "❌ Admin update failed"
fi

rm -f update_admin.js
cd ..

echo ""
echo "2. REBUILDING SERVER ONLY"
echo "========================="

info "Building server with new admin routes..."
cd server
npm run build
if [ ! -f "dist/index.js" ]; then
    error "Server build failed!"
    exit 1
fi
cd ..

log "✅ Server rebuilt"

echo ""
echo "3. RESTARTING PM2"
echo "================="

info "Restarting PM2 with updated code..."

# Restart PM2
if command -v pm2 >/dev/null 2>&1; then
    sudo -u ec2-user bash << 'PM2_RESTART'
    cd /home/ec2-user/prmanager
    
    # Load environment
    export $(grep -v '^#' .env | xargs)
    
    # Restart PM2
    pm2 restart pr-manager || pm2 start server/dist/index.js --name pr-manager
    
    # Save configuration
    pm2 save
PM2_RESTART
else
    error "PM2 not found"
    exit 1
fi

log "✅ PM2 restarted"

echo ""
echo "4. TESTING ADMIN SYSTEM"
echo "======================="

sleep 5

info "Testing server health..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Server responding"
else
    error "❌ Server not responding"
    sudo -u ec2-user pm2 logs pr-manager --lines 10
    exit 1
fi

info "Testing new admin API..."
NEW_ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/new_admin_health.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin API response: $NEW_ADMIN_HEALTH"

if [ "$NEW_ADMIN_HEALTH" = "200" ]; then
    log "✅ New admin API working"
    cat /tmp/new_admin_health.json | jq . 2>/dev/null || cat /tmp/new_admin_health.json
else
    warn "New admin API not responding, checking logs..."
    sudo -u ec2-user pm2 logs pr-manager --lines 20
fi
rm -f /tmp/new_admin_health.json

info "Testing admin login..."
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)
ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d'=' -f2)

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/admin_login_test.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    echo "Admin login response: $LOGIN_RESPONSE"
    
    if [ "$LOGIN_RESPONSE" = "200" ]; then
        log "✅ Admin login successful!"
        
        # Test new admin endpoints
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(jq -r '.token' /tmp/admin_login_test.json 2>/dev/null)
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                echo "Testing new admin users endpoint..."
                USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/new_admin_users_test.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/new-admin/users)
                
                echo "New admin users response: $USERS_RESPONSE"
                
                if [ "$USERS_RESPONSE" = "200" ]; then
                    log "✅ NEW ADMIN SYSTEM IS WORKING!"
                    echo "Users found:"
                    cat /tmp/new_admin_users_test.json | jq length 2>/dev/null || echo "Users data available"
                else
                    error "❌ New admin users endpoint failed"
                    echo "Response body:"
                    cat /tmp/new_admin_users_test.json 2>/dev/null || true
                    echo "Checking server logs..."
                    sudo -u ec2-user pm2 logs pr-manager --lines 10
                fi
                rm -f /tmp/new_admin_users_test.json
            else
                warn "Could not extract token from login response"
            fi
        fi
    else
        error "❌ Admin login failed"
        echo "Response body:"
        cat /tmp/admin_login_test.json 2>/dev/null || true
    fi
    rm -f /tmp/admin_login_test.json
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
if [ "$NEW_ADMIN_HEALTH" = "200" ] && [ "$LOGIN_RESPONSE" = "200" ]; then
    log "🎉 ADMIN SYSTEM FIXED!"
    echo ""
    echo "🌐 ACCESS URLs:"
    echo "   Main App: http://$PUBLIC_IP:8080/"
    echo "   NEW Admin: http://$PUBLIC_IP:8080/new-admin"
    echo ""
    echo "👤 ADMIN LOGIN:"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Password: [from .env]"
    echo ""
    log "✅ Try the new admin panel now!"
else
    error "❌ Some issues remain. Check the logs above."
    echo ""
    echo "🔧 DEBUG COMMANDS:"
    echo "   Server logs: pm2 logs pr-manager"
    echo "   Server status: pm2 status"
    echo "   Restart: pm2 restart pr-manager"
fi

echo ""
sudo -u ec2-user pm2 status