#!/bin/bash

# 🔍 PR Manager Production Debug Script
# This script helps diagnose production issues

set -e

echo "🔍 PR Manager Production Debug"
echo "=============================="

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEBUG] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check service status
check_service() {
    log "Checking service status..."
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        log "✅ Service is running"
        systemctl status $SERVICE_NAME --no-pager -l
    else
        error "❌ Service is not running"
        systemctl status $SERVICE_NAME --no-pager -l || true
    fi
    
    echo ""
}

# Check environment variables
check_environment() {
    log "Checking environment variables..."
    
    if [ -f "$APP_DIR/.env" ]; then
        log "✅ .env file exists"
        
        # Check critical variables (without showing values)
        if grep -q "^DATABASE_URL=" "$APP_DIR/.env"; then
            log "✅ DATABASE_URL is set"
        else
            error "❌ DATABASE_URL is missing"
        fi
        
        if grep -q "^JWT_SECRET=" "$APP_DIR/.env"; then
            log "✅ JWT_SECRET is set"
        else
            error "❌ JWT_SECRET is missing"
        fi
        
        if grep -q "^ADMIN_EMAIL=" "$APP_DIR/.env"; then
            ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d'=' -f2)
            log "✅ ADMIN_EMAIL is set: $ADMIN_EMAIL"
        else
            error "❌ ADMIN_EMAIL is missing"
        fi
        
        if grep -q "^ADMIN_PASSWORD=" "$APP_DIR/.env"; then
            log "✅ ADMIN_PASSWORD is set"
        else
            error "❌ ADMIN_PASSWORD is missing"
        fi
        
        # Check PORT and NODE_ENV
        PORT=$(grep '^PORT=' "$APP_DIR/.env" | cut -d'=' -f2 || echo "not set")
        NODE_ENV=$(grep '^NODE_ENV=' "$APP_DIR/.env" | cut -d'=' -f2 || echo "not set")
        
        log "PORT: $PORT"
        log "NODE_ENV: $NODE_ENV"
        
    else
        error "❌ .env file not found at $APP_DIR/.env"
    fi
    
    echo ""
}

# Check database connection
check_database() {
    log "Checking database connection..."
    
    cd $APP_DIR/server
    
    # Create a simple database test script
    cat > test_db.js << 'EOF'
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

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

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0].current_time);
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Users table exists');
      
      // Check admin user
      if (process.env.ADMIN_EMAIL) {
        const adminCheck = await client.query('SELECT email, subscription_plan FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]);
        if (adminCheck.rows.length > 0) {
          console.log('✅ Admin user found:', adminCheck.rows[0]);
        } else {
          console.log('❌ Admin user not found in database');
        }
      }
    } else {
      console.log('❌ Users table does not exist');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
EOF
    
    if node test_db.js; then
        log "Database test completed"
    else
        error "Database test failed"
    fi
    
    rm -f test_db.js
    cd $APP_DIR
    
    echo ""
}

# Check API endpoints
check_api() {
    log "Checking API endpoints..."
    
    # Test health endpoint
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        log "✅ Health endpoint responding"
        curl -s http://localhost:8080/health | head -5
    else
        error "❌ Health endpoint not responding"
    fi
    
    # Test auth endpoint
    if curl -s http://localhost:8080/api/auth/me >/dev/null 2>&1; then
        log "✅ Auth endpoint accessible (returns 401 as expected)"
    else
        error "❌ Auth endpoint not accessible"
    fi
    
    echo ""
}

# Check logs
check_logs() {
    log "Recent service logs (last 50 lines)..."
    journalctl -u $SERVICE_NAME -n 50 --no-pager || true
    echo ""
}

# Test admin login
test_admin_login() {
    log "Testing admin login..."
    
    if [ -f "$APP_DIR/.env" ]; then
        ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d'=' -f2)
        ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' "$APP_DIR/.env" | cut -d'=' -f2)
        
        if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
            log "Testing login for: $ADMIN_EMAIL"
            
            LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_test.json \
                -X POST http://localhost:8080/api/auth/login \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
            
            if [ "$LOGIN_RESPONSE" = "200" ]; then
                log "✅ Admin login successful"
                
                # Test token extraction
                if command -v jq >/dev/null 2>&1; then
                    TOKEN=$(jq -r '.token' /tmp/login_test.json 2>/dev/null)
                    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                        log "✅ Token extracted successfully"
                        
                        # Test admin endpoint
                        ADMIN_TEST=$(curl -s -w "%{http_code}" -o /tmp/admin_test.json \
                            -H "Authorization: Bearer $TOKEN" \
                            http://localhost:8080/api/admin/users)
                        
                        if [ "$ADMIN_TEST" = "200" ]; then
                            log "✅ Admin endpoint accessible"
                        else
                            error "❌ Admin endpoint failed (HTTP $ADMIN_TEST)"
                            cat /tmp/admin_test.json 2>/dev/null || true
                        fi
                    else
                        error "❌ Could not extract token"
                        cat /tmp/login_test.json
                    fi
                else
                    log "⚠️ jq not available for token testing"
                fi
            else
                error "❌ Admin login failed (HTTP $LOGIN_RESPONSE)"
                cat /tmp/login_test.json 2>/dev/null || true
            fi
            
            rm -f /tmp/login_test.json /tmp/admin_test.json
        else
            error "❌ Admin credentials not found in .env"
        fi
    fi
    
    echo ""
}

# Check file permissions
check_permissions() {
    log "Checking file permissions..."
    
    ls -la $APP_DIR/.env 2>/dev/null || error ".env file not found"
    ls -la $APP_DIR/server/dist/index.js 2>/dev/null || error "Server build not found"
    ls -la $APP_DIR/web/dist/index.html 2>/dev/null || error "Web build not found"
    
    echo ""
}

# Main debug function
main() {
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist"
        exit 1
    fi
    
    check_service
    check_environment
    check_permissions
    check_database
    check_api
    test_admin_login
    check_logs
    
    echo "🎉 Debug check completed!"
    echo ""
    echo "If you're still having issues:"
    echo "1. Check the logs: journalctl -u $SERVICE_NAME -f"
    echo "2. Restart the service: sudo systemctl restart $SERVICE_NAME"
    echo "3. Check if port 8080 is accessible from outside"
    echo "4. Verify your EC2 security group allows port 8080"
}

main "$@"