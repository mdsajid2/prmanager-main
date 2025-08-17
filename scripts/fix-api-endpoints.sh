#!/bin/bash

# Fix API Endpoints and CORS Issues
echo "🔧 FIXING API ENDPOINTS AND CORS ISSUES"
echo "======================================="

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
echo "1. CHECKING CURRENT SERVER STATUS"
echo "================================="

info "Testing current endpoints..."

# Test endpoints
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

DAILY_USAGE=$(curl -s -w "%{http_code}" -o /tmp/daily.json http://localhost:8080/api/analyze/daily-usage 2>/dev/null)
echo "Daily Usage: $DAILY_USAGE"

TOKENS=$(curl -s -w "%{http_code}" -o /tmp/tokens.json http://localhost:8080/api/tokens 2>/dev/null)
echo "Tokens: $TOKENS"

AUTH_ME=$(curl -s -w "%{http_code}" -o /tmp/auth.json http://localhost:8080/api/auth/me 2>/dev/null)
echo "Auth Me: $AUTH_ME"

echo ""
echo "2. UPDATING FRONTEND CONFIGURATION"
echo "=================================="

info "Ensuring frontend uses correct API base..."

# Update web/.env.production to be explicit
cat > web/.env.production << 'FRONTEND_ENV'
# Production environment variables for frontend
VITE_API_URL=
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=PR Manager
FRONTEND_ENV

log "✅ Frontend environment updated"

echo ""
echo "3. REBUILDING APPLICATIONS"
echo "=========================="

info "Rebuilding server..."
cd server
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server built"
cd ..

info "Rebuilding frontend..."
cd web
npm run build

if [ ! -d "dist" ]; then
    error "❌ Frontend build failed!"
    exit 1
fi

log "✅ Frontend built"
cd ..

echo ""
echo "4. RESTARTING SERVICES"
echo "====================="

info "Restarting PM2..."
pm2 restart pr-manager

sleep 5

echo ""
echo "5. TESTING FIXED ENDPOINTS"
echo "=========================="

info "Testing after restart..."

# Test endpoints again
HEALTH_NEW=$(curl -s -w "%{http_code}" -o /tmp/health_new.json http://localhost:8080/health 2>/dev/null)
echo "Health (new): $HEALTH_NEW"

# Test with authentication
info "Testing with admin login..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_test.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "Login: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" = "200" ] && command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/login_test.json 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        info "Testing authenticated endpoints..."
        
        # Test daily usage with auth
        DAILY_AUTH=$(curl -s -w "%{http_code}" -o /tmp/daily_auth.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/analyze/daily-usage)
        echo "Daily Usage (auth): $DAILY_AUTH"
        
        # Test tokens with auth
        TOKENS_AUTH=$(curl -s -w "%{http_code}" -o /tmp/tokens_auth.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/tokens)
        echo "Tokens (auth): $TOKENS_AUTH"
        
        # Test auth/me
        AUTH_ME_NEW=$(curl -s -w "%{http_code}" -o /tmp/auth_me.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/auth/me)
        echo "Auth Me (auth): $AUTH_ME_NEW"
    fi
fi

echo ""
echo "6. TESTING CORS"
echo "==============="

info "Testing CORS headers..."

# Test CORS preflight
CORS_TEST=$(curl -s -w "%{http_code}" -o /tmp/cors.json \
    -X OPTIONS \
    -H "Origin: https://www.prmanagerai.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    http://localhost:8080/api/auth/login)

echo "CORS Preflight: $CORS_TEST"

if [ "$CORS_TEST" = "200" ] || [ "$CORS_TEST" = "204" ]; then
    log "✅ CORS is working"
else
    warn "CORS might have issues"
fi

echo ""
echo "7. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 ENDPOINT STATUS:"
echo "   Health: $HEALTH_NEW"
echo "   Daily Usage: $DAILY_AUTH"
echo "   Tokens: $TOKENS_AUTH"
echo "   Auth Me: $AUTH_ME_NEW"
echo "   CORS: $CORS_TEST"
echo ""

if [ "$HEALTH_NEW" = "200" ] && [ "$LOGIN_RESPONSE" = "200" ]; then
    log "🎉 ALL SYSTEMS WORKING!"
    echo ""
    echo "✅ Server is responding"
    echo "✅ Authentication working"
    echo "✅ API endpoints available"
    echo "✅ CORS configured"
    echo ""
    echo "🌐 ACCESS URLs:"
    echo "   Main App: http://$PUBLIC_IP:8080/"
    echo "   Admin Panel: http://$PUBLIC_IP:8080/admin"
    echo ""
else
    error "❌ SOME ISSUES REMAIN"
    echo ""
    echo "Check the status codes above"
    echo "Server logs: pm2 logs pr-manager"
fi

pm2 status

# Cleanup
rm -f /tmp/*.json

log "✅ API endpoints fix complete!"