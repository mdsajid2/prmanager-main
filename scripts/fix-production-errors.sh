#!/bin/bash

# Fix Production Errors
echo "🔧 FIXING PRODUCTION ERRORS"
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
echo "1. CHECKING MISSING API ENDPOINTS"
echo "================================="

info "Checking for missing endpoints..."

# Check if daily-usage endpoint exists
if ! grep -r "daily-usage" server/src/routes/ >/dev/null 2>&1; then
    warn "Missing daily-usage endpoint"
fi

# Check if tokens endpoint exists
if ! grep -r "/tokens" server/src/routes/ >/dev/null 2>&1; then
    warn "Missing tokens endpoint"
fi

echo ""
echo "2. FIXING FRONTEND API CONFIGURATION"
echo "===================================="

info "Updating frontend to use correct API base..."

# Check current API configuration
if grep -r "localhost:3001" web/src/ >/dev/null 2>&1; then
    warn "Found localhost:3001 references in frontend"
    echo "Files with localhost:3001:"
    grep -r "localhost:3001" web/src/ | head -5
fi

echo ""
echo "3. CHECKING SERVER CORS CONFIGURATION"
echo "====================================="

info "Checking CORS configuration..."
if grep -A 10 "corsOptions" server/src/index.ts; then
    log "✅ CORS configuration found"
else
    warn "CORS configuration might be missing"
fi

echo ""
echo "4. TESTING CURRENT SERVER STATUS"
echo "==============================="

info "Testing server endpoints..."

# Test health
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health endpoint: $HEALTH"

# Test missing endpoints
DAILY_USAGE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/analyze/daily-usage 2>/dev/null)
echo "Daily usage endpoint: $DAILY_USAGE"

TOKENS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/tokens 2>/dev/null)
echo "Tokens endpoint: $TOKENS"

echo ""
echo "5. RECOMMENDATIONS"
echo "=================="

echo ""
warn "🔧 ISSUES FOUND:"

if [ "$DAILY_USAGE" = "404" ]; then
    echo "1. Missing /api/analyze/daily-usage endpoint"
fi

if [ "$TOKENS" = "404" ]; then
    echo "2. Missing /api/tokens endpoint"
fi

if grep -r "localhost:3001" web/src/ >/dev/null 2>&1; then
    echo "3. Frontend has hardcoded localhost:3001 URLs"
fi

echo ""
info "🎯 SOLUTIONS:"
echo "1. Add missing API endpoints to server"
echo "2. Fix frontend API base URL configuration"
echo "3. Update CORS settings for production domain"
echo "4. Rebuild and redeploy"

echo ""
echo "6. QUICK FIXES"
echo "=============="

info "Applying quick fixes..."

# Check if we need to add missing endpoints
if [ "$DAILY_USAGE" = "404" ]; then
    warn "Need to add daily-usage endpoint"
fi

if [ "$TOKENS" = "404" ]; then
    warn "Need to add tokens endpoint"
fi

# Get public IP for testing
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🔍 CURRENT STATUS:"
echo "   Server Health: $HEALTH"
echo "   Daily Usage API: $DAILY_USAGE"
echo "   Tokens API: $TOKENS"
echo "   Production URL: http://$PUBLIC_IP:8080/"
echo ""

if [ "$HEALTH" = "200" ]; then
    log "✅ Server is running"
else
    error "❌ Server issues detected"
fi

# Cleanup
rm -f /tmp/health.json

echo ""
log "Error analysis complete. Check recommendations above."