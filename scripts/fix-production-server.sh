#!/bin/bash

# Fix Production Server Script
echo "🔧 FIXING PRODUCTION SERVER ON PORT 8080"
echo "========================================="

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
echo "1. CHECKING WHAT'S RUNNING ON EACH PORT"
echo "======================================="

info "Checking port 3001..."
PORT_3001=$(lsof -ti:3001 2>/dev/null || echo "")
if [ -n "$PORT_3001" ]; then
    log "✅ Port 3001 is active (PID: $PORT_3001)"
    ps aux | grep $PORT_3001 | grep -v grep
else
    warn "⚠️ Nothing on port 3001"
fi

info "Checking port 8080..."
PORT_8080=$(lsof -ti:8080 2>/dev/null || echo "")
if [ -n "$PORT_8080" ]; then
    log "✅ Port 8080 is active (PID: $PORT_8080)"
    ps aux | grep $PORT_8080 | grep -v grep
else
    error "❌ Nothing on port 8080!"
fi

echo ""
echo "2. CHECKING PM2 STATUS"
echo "======================"

info "Current PM2 processes..."
pm2 status

echo ""
echo "3. STOPPING ALL SERVERS AND RESTARTING PRODUCTION"
echo "=================================================="

info "Stopping all Node processes..."
# Kill port 3001 (dev server)
if [ -n "$PORT_3001" ]; then
    kill -9 $PORT_3001 2>/dev/null || true
    log "✅ Stopped port 3001"
fi

# Stop PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill any remaining processes on 8080
if [ -n "$PORT_8080" ]; then
    kill -9 $PORT_8080 2>/dev/null || true
fi

sleep 3

echo ""
echo "4. REBUILDING SERVER WITH LATEST CODE"
echo "====================================="

info "Building server with new admin routes..."
cd server
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server built successfully"
cd ..

echo ""
echo "5. STARTING PRODUCTION SERVER ON PORT 8080"
echo "==========================================="

info "Starting production server with PM2..."

# Ensure .env has PORT=8080
if grep -q "^PORT=" .env; then
    sed -i 's/^PORT=.*/PORT=8080/' .env
else
    echo "PORT=8080" >> .env
fi

# Ensure NODE_ENV=production
if grep -q "^NODE_ENV=" .env; then
    sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
else
    echo "NODE_ENV=production" >> .env
fi

log "✅ Environment configured for production"

# Start with PM2
pm2 start server/dist/index.js --name pr-manager --env production
pm2 save

sleep 5

echo ""
echo "6. TESTING PRODUCTION SERVER"
echo "============================"

info "Testing port 8080..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Production server responding on port 8080"
else
    error "❌ Production server not responding on port 8080"
    pm2 logs pr-manager --lines 10
    exit 1
fi

info "Testing new admin API on port 8080..."
ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/admin_health_8080.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin health on 8080: $ADMIN_HEALTH"

if [ "$ADMIN_HEALTH" = "200" ]; then
    log "✅ New admin API working on port 8080"
    cat /tmp/admin_health_8080.json
else
    error "❌ New admin API not working on port 8080"
    cat /tmp/admin_health_8080.json 2>/dev/null || echo "No response"
fi

echo ""
echo "7. TESTING AUTHENTICATION ON PORT 8080"
echo "======================================="

info "Testing admin login on port 8080..."
ADMIN_EMAIL="mdsajid8636@gmail.com"
ADMIN_PASSWORD="SahYan@2020"

LOGIN_8080=$(curl -s -w "%{http_code}" -o /tmp/login_8080.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Login on 8080: $LOGIN_8080"

if [ "$LOGIN_8080" = "200" ]; then
    log "✅ Admin login working on port 8080"
    
    # Test admin API
    if command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/login_8080.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            USERS_8080=$(curl -s -w "%{http_code}" -o /tmp/users_8080.json \
                -H "Authorization: Bearer $TOKEN" \
                http://localhost:8080/api/new-admin/users)
            
            echo "Admin users on 8080: $USERS_8080"
            
            if [ "$USERS_8080" = "200" ]; then
                log "✅ NEW ADMIN API FULLY WORKING ON PORT 8080!"
            else
                error "❌ Admin API failed on port 8080"
                cat /tmp/users_8080.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Admin login failed on port 8080"
    cat /tmp/login_8080.json 2>/dev/null
fi

echo ""
echo "8. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
if [ "$ADMIN_HEALTH" = "200" ] && [ "$LOGIN_8080" = "200" ] && [ "$USERS_8080" = "200" ]; then
    log "🎉 PRODUCTION SERVER FIXED!"
    echo ""
    echo "✅ Production server running on port 8080"
    echo "✅ New admin API working"
    echo "✅ Authentication working"
    echo ""
    echo "🌐 ACCESS URLs:"
    echo "   Production App: http://$PUBLIC_IP:8080/"
    echo "   Production Admin: http://$PUBLIC_IP:8080/new-admin"
    echo ""
    echo "🔧 CloudFront should now work properly!"
else
    error "❌ PRODUCTION SERVER STILL HAS ISSUES"
    echo ""
    echo "Check the test results above"
    echo "PM2 logs: pm2 logs pr-manager"
fi

echo ""
pm2 status

# Cleanup
rm -f /tmp/admin_health_8080.json /tmp/login_8080.json /tmp/users_8080.json

log "✅ Production server setup complete!"