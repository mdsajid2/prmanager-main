#!/bin/bash

# Comprehensive Production Diagnosis Script
echo "🔍 COMPREHENSIVE PRODUCTION DIAGNOSIS"
echo "====================================="

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
info() { echo -e "${BLUE}[CHECK] $1${NC}"; }

echo ""
echo "1. ENVIRONMENT VERIFICATION"
echo "=========================="

info "Checking .env file..."
if [ -f "$APP_DIR/.env" ]; then
    log "✅ .env file exists"
    echo "Environment variables (masked):"
    grep -E "^(NODE_ENV|PORT|JWT_SECRET|ENCRYPTION_KEY|DATABASE_URL|ADMIN_EMAIL)" $APP_DIR/.env | sed 's/=.*/=***MASKED***/'
    
    # Check if keys are different from development defaults
    JWT_SECRET=$(grep "^JWT_SECRET=" $APP_DIR/.env | cut -d'=' -f2)
    if [ "$JWT_SECRET" = "pr_mgr_2024_k9x7m3n8q2w5e1r6t9y4u8i5o0p3a7s2d6f9g1h4j7k0l3z8x5c2v7b4n1m9q6w3e8r5t2y7u" ]; then
        error "❌ Using development JWT_SECRET in production!"
    else
        log "✅ Production JWT_SECRET is different from development"
    fi
    
    ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" $APP_DIR/.env | cut -d'=' -f2)
    if [ "$ENCRYPTION_KEY" = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" ]; then
        error "❌ Using development ENCRYPTION_KEY in production!"
    else
        log "✅ Production ENCRYPTION_KEY is different from development"
    fi
else
    error "❌ .env file not found!"
fi

echo ""
echo "2. SERVER STATUS CHECK"
echo "====================="

info "Checking PM2 status..."
pm2 status

info "Checking if server is responding..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Server health endpoint responding"
    curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
else
    error "❌ Server health endpoint not responding"
fi

info "Checking port 8080..."
if lsof -i:8080 >/dev/null 2>&1; then
    log "✅ Port 8080 is in use"
    lsof -i:8080
else
    error "❌ Nothing listening on port 8080"
fi

echo ""
echo "3. FRONTEND BUILD ANALYSIS"
echo "========================="

info "Checking web build..."
if [ -d "$APP_DIR/web/dist" ]; then
    log "✅ Web build directory exists"
    
    # Check for API URL configuration in built files
    info "Checking for localhost references in built frontend..."
    LOCALHOST_REFS=$(grep -r "localhost:3001" $APP_DIR/web/dist/ 2>/dev/null || true)
    if [ -n "$LOCALHOST_REFS" ]; then
        error "❌ Found localhost:3001 references in production build!"
        echo "$LOCALHOST_REFS" | head -5
    else
        log "✅ No localhost references found in build"
    fi
    
    # Check .env.production
    if [ -f "$APP_DIR/web/.env.production" ]; then
        log "✅ web/.env.production exists:"
        cat $APP_DIR/web/.env.production
    else
        warn "⚠️ web/.env.production not found"
    fi
else
    error "❌ Web build directory not found"
fi

echo ""
echo "4. API ENDPOINTS TEST"
echo "===================="

info "Testing authentication endpoints..."

# Test login endpoint
LOGIN_TEST=$(curl -s -w "%{http_code}" -o /tmp/login_test.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' 2>/dev/null)

echo "Login endpoint response code: $LOGIN_TEST"

# Test admin endpoints
info "Testing admin endpoints..."
ADMIN_TEST=$(curl -s -w "%{http_code}" -o /dev/null \
    http://localhost:8080/api/admin/users 2>/dev/null)
echo "Admin users endpoint (no auth): $ADMIN_TEST"

# Test tokens endpoint
info "Testing tokens endpoint..."
TOKENS_TEST=$(curl -s -w "%{http_code}" -o /dev/null \
    http://localhost:8080/api/tokens 2>/dev/null)
echo "Tokens endpoint: $TOKENS_TEST"

# Test daily usage endpoint
info "Testing daily usage endpoint..."
USAGE_TEST=$(curl -s -w "%{http_code}" -o /dev/null \
    http://localhost:8080/api/analyze/daily-usage 2>/dev/null)
echo "Daily usage endpoint: $USAGE_TEST"

echo ""
echo "5. DATABASE CONNECTION TEST"
echo "=========================="

info "Testing database connection..."
cd $APP_DIR/server

# Create a quick DB test script
cat > test_db.js << 'DB_TEST'
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function testDB() {
  try {
    console.log('🔍 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Database connected successfully');
    console.log('Current time:', result.rows[0].current_time);
    
    // Test users table
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table accessible (${userCount.rows[0].count} users)`);
    
    // Test admin user
    if (process.env.ADMIN_EMAIL) {
      const adminUser = await pool.query('SELECT email, subscription_plan FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
      if (adminUser.rows.length > 0) {
        console.log('✅ Admin user found:', adminUser.rows[0]);
      } else {
        console.log('❌ Admin user not found in database');
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDB();
DB_TEST

if node test_db.js; then
    log "✅ Database test completed"
else
    error "❌ Database test failed"
fi

rm -f test_db.js
cd $APP_DIR

echo ""
echo "6. JWT TOKEN TEST"
echo "================"

info "Testing JWT token generation..."
cd $APP_DIR/server

cat > test_jwt.js << 'JWT_TEST'
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

try {
  console.log('🔍 Testing JWT functionality...');
  
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in environment');
    process.exit(1);
  }
  
  console.log('✅ JWT_SECRET is set (length:', process.env.JWT_SECRET.length, ')');
  
  // Test token generation
  const testPayload = { userId: 'test-123', email: 'test@example.com' };
  const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ JWT token generated successfully');
  
  // Test token verification
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ JWT token verified successfully');
  console.log('Decoded payload:', decoded);
  
} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}
JWT_TEST

if node test_jwt.js; then
    log "✅ JWT test completed"
else
    error "❌ JWT test failed"
fi

rm -f test_jwt.js
cd $APP_DIR

echo ""
echo "7. SERVER LOGS ANALYSIS"
echo "======================"

info "Recent PM2 logs..."
pm2 logs $SERVICE_NAME --lines 20 || echo "No PM2 logs available"

echo ""
echo "8. NETWORK CONFIGURATION"
echo "======================="

info "Checking server binding..."
netstat -tlnp | grep :8080 || echo "No process bound to port 8080"

info "Checking firewall/security groups..."
if command -v ufw >/dev/null 2>&1; then
    ufw status
else
    echo "UFW not installed"
fi

echo ""
echo "9. SUMMARY & RECOMMENDATIONS"
echo "============================"

echo ""
echo "🔧 IMMEDIATE ACTIONS NEEDED:"
echo ""

# Check for localhost references
if grep -r "localhost:3001" $APP_DIR/web/dist/ >/dev/null 2>&1; then
    error "1. CRITICAL: Frontend is hardcoded to localhost:3001"
    echo "   Solution: Rebuild frontend with correct API URL"
fi

# Check for development keys
JWT_SECRET=$(grep "^JWT_SECRET=" $APP_DIR/.env | cut -d'=' -f2)
if [ "$JWT_SECRET" = "pr_mgr_2024_k9x7m3n8q2w5e1r6t9y4u8i5o0p3a7s2d6f9g1h4j7k0l3z8x5c2v7b4n1m9q6w3e8r5t2y7u" ]; then
    error "2. CRITICAL: Using development JWT_SECRET"
    echo "   Solution: Generate new production keys"
fi

if ! curl -s http://localhost:8080/health >/dev/null 2>&1; then
    error "3. CRITICAL: Server not responding"
    echo "   Solution: Check PM2 status and restart if needed"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Fix frontend API URL configuration"
echo "2. Generate and update production keys"
echo "3. Restart services with new configuration"
echo "4. Test authentication flow end-to-end"

# Cleanup
rm -f /tmp/login_test.json