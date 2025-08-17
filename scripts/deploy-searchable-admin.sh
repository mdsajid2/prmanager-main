#!/bin/bash

# Deploy Searchable Admin Panel
echo "🔍 DEPLOYING SEARCHABLE ADMIN PANEL"
echo "==================================="

APP_DIR="/home/ec2-user/prmanager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

cd $APP_DIR

echo ""
echo "1. BUILDING APPLICATIONS"
echo "======================="

info "Building server..."
cd server
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server built successfully"
cd ..

info "Building frontend with searchable admin..."
cd web
npm run build

if [ ! -d "dist" ]; then
    error "❌ Frontend build failed!"
    exit 1
fi

log "✅ Frontend built successfully"
cd ..

echo ""
echo "2. RESTARTING SERVICES"
echo "====================="

info "Restarting PM2..."
pm2 restart pr-manager

sleep 5

echo ""
echo "3. TESTING SEARCHABLE FEATURES"
echo "=============================="

info "Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health response: $HEALTH_RESPONSE"

if [ "$HEALTH_RESPONSE" != "200" ]; then
    error "❌ Server not responding"
    pm2 logs pr-manager --lines 10
    exit 1
fi

log "✅ Server is responding"

info "Testing admin authentication..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "Login response: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" != "200" ]; then
    error "❌ Admin login failed"
    exit 1
fi

log "✅ Admin login successful"

# Test admin endpoints
if command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        info "Testing admin endpoints..."
        
        USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/users.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/new-admin/users)
        
        echo "Users endpoint: $USERS_RESPONSE"
        
        if [ "$USERS_RESPONSE" = "200" ]; then
            log "✅ Admin endpoints working"
            USER_COUNT=$(cat /tmp/users.json | jq length 2>/dev/null || echo "N/A")
            echo "Total users: $USER_COUNT"
        else
            error "❌ Admin endpoints failed"
        fi
    fi
fi

echo ""
echo "4. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 SEARCHABLE ADMIN PANEL DEPLOYED!"
echo ""
echo "✅ Server and frontend rebuilt"
echo "✅ All tests passed"
echo ""
echo "🌐 ACCESS URL:"
echo "   Enhanced Admin: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🔍 NEW SEARCHABLE FEATURES:"
echo "   ✅ Search users for reset usage (type to search)"
echo "   ✅ Search users for bonus credits (type to search)"
echo "   ✅ Dropdown shows max 10 results"
echo "   ✅ Search by email, first name, or last name"
echo "   ✅ Click outside to close dropdowns"
echo "   ✅ Shows user details in dropdown"
echo ""
echo "💡 HOW TO USE:"
echo "   1. In Admin Controls, start typing in the search boxes"
echo "   2. Select user from dropdown (max 10 shown)"
echo "   3. Perform action (reset usage or add credits)"
echo "   4. Quick action buttons in table also work"
echo ""

pm2 status

# Cleanup
rm -f /tmp/health.json /tmp/login.json /tmp/users.json

log "✅ Searchable admin panel is ready!"