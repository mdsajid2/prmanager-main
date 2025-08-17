#!/bin/bash

# 🔐 Authentication Debug Script for Production
# This script specifically debugs authentication issues

echo "🔐 Authentication Debug for Production"
echo "====================================="

APP_DIR="/home/ec2-user/prmanager"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[AUTH-DEBUG] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARNING] $1${NC}"; }

# Test authentication flow step by step
test_auth_flow() {
    log "Testing complete authentication flow..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        error ".env file not found"
        return 1
    fi
    
    ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d'=' -f2)
    ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' "$APP_DIR/.env" | cut -d'=' -f2)
    
    if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
        error "Admin credentials not found in .env"
        return 1
    fi
    
    log "Testing with admin email: $ADMIN_EMAIL"
    
    # Step 1: Test login endpoint
    log "Step 1: Testing login endpoint..."
    
    LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    HTTP_CODE=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    RESPONSE_BODY=$(echo $LOGIN_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "✅ Login successful (HTTP 200)"
        
        # Extract token
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token' 2>/dev/null)
            USER_DATA=$(echo "$RESPONSE_BODY" | jq -r '.user' 2>/dev/null)
            
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                log "✅ Token extracted: ${TOKEN:0:20}..."
                log "✅ User data: $USER_DATA"
                
                # Step 2: Test /me endpoint
                log "Step 2: Testing /me endpoint with token..."
                
                ME_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/auth/me)
                
                ME_HTTP_CODE=$(echo $ME_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
                ME_BODY=$(echo $ME_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
                
                if [ "$ME_HTTP_CODE" = "200" ]; then
                    log "✅ /me endpoint successful"
                    log "User info: $ME_BODY"
                    
                    # Step 3: Test admin endpoint
                    log "Step 3: Testing admin endpoint..."
                    
                    ADMIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                        -H "Authorization: Bearer $TOKEN" \
                        http://localhost:8080/api/admin/users)
                    
                    ADMIN_HTTP_CODE=$(echo $ADMIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
                    ADMIN_BODY=$(echo $ADMIN_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
                    
                    if [ "$ADMIN_HTTP_CODE" = "200" ]; then
                        log "✅ Admin endpoint successful"
                        log "Admin data preview: $(echo "$ADMIN_BODY" | head -c 100)..."
                    else
                        error "❌ Admin endpoint failed (HTTP $ADMIN_HTTP_CODE)"
                        error "Response: $ADMIN_BODY"
                    fi
                    
                else
                    error "❌ /me endpoint failed (HTTP $ME_HTTP_CODE)"
                    error "Response: $ME_BODY"
                fi
                
            else
                error "❌ Could not extract token from response"
                error "Response: $RESPONSE_BODY"
            fi
        else
            warn "jq not available - cannot parse JSON response"
            log "Raw response: $RESPONSE_BODY"
        fi
        
    else
        error "❌ Login failed (HTTP $HTTP_CODE)"
        error "Response: $RESPONSE_BODY"
    fi
}

# Check JWT configuration
check_jwt_config() {
    log "Checking JWT configuration..."
    
    if grep -q "^JWT_SECRET=" "$APP_DIR/.env"; then
        JWT_SECRET=$(grep '^JWT_SECRET=' "$APP_DIR/.env" | cut -d'=' -f2)
        if [ ${#JWT_SECRET} -lt 32 ]; then
            warn "JWT_SECRET might be too short (${#JWT_SECRET} characters)"
        else
            log "✅ JWT_SECRET length looks good (${#JWT_SECRET} characters)"
        fi
    else
        error "❌ JWT_SECRET not found in .env"
    fi
}

# Check database user
check_db_user() {
    log "Checking database user..."
    
    cd $APP_DIR/server
    
    cat > check_user.js << 'EOF'
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

async function checkUser() {
  try {
    const client = await pool.connect();
    
    if (process.env.ADMIN_EMAIL) {
      const result = await client.query(`
        SELECT id, email, first_name, last_name, subscription_plan, is_verified, created_at
        FROM users WHERE email = $1
      `, [process.env.ADMIN_EMAIL]);
      
      if (result.rows.length > 0) {
        console.log('✅ Admin user found in database:');
        console.log(JSON.stringify(result.rows[0], null, 2));
      } else {
        console.log('❌ Admin user not found in database');
      }
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser();
EOF
    
    node check_user.js
    rm -f check_user.js
    cd $APP_DIR
}

# Check session table
check_sessions() {
    log "Checking user sessions..."
    
    cd $APP_DIR/server
    
    cat > check_sessions.js << 'EOF'
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

async function checkSessions() {
  try {
    const client = await pool.connect();
    
    // Check if user_sessions table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_sessions'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ user_sessions table exists');
      
      // Check recent sessions
      const sessions = await client.query(`
        SELECT user_id, created_at, expires_at, 
               CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 'active' ELSE 'expired' END as status
        FROM user_sessions 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('Recent sessions:');
      sessions.rows.forEach(session => {
        console.log(`- User: ${session.user_id}, Status: ${session.status}, Expires: ${session.expires_at}`);
      });
      
    } else {
      console.log('❌ user_sessions table does not exist');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Session check error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessions();
EOF
    
    node check_sessions.js
    rm -f check_sessions.js
    cd $APP_DIR
}

# Main function
main() {
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory not found: $APP_DIR"
        exit 1
    fi
    
    check_jwt_config
    check_db_user
    check_sessions
    test_auth_flow
    
    echo ""
    log "Authentication debug completed!"
    echo ""
    echo "Common issues and solutions:"
    echo "1. Token expired: Clear browser localStorage and login again"
    echo "2. Wrong JWT_SECRET: Make sure production uses different secret than development"
    echo "3. Database connection: Verify DATABASE_URL is correct for production"
    echo "4. CORS issues: Check if frontend and backend are on same domain"
    echo "5. Session cleanup: Old sessions might be interfering"
}

main "$@"