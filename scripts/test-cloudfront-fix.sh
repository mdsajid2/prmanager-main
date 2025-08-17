#!/bin/bash

# Test CloudFront Fix
echo "🧪 TESTING CLOUDFRONT FIX"
echo "========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "Enter your CloudFront domain (e.g., d1234567890.cloudfront.net):"
read -r CLOUDFRONT_DOMAIN

if [ -z "$CLOUDFRONT_DOMAIN" ]; then
    error "No domain provided. Exiting."
    exit 1
fi

CLOUDFRONT_URL="https://$CLOUDFRONT_DOMAIN"
DIRECT_URL="http://ec2-43-204-110-49.ap-south-1.compute.amazonaws.com:8080"

echo ""
echo "Testing URLs:"
echo "Direct: $DIRECT_URL"
echo "CloudFront: $CLOUDFRONT_URL"

echo ""
echo "1. BASIC CONNECTIVITY TEST"
echo "=========================="

info "Testing CloudFront basic access..."
CF_BASIC=$(curl -s -w "%{http_code}" -o /tmp/cf_basic.json "$CLOUDFRONT_URL/health" 2>/dev/null)
echo "CloudFront health: $CF_BASIC"

if [ "$CF_BASIC" = "200" ]; then
    log "✅ CloudFront basic access working"
else
    error "❌ CloudFront basic access failed"
    echo "Response:"
    cat /tmp/cf_basic.json 2>/dev/null
    exit 1
fi

echo ""
echo "2. API ENDPOINT TEST"
echo "==================="

info "Testing CloudFront API access..."
CF_API=$(curl -s -w "%{http_code}" -o /tmp/cf_api.json "$CLOUDFRONT_URL/api/new-admin/health" 2>/dev/null)
echo "CloudFront API health: $CF_API"

if [ "$CF_API" = "200" ]; then
    log "✅ CloudFront API access working"
else
    error "❌ CloudFront API access failed"
    echo "Response:"
    cat /tmp/cf_api.json 2>/dev/null
    echo ""
    warn "This means you need to create the /api/* behavior in CloudFront"
    exit 1
fi

echo ""
echo "3. AUTHENTICATION TEST"
echo "======================"

info "Testing login through CloudFront..."
CF_LOGIN=$(curl -s -w "%{http_code}" -o /tmp/cf_login.json \
    -X POST "$CLOUDFRONT_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "CloudFront login: $CF_LOGIN"

if [ "$CF_LOGIN" = "200" ]; then
    log "✅ CloudFront login working"
    
    # Extract token and test admin API
    if command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/cf_login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            info "Testing admin API with Authorization header..."
            
            CF_ADMIN=$(curl -s -w "%{http_code}" -o /tmp/cf_admin.json \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                "$CLOUDFRONT_URL/api/new-admin/users")
            
            echo "CloudFront admin API: $CF_ADMIN"
            
            if [ "$CF_ADMIN" = "200" ]; then
                log "🎉 CLOUDFRONT IS WORKING PERFECTLY!"
                echo ""
                echo "✅ Basic access: Working"
                echo "✅ API endpoints: Working"
                echo "✅ Authentication: Working"
                echo "✅ Authorization headers: Working"
                echo ""
                echo "🌐 Your admin panel should work at:"
                echo "   $CLOUDFRONT_URL/new-admin"
            else
                error "❌ Authorization header not being forwarded"
                echo "Response:"
                cat /tmp/cf_admin.json 2>/dev/null
                echo ""
                warn "FIX: Add 'Authorization' header to CloudFront Origin Request Policy"
            fi
        fi
    fi
else
    error "❌ CloudFront login failed"
    echo "Response:"
    cat /tmp/cf_login.json 2>/dev/null
fi

echo ""
echo "4. SUMMARY"
echo "=========="

if [ "$CF_ADMIN" = "200" ]; then
    log "🎉 ALL TESTS PASSED - CLOUDFRONT IS CONFIGURED CORRECTLY!"
else
    error "❌ CLOUDFRONT NEEDS CONFIGURATION"
    echo ""
    echo "🔧 REQUIRED FIXES:"
    [ "$CF_API" != "200" ] && echo "1. Create /api/* behavior with CachingDisabled"
    [ "$CF_LOGIN" != "200" ] && echo "2. Allow POST method in behavior"
    [ "$CF_ADMIN" != "200" ] && echo "3. Add Authorization header to Origin Request Policy"
fi

# Cleanup
rm -f /tmp/cf_*.json

echo ""
log "Test complete!"