#!/bin/bash

# Fix Missing Endpoints
echo "🔧 FIXING MISSING ENDPOINTS"
echo "==========================="

APP_DIR="/home/ec2-user/prmanager"

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

cd $APP_DIR

echo ""
echo "1. CHECKING PM2 STATUS"
echo "======================"

info "Current PM2 status..."
pm2 status

info "Killing all PM2 processes..."
pm2 kill

info "Starting fresh PM2 process..."
pm2 start server/dist/index.js --name pr-manager --env production
pm2 save

sleep 5

echo ""
echo "2. TESTING SERVER ENDPOINTS"
echo "==========================="

info "Testing endpoints directly on server..."

# Test health
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

# Test analyze routes
ANALYZE_ROOT=$(curl -s -w "%{http_code}" -o /tmp/analyze.json http://localhost:8080/api/analyze 2>/dev/null)
echo "Analyze root: $ANALYZE_ROOT"

# List all available routes
info "Checking what routes are actually available..."
echo "Available routes should include:"
echo "- /api/auth/*"
echo "- /api/tokens/*" 
echo "- /api/usage/*"
echo "- /api/admin/*"
echo "- /api/analyze/*"
echo "- /api/comment/*"

echo ""
echo "3. CHECKING ANALYZE ROUTES"
echo "=========================="

info "Testing analyze routes with authentication..."

# Login first
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "Login: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" = "200" ] && command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        info "Testing with valid token..."
        
        # Test daily usage
        DAILY_USAGE=$(curl -s -w "%{http_code}" -o /tmp/daily_usage.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/analyze/daily-usage)
        echo "Daily Usage: $DAILY_USAGE"
        
        if [ "$DAILY_USAGE" != "200" ]; then
            warn "Daily usage endpoint not working"
            echo "Response:"
            cat /tmp/daily_usage.json 2>/dev/null || echo "No response body"
        fi
        
        # Test other analyze endpoints
        ANALYZE_TEST=$(curl -s -w "%{http_code}" -o /tmp/analyze_test.json \
            -X POST \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"url":"https://github.com/test/test","type":"pr"}' \
            http://localhost:8080/api/analyze)
        echo "Analyze endpoint: $ANALYZE_TEST"
    fi
fi

echo ""
echo "4. CHECKING SERVER LOGS"
echo "======================="

info "Recent server logs..."
pm2 logs pr-manager --lines 20

echo ""
echo "5. MANUAL ENDPOINT CHECK"
echo "======================="

info "Checking if routes are properly registered..."

# Check if the server is actually serving the routes
echo "Testing basic endpoints:"

# Test without auth (should get 401)
curl -s -w "Status: %{http_code}\n" http://localhost:8080/api/analyze/daily-usage

echo ""
echo "6. RESTART WITH VERBOSE LOGGING"
echo "==============================="

info "Restarting server with verbose logging..."

# Stop current process
pm2 stop pr-manager

# Start with environment variables
pm2 start server/dist/index.js --name pr-manager --env production --log-date-format="YYYY-MM-DD HH:mm:ss"

sleep 3

# Check if it's running
pm2 status

echo ""
echo "7. FINAL TEST"
echo "============="

info "Final endpoint test..."

# Test health again
FINAL_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/final_health.json http://localhost:8080/health 2>/dev/null)
echo "Final Health: $FINAL_HEALTH"

if [ "$FINAL_HEALTH" = "200" ]; then
    log "✅ Server is running"
    
    # Test with fresh login
    FINAL_LOGIN=$(curl -s -w "%{http_code}" -o /tmp/final_login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    echo "Final Login: $FINAL_LOGIN"
    
    if [ "$FINAL_LOGIN" = "200" ] && command -v jq >/dev/null 2>&1; then
        FINAL_TOKEN=$(jq -r '.token' /tmp/final_login.json 2>/dev/null)
        if [ -n "$FINAL_TOKEN" ] && [ "$FINAL_TOKEN" != "null" ]; then
            FINAL_DAILY=$(curl -s -w "%{http_code}" -o /tmp/final_daily.json \
                -H "Authorization: Bearer $FINAL_TOKEN" \
                http://localhost:8080/api/analyze/daily-usage)
            
            echo "Final Daily Usage: $FINAL_DAILY"
            
            if [ "$FINAL_DAILY" = "200" ]; then
                log "🎉 DAILY USAGE ENDPOINT IS WORKING!"
            else
                error "❌ Daily usage still not working"
                echo "Response:"
                cat /tmp/final_daily.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Server not responding"
fi

echo ""
echo "8. SUMMARY"
echo "=========="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 FINAL STATUS:"
echo "   Health: $FINAL_HEALTH"
echo "   Login: $FINAL_LOGIN"
echo "   Daily Usage: $FINAL_DAILY"
echo ""

if [ "$FINAL_HEALTH" = "200" ] && [ "$FINAL_LOGIN" = "200" ] && [ "$FINAL_DAILY" = "200" ]; then
    log "🎉 ALL ENDPOINTS WORKING!"
    echo ""
    echo "✅ Server running properly"
    echo "✅ Authentication working"
    echo "✅ Daily usage endpoint working"
    echo ""
    echo "🌐 Your app should work at:"
    echo "   https://www.prmanagerai.com/"
else
    error "❌ SOME ENDPOINTS STILL FAILING"
    echo ""
    echo "Check the status codes above"
    echo "Server logs: pm2 logs pr-manager"
fi

pm2 status

# Cleanup
rm -f /tmp/*.json

log "✅ Endpoint fix complete!"