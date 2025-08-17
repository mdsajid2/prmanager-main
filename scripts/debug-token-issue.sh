#!/bin/bash

# Debug Token Issue Script
echo "🔍 DEBUGGING TOKEN ISSUE"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEBUG] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. TESTING EXACT SAME REQUEST AS FRONTEND"
echo "=========================================="

info "Getting fresh token from login..."

# Get admin credentials
ADMIN_EMAIL="mdsajid8636@gmail.com"
ADMIN_PASSWORD="SahYan@2020"

# Login to get token
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/debug_login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" != "200" ]; then
    error "❌ Login failed"
    cat /tmp/debug_login.json 2>/dev/null
    exit 1
fi

# Extract token
if command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/debug_login.json 2>/dev/null)
else
    # Fallback without jq
    TOKEN=$(grep -o '"token":"[^"]*' /tmp/debug_login.json | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    error "❌ Could not extract token"
    cat /tmp/debug_login.json
    exit 1
fi

log "✅ Token extracted successfully"
echo "Token length: ${#TOKEN}"
echo "Token preview: ${TOKEN:0:50}..."

echo ""
echo "2. TESTING NEW ADMIN ENDPOINTS WITH VERBOSE OUTPUT"
echo "=================================================="

info "Testing new admin health endpoint..."
curl -v http://localhost:8080/api/new-admin/health 2>&1 | head -20

echo ""
info "Testing new admin users endpoint with token..."
echo "Authorization header: Bearer ${TOKEN:0:20}..."

# Test with verbose output
USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/debug_users.json \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    http://localhost:8080/api/new-admin/users)

echo "Users endpoint response: $USERS_RESPONSE"

if [ "$USERS_RESPONSE" = "200" ]; then
    log "✅ NEW ADMIN API WORKING!"
    echo "Response:"
    cat /tmp/debug_users.json | head -10
else
    error "❌ NEW ADMIN API FAILED"
    echo "Response body:"
    cat /tmp/debug_users.json 2>/dev/null || echo "No response body"
fi

echo ""
echo "3. CHECKING PM2 LOGS FOR BACKEND ERRORS"
echo "========================================"

info "Recent PM2 logs (last 20 lines)..."
pm2 logs pr-manager --lines 20 || echo "No PM2 logs available"

echo ""
echo "4. TESTING WITH CURL VERBOSE MODE"
echo "================================="

info "Making the exact same request with verbose curl..."
curl -v \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    http://localhost:8080/api/new-admin/users

echo ""
echo "5. CHECKING SERVER PROCESS"
echo "=========================="

info "Checking what's running on port 8080..."
lsof -i:8080 || echo "Nothing on port 8080"

info "PM2 status..."
pm2 status

echo ""
echo "6. MANUAL TOKEN VERIFICATION TEST"
echo "================================="

info "Creating manual token verification test..."

cd /home/ec2-user/prmanager/server

cat > manual_token_test.js << 'TOKEN_TEST'
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const token = process.argv[2];

if (!token) {
    console.error('Usage: node manual_token_test.js <token>');
    process.exit(1);
}

console.log('🔍 MANUAL TOKEN VERIFICATION');
console.log('============================');
console.log('Token length:', token.length);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('Environment:', process.env.NODE_ENV);

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verification successful');
    console.log('Decoded payload:', decoded);
} catch (error) {
    console.error('❌ Token verification failed:', error.message);
    console.error('Error type:', error.constructor.name);
    
    // Try to decode without verification to see the payload
    try {
        const decoded = jwt.decode(token);
        console.log('Token payload (unverified):', decoded);
    } catch (e) {
        console.error('Could not even decode token:', e.message);
    }
}
TOKEN_TEST

echo "Running manual token verification..."
node manual_token_test.js "$TOKEN"

rm -f manual_token_test.js
cd /home/ec2-user/prmanager

echo ""
echo "7. SUMMARY"
echo "=========="

if [ "$USERS_RESPONSE" = "200" ]; then
    log "🎉 TOKEN IS WORKING!"
    echo "The issue might be intermittent or browser-related."
    echo "Try clearing browser cache and cookies completely."
else
    error "❌ TOKEN VERIFICATION IS FAILING"
    echo ""
    echo "🔧 POSSIBLE ISSUES:"
    echo "1. JWT_SECRET mismatch between login and verification"
    echo "2. Token format issue"
    echo "3. Middleware not receiving the Authorization header"
    echo "4. PM2 process not restarted after code changes"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Check PM2 logs above for specific errors"
    echo "2. Restart PM2: pm2 restart pr-manager"
    echo "3. Check if server code was properly deployed"
fi

# Cleanup
rm -f /tmp/debug_login.json /tmp/debug_users.json

echo ""
log "Debug complete. Check the output above for clues."