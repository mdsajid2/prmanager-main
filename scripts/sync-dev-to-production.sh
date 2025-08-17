#!/bin/bash

# Sync Development Configuration to Production
echo "🔄 SYNCING DEVELOPMENT TO PRODUCTION"
echo "===================================="

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
info() { echo -e "${BLUE}[SYNC] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    exit 1
fi

cd $APP_DIR

echo ""
echo "1. COPYING DEVELOPMENT KEYS TO PRODUCTION"
echo "========================================="

info "Using EXACT development configuration..."

# Backup current production .env
cp .env .env.production.backup.$(date +%Y%m%d_%H%M%S)
log "✅ Production .env backed up"

# Use development keys (from your local .env)
cat > .env << 'DEV_ENV'
# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=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

# Server configuration
PORT=8080
NODE_ENV=production

# Database configuration
DATABASE_URL=postgresql://postgres.qgoolddhdvuhidstzqhq:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Authentication - USING DEVELOPMENT KEYS
JWT_SECRET=pr_mgr_2024_k9x7m3n8q2w5e1r6t9y4u8i5o0p3a7s2d6f9g1h4j7k0l3z8x5c2v7b4n1m9q6w3e8r5t2y7u

# Encryption for sensitive data (GitHub tokens, API keys) - USING DEVELOPMENT KEY
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Local Test User (Development Only)
TEST_USER_EMAIL=test@prmanager.com
TEST_USER_PASSWORD=test1234
TEST_USER_NAME=Test User

# Admin Access (Environment Controlled)
ADMIN_EMAIL=mdsajid8636@gmail.com
ADMIN_PASSWORD=SahYan@2020

# GitHub Integration (Optional)
# GITHUB_TOKEN=your_github_personal_access_token

# Supabase Configuration (Production)
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DEV_ENV

log "✅ Development configuration copied to production"

echo ""
echo "2. CHECKING DATABASE STATE"
echo "=========================="

info "Analyzing database for token/auth issues..."

cd server

cat > check_database_state.js << 'DB_CHECK'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS');
    console.log('==================================');
    
    // Check users table structure
    console.log('\n1. USERS TABLE STRUCTURE:');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.table(tableInfo.rows);
    
    // Check all users
    console.log('\n2. ALL USERS IN DATABASE:');
    const allUsers = await pool.query(`
      SELECT id, email, first_name, last_name, subscription_plan, is_verified, 
             created_at, updated_at, api_usage_count, api_usage_limit
      FROM users 
      ORDER BY created_at DESC
    `);
    console.table(allUsers.rows);
    
    // Check admin user specifically
    console.log('\n3. ADMIN USER DETAILS:');
    if (process.env.ADMIN_EMAIL) {
      const adminUser = await pool.query(`
        SELECT id, email, first_name, last_name, subscription_plan, is_verified,
               LENGTH(password_hash) as password_hash_length,
               created_at, updated_at
        FROM users 
        WHERE email = $1
      `, [process.env.ADMIN_EMAIL]);
      
      if (adminUser.rows.length > 0) {
        console.log('✅ Admin user found:');
        console.table(adminUser.rows);
        
        // Test password verification
        const user = adminUser.rows[0];
        const fullUser = await pool.query('SELECT password_hash FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
        const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, fullUser.rows[0].password_hash);
        console.log(`Password verification: ${passwordMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        
      } else {
        console.log('❌ Admin user NOT found in database');
      }
    }
    
    // Check sessions table if exists
    console.log('\n4. SESSIONS TABLE:');
    try {
      const sessions = await pool.query('SELECT COUNT(*) as session_count FROM sessions');
      console.log(`Sessions in database: ${sessions.rows[0].session_count}`);
      
      const recentSessions = await pool.query(`
        SELECT user_id, created_at, expires_at, 
               CASE WHEN expires_at > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
        FROM sessions 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      console.table(recentSessions.rows);
    } catch (e) {
      console.log('Sessions table not found or accessible');
    }
    
    // Check for any auth-related tables
    console.log('\n5. AUTH-RELATED TABLES:');
    const authTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%auth%' OR table_name LIKE '%token%' OR table_name LIKE '%session%')
    `);
    console.table(authTables.rows);
    
    // Check database functions
    console.log('\n6. ADMIN FUNCTIONS:');
    try {
      const functions = await pool.query(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%admin%'
      `);
      console.table(functions.rows);
    } catch (e) {
      console.log('Could not check functions');
    }
    
    console.log('\n🎯 ANALYSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Database analysis failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
DB_CHECK

if node check_database_state.js; then
    log "✅ Database analysis completed"
else
    error "❌ Database analysis failed"
fi

rm -f check_database_state.js
cd ..

echo ""
echo "3. RECREATING ADMIN USER WITH DEVELOPMENT KEYS"
echo "=============================================="

info "Recreating admin user with exact development configuration..."

cd server

cat > recreate_admin.js << 'ADMIN_RECREATE'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function recreateAdmin() {
  try {
    console.log('🔄 RECREATING ADMIN USER');
    console.log('========================');
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.error('❌ ADMIN_EMAIL or ADMIN_PASSWORD not set');
      return;
    }
    
    console.log('Admin email:', process.env.ADMIN_EMAIL);
    console.log('Using development JWT_SECRET length:', process.env.JWT_SECRET.length);
    console.log('Using development ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY.length);
    
    // Delete existing admin user
    await pool.query('DELETE FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
    console.log('✅ Existing admin user deleted');
    
    // Create fresh admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, subscription_plan, is_verified
    `, [
      process.env.ADMIN_EMAIL,
      hashedPassword,
      'Admin',
      'User',
      'enterprise',
      true
    ]);
    
    console.log('✅ Fresh admin user created:');
    console.table(result.rows);
    
    // Verify password immediately
    const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, hashedPassword);
    console.log(`Password verification: ${passwordMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    // Clean up any existing sessions
    try {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [result.rows[0].id]);
      console.log('✅ Old sessions cleaned up');
    } catch (e) {
      console.log('No sessions to clean up');
    }
    
    console.log('🎉 Admin user recreated successfully');
    
  } catch (error) {
    console.error('❌ Admin recreation failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

recreateAdmin();
ADMIN_RECREATE

if node recreate_admin.js; then
    log "✅ Admin user recreated"
else
    error "❌ Admin recreation failed"
fi

rm -f recreate_admin.js
cd ..

echo ""
echo "4. RESTARTING SERVICES WITH DEVELOPMENT CONFIG"
echo "=============================================="

info "Stopping existing processes..."

# Stop PM2
if command -v pm2 >/dev/null 2>&1; then
    sudo -u ec2-user pm2 stop $SERVICE_NAME 2>/dev/null || true
    sudo -u ec2-user pm2 delete $SERVICE_NAME 2>/dev/null || true
fi

# Kill port 8080 processes
PORT_PROCESSES=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PORT_PROCESSES" ]; then
    kill -9 $PORT_PROCESSES 2>/dev/null || true
    sleep 2
fi

info "Starting with development configuration..."

# Start PM2 with development keys
sudo -u ec2-user bash << 'PM2_DEV_START'
cd /home/ec2-user/prmanager

# Load the development environment
export $(grep -v '^#' .env | xargs)

# Start PM2
pm2 start server/dist/index.js --name pr-manager --env production

# Save configuration
pm2 save
PM2_DEV_START

log "✅ Services restarted with development configuration"

echo ""
echo "5. TESTING AUTHENTICATION"
echo "========================="

sleep 5

info "Testing server health..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Server responding"
else
    error "❌ Server not responding"
    sudo -u ec2-user pm2 logs $SERVICE_NAME --lines 10
fi

info "Testing admin login with development keys..."
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)
ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d'=' -f2)

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_dev_test.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    echo "Login response code: $LOGIN_RESPONSE"
    
    if [ "$LOGIN_RESPONSE" = "200" ]; then
        log "✅ Admin login successful with development keys!"
        
        # Test admin endpoint with token
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(jq -r '.token' /tmp/login_dev_test.json 2>/dev/null)
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                ADMIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/admin_test.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/admin/users)
                
                echo "Admin endpoint response code: $ADMIN_RESPONSE"
                
                if [ "$ADMIN_RESPONSE" = "200" ]; then
                    log "✅ Admin panel access working!"
                    echo "Admin users response:"
                    cat /tmp/admin_test.json | jq . 2>/dev/null || cat /tmp/admin_test.json
                else
                    error "❌ Admin panel access failed (HTTP $ADMIN_RESPONSE)"
                    cat /tmp/admin_test.json 2>/dev/null || true
                fi
                rm -f /tmp/admin_test.json
            fi
        fi
    else
        error "❌ Admin login failed (HTTP $LOGIN_RESPONSE)"
        cat /tmp/login_dev_test.json 2>/dev/null || true
    fi
    rm -f /tmp/login_dev_test.json
fi

echo ""
echo "6. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 PRODUCTION NOW MATCHES DEVELOPMENT!"
echo ""
echo "🌐 APPLICATION URLs:"
echo "   Main: http://$PUBLIC_IP:8080/"
echo "   Admin: http://$PUBLIC_IP:8080/admin"
echo ""
echo "🔐 USING DEVELOPMENT KEYS:"
echo "   JWT_SECRET: pr_mgr_2024_k9x7m3n8q2w5e1r6t9y4u8i5o0p3a7s2d6f9g1h4j7k0l3z8x5c2v7b4n1m9q6w3e8r5t2y7u"
echo "   ENCRYPTION_KEY: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
echo ""
echo "👤 ADMIN LOGIN:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: [from .env]"
echo ""

sudo -u ec2-user pm2 status

echo ""
log "✅ Production should now work exactly like development!"