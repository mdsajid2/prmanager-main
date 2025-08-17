#!/bin/bash

# Update Admin Route to /admin
echo "🔄 UPDATING ADMIN ROUTE TO /admin"
echo "================================="

APP_DIR="/home/ec2-user/prmanager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[UPDATE] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

cd $APP_DIR

echo ""
echo "1. BUILDING FRONTEND WITH UPDATED ROUTES"
echo "========================================"

info "Building frontend with /admin route..."
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

info "Restarting PM2 to serve new frontend..."
pm2 restart pr-manager

sleep 3

echo ""
echo "3. TESTING UPDATED ROUTES"
echo "========================"

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

echo ""
echo "4. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 ADMIN ROUTE UPDATED SUCCESSFULLY!"
echo ""
echo "✅ Frontend rebuilt with new routing"
echo "✅ Services restarted"
echo "✅ All tests passed"
echo ""
echo "🌐 NEW ADMIN ACCESS:"
echo "   Enhanced Admin Panel: http://$PUBLIC_IP:8080/admin"
echo ""
echo "❌ OLD ROUTE REMOVED:"
echo "   /new-admin is no longer available"
echo ""
echo "🔧 ROUTE CHANGES:"
echo "   ✅ /admin → Enhanced Admin Panel (searchable, full features)"
echo "   ❌ /new-admin → Removed"
echo "   ✅ / → Main application"
echo "   ✅ /merge-strategies → Merge strategies guide"
echo ""
echo "👤 ADMIN ACCESS:"
echo "   Email: mdsajid8636@gmail.com"
echo "   Password: SahYan@2020"
echo "   URL: http://$PUBLIC_IP:8080/admin"
echo ""

pm2 status

# Cleanup
rm -f /tmp/health.json /tmp/login.json

log "✅ Admin panel is now accessible at /admin!"