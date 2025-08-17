#!/bin/bash

# Simple Frontend Rebuild
echo "🔧 REBUILDING FRONTEND WITH NEW ADMIN"
echo "====================================="

APP_DIR="/home/ec2-user/prmanager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[BUILD] $1${NC}"; }

cd $APP_DIR

echo ""
echo "1. BUILDING FRONTEND"
echo "==================="

info "Building frontend with new admin panel..."
cd web

# Clean build
rm -rf dist node_modules/.vite

# Build
if npm run build; then
    log "✅ Frontend build successful"
else
    error "❌ Frontend build failed"
    echo ""
    echo "🔧 Checking for common issues..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        warn "node_modules not found, installing dependencies..."
        npm install
        echo "Retrying build..."
        npm run build
    fi
    
    exit 1
fi

cd ..

echo ""
echo "2. CHECKING BUILD OUTPUT"
echo "======================="

info "Checking if new admin panel is in build..."
if grep -r "new-admin" web/dist/ >/dev/null 2>&1; then
    log "✅ New admin panel found in build"
else
    warn "⚠️ New admin panel not found in build"
fi

# Check build size
BUILD_SIZE=$(du -sh web/dist/ | cut -f1)
log "Build size: $BUILD_SIZE"

echo ""
echo "3. TESTING ACCESS"
echo "================="

info "Testing if server serves the new build..."

# Test main page
MAIN_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/ 2>/dev/null)
echo "Main page response: $MAIN_RESPONSE"

if [ "$MAIN_RESPONSE" = "200" ]; then
    log "✅ Main page accessible"
else
    error "❌ Main page not accessible"
fi

echo ""
echo "4. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 FRONTEND REBUILD COMPLETE!"
echo ""
echo "🌐 ACCESS URLs:"
echo "   Main App: http://$PUBLIC_IP:8080/"
echo "   New Admin: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Clear your browser cache"
echo "2. Login to the main app"
echo "3. Go to the new admin panel"
echo "4. Check browser console for any errors"
echo ""

log "✅ Ready to test the new admin panel!"