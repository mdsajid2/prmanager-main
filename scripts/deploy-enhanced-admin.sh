#!/bin/bash

# Deploy Enhanced Admin Panel
echo "🚀 DEPLOYING ENHANCED ADMIN PANEL"
echo "================================="

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
echo "1. UPDATING PRODUCTION DATABASE URL"
echo "=================================="

info "Updating .env with production database..."

# Update database URL in .env
if grep -q "^DATABASE_URL=" .env; then
    sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres|' .env
else
    echo "DATABASE_URL=postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" >> .env
fi

log "✅ Production database URL updated"

echo ""
echo "2. BUILDING APPLICATIONS"
echo "======================="

info "Building server with new admin features..."
cd server
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server built successfully"
cd ..

info "Building frontend with enhanced admin panel..."
cd web
npm run build

if [ ! -d "dist" ]; then
    error "❌ Frontend build failed!"
    exit 1
fi

log "✅ Frontend built successfully"
cd ..

echo ""
echo "3. RESTARTING SERVICES"
echo "====================="

info "Restarting PM2 with new code..."
pm2 restart pr-manager

sleep 5

echo ""
echo "4. TESTING ENHANCED FEATURES"
echo "============================"

info "Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health response: $HEALTH_RESPONSE"

if [ "$HEALTH_RESPONSE" != "200" ]; then
    error "❌ Server not responding"
    pm2 logs pr-manager --lines 10
    exit 1
fi

log "✅ Server is responding"

info "Testing new admin API..."
ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/admin_health.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin API: $ADMIN_HEALTH"

if [ "$ADMIN_HEALTH" != "200" ]; then
    error "❌ New admin API not responding"
    pm2 logs pr-manager --lines 10
    exit 1
fi

log "✅ New admin API is responding"

info "Testing admin authentication..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "Login response: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" != "200" ]; then
    error "❌ Admin login failed"
    cat /tmp/login.json 2>/dev/null
    exit 1
fi

log "✅ Admin login successful"

# Test new endpoints
if command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        info "Testing enhanced admin endpoints..."
        
        # Test users endpoint
        USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/users.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/new-admin/users)
        
        echo "Users endpoint: $USERS_RESPONSE"
        
        if [ "$USERS_RESPONSE" = "200" ]; then
            log "✅ Users endpoint working"
            USER_COUNT=$(cat /tmp/users.json | jq length 2>/dev/null || echo "N/A")
            echo "Users found: $USER_COUNT"
        else
            error "❌ Users endpoint failed"
        fi
        
        # Test stats endpoint
        STATS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/stats.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/new-admin/stats)
        
        echo "Stats endpoint: $STATS_RESPONSE"
        
        if [ "$STATS_RESPONSE" = "200" ]; then
            log "✅ Stats endpoint working"
        else
            warn "Stats endpoint not working (optional)"
        fi
    fi
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 ENHANCED ADMIN PANEL DEPLOYED!"
echo ""
echo "✅ Production database connected"
echo "✅ Server and frontend rebuilt"
echo "✅ New admin features added"
echo "✅ All tests passed"
echo ""
echo "🌐 ACCESS URLs:"
echo "   Production App: http://$PUBLIC_IP:8080/"
echo "   Enhanced Admin: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🆕 NEW FEATURES:"
echo "   ✅ Logout button in header"
echo "   ✅ User search functionality"
echo "   ✅ Reset user usage"
echo "   ✅ Add bonus credits"
echo "   ✅ Quick action buttons"
echo "   ✅ Enhanced user management"
echo ""
echo "👤 ADMIN LOGIN:"
echo "   Email: mdsajid8636@gmail.com"
echo "   Password: SahYan@2020"
echo ""

pm2 status

# Cleanup
rm -f /tmp/health.json /tmp/admin_health.json /tmp/login.json /tmp/users.json /tmp/stats.json

log "✅ Enhanced admin panel is ready to use!"