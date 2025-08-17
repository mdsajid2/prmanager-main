#!/bin/bash

# Fix Daily Usage Route
echo "🔧 FIXING DAILY USAGE ROUTE"
echo "==========================="

cd /home/ec2-user/prmanager

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[FIX] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. CHECKING ROUTE REGISTRATION"
echo "=============================="

info "Checking if daily-usage route exists in analyze.ts..."
if grep -n "daily-usage" server/src/routes/analyze.ts; then
    log "✅ Route exists in source code"
else
    error "❌ Route missing in source code"
fi

info "Checking if route is in built version..."
if [ -f "server/dist/routes/analyze.js" ]; then
    if grep -n "daily-usage" server/dist/routes/analyze.js; then
        log "✅ Route exists in built code"
    else
        error "❌ Route missing in built code - need to rebuild"
    fi
else
    error "❌ Built analyze.js not found"
fi

echo ""
echo "2. REBUILD SERVER"
echo "================="

info "Rebuilding server to ensure routes are included..."
cd server
npm run build

if [ -f "dist/index.js" ]; then
    log "✅ Server rebuilt successfully"
else
    error "❌ Server build failed"
    exit 1
fi

cd ..

echo ""
echo "3. RESTART WITH PM2"
echo "==================="

info "Using PM2 to restart (since PM2 is managing the process)..."

# Use PM2 to restart
pm2 restart all

sleep 5

info "PM2 status after restart..."
pm2 status

echo ""
echo "4. TEST DAILY USAGE ENDPOINT"
echo "============================"

info "Testing health first..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "✅ Server is running"
    
    info "Testing authentication..."
    LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    echo "Login: $LOGIN"
    
    if [ "$LOGIN" = "200" ] && command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            info "Testing daily usage endpoint..."
            
            # Test the endpoint
            DAILY=$(curl -s -w "%{http_code}" -o /tmp/daily.json \
                -H "Authorization: Bearer $TOKEN" \
                http://localhost:8080/api/analyze/daily-usage)
            
            echo "Daily usage: $DAILY"
            
            if [ "$DAILY" = "200" ]; then
                log "🎉 DAILY USAGE ENDPOINT IS WORKING!"
                echo "Response:"
                cat /tmp/daily.json | jq . 2>/dev/null || cat /tmp/daily.json
            else
                error "❌ Daily usage endpoint still failing"
                echo "Response:"
                cat /tmp/daily.json 2>/dev/null
                
                info "Checking PM2 logs for errors..."
                pm2 logs --lines 10
            fi
        fi
    fi
else
    error "❌ Server not responding"
    pm2 logs --lines 20
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 FINAL RESULT:"
echo "   Health: $HEALTH"
echo "   Login: $LOGIN"
echo "   Daily Usage: $DAILY"
echo ""

if [ "$HEALTH" = "200" ] && [ "$DAILY" = "200" ]; then
    log "🎉 ALL ENDPOINTS WORKING!"
    echo ""
    echo "✅ Server rebuilt and restarted"
    echo "✅ Daily usage endpoint working"
    echo "✅ Production should work now"
    echo ""
    echo "🌐 Test your app at:"
    echo "   https://www.prmanagerai.com/"
else
    error "❌ STILL HAVING ISSUES"
    echo ""
    echo "🔧 Debug commands:"
    echo "   pm2 logs --lines 50"
    echo "   pm2 restart all"
    echo "   curl -H 'Authorization: Bearer TOKEN' http://localhost:8080/api/analyze/daily-usage"
fi

pm2 status

# Cleanup
rm -f /tmp/*.json

log "✅ Daily usage route fix complete!"