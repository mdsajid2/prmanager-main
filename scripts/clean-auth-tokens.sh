#!/bin/bash

# 🧹 Clean Authentication Tokens Script
# This script cleans all existing tokens and forces fresh authentication

set -e

echo "🧹 Cleaning Authentication Tokens"
echo "================================="

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[CLEAN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARNING] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR does not exist"
    exit 1
fi

cd $APP_DIR

log "🗑️ Step 1: Cleaning database sessions..."

# Create database cleanup script
cat > server/clean_sessions.js << 'EOF'
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
});

async function cleanSessions() {
  try {
    console.log('🧹 Cleaning all user sessions from database...');
    
    const client = await pool.connect();
    
    // Delete all existing sessions
    const result = await client.query('DELETE FROM user_sessions');
    console.log(`✅ Deleted ${result.rowCount} existing sessions`);
    
    // Verify cleanup
    const remaining = await client.query('SELECT COUNT(*) as count FROM user_sessions');
    console.log(`📊 Remaining sessions: ${remaining.rows[0].count}`);
    
    client.release();
    console.log('✅ Database session cleanup completed');
    
  } catch (error) {
    console.error('❌ Database cleanup error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanSessions();
EOF

# Run database cleanup
cd server
if node clean_sessions.js; then
    log "✅ Database sessions cleaned"
else
    error "❌ Database cleanup failed"
    exit 1
fi

# Clean up temp file
rm -f clean_sessions.js
cd $APP_DIR

log "🔄 Step 2: Restarting service to clear memory..."

# Restart service to clear any in-memory sessions
systemctl restart $SERVICE_NAME

# Wait for service to start
sleep 5

if systemctl is-active --quiet $SERVICE_NAME; then
    log "✅ Service restarted successfully"
else
    error "❌ Service failed to restart"
    exit 1
fi

log "🧪 Step 3: Testing fresh authentication..."

# Test fresh login
if [ -f "$APP_DIR/.env" ]; then
    ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d'=' -f2)
    ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' "$APP_DIR/.env" | cut -d'=' -f2)
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        log "Testing fresh login for: $ADMIN_EMAIL"
        
        # Test login
        LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST http://localhost:8080/api/auth/login \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
        
        HTTP_CODE=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        RESPONSE_BODY=$(echo $LOGIN_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
        
        if [ "$HTTP_CODE" = "200" ]; then
            log "✅ Fresh login successful"
            
            # Extract and test token
            if command -v jq >/dev/null 2>&1; then
                TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token' 2>/dev/null)
                if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                    log "✅ New token generated: ${TOKEN:0:20}..."
                    
                    # Test admin endpoint with new token
                    ADMIN_TEST=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                        -H "Authorization: Bearer $TOKEN" \
                        http://localhost:8080/api/admin/users)
                    
                    ADMIN_HTTP_CODE=$(echo $ADMIN_TEST | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
                    
                    if [ "$ADMIN_HTTP_CODE" = "200" ]; then
                        log "✅ Admin endpoint working with new token"
                    else
                        error "❌ Admin endpoint still failing (HTTP $ADMIN_HTTP_CODE)"
                    fi
                else
                    error "❌ Could not extract token from response"
                fi
            else
                log "✅ Login successful (jq not available for token testing)"
            fi
        else
            error "❌ Fresh login failed (HTTP $HTTP_CODE)"
            error "Response: $RESPONSE_BODY"
        fi
    else
        error "❌ Admin credentials not found in .env"
    fi
fi

echo ""
log "🎉 Token cleanup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Clear browser storage: localStorage.clear() in browser console"
echo "2. Refresh the page"
echo "3. Login again with fresh credentials"
echo "4. All tokens should now work properly"
echo ""
echo "🔧 If issues persist:"
echo "1. Check JWT_SECRET is different between development and production"
echo "2. Verify database connection is working"
echo "3. Check service logs: journalctl -u $SERVICE_NAME -f"