#!/bin/bash

# Debug CloudFront Issues
echo "🔍 DEBUGGING CLOUDFRONT ISSUES"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEBUG] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# URLs to test
DIRECT_URL="http://ec2-43-204-110-49.ap-south-1.compute.amazonaws.com:8080"
CLOUDFRONT_URL="https://your-cloudfront-domain.cloudfront.net"  # Replace with your actual CloudFront URL

echo ""
echo "1. TESTING DIRECT SERVER ACCESS"
echo "==============================="

info "Testing direct server health..."
DIRECT_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/direct_health.json "$DIRECT_URL/health" 2>/dev/null)
echo "Direct health response: $DIRECT_HEALTH"

if [ "$DIRECT_HEALTH" = "200" ]; then
    log "✅ Direct server access working"
else
    error "❌ Direct server access failed"
    exit 1
fi

info "Testing direct admin API..."
DIRECT_ADMIN=$(curl -s -w "%{http_code}" -o /tmp/direct_admin.json "$DIRECT_URL/api/new-admin/health" 2>/dev/null)
echo "Direct admin API response: $DIRECT_ADMIN"

if [ "$DIRECT_ADMIN" = "200" ]; then
    log "✅ Direct admin API working"
else
    error "❌ Direct admin API failed"
fi

echo ""
echo "2. TESTING CLOUDFRONT ACCESS"
echo "============================"

info "Testing CloudFront health..."
CF_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/cf_health.json "$CLOUDFRONT_URL/health" 2>/dev/null)
echo "CloudFront health response: $CF_HEALTH"

if [ "$CF_HEALTH" = "200" ]; then
    log "✅ CloudFront basic access working"
else
    error "❌ CloudFront basic access failed"
    echo "Response:"
    cat /tmp/cf_health.json 2>/dev/null
fi

info "Testing CloudFront admin API..."
CF_ADMIN=$(curl -s -w "%{http_code}" -o /tmp/cf_admin.json "$CLOUDFRONT_URL/api/new-admin/health" 2>/dev/null)
echo "CloudFront admin API response: $CF_ADMIN"

if [ "$CF_ADMIN" = "200" ]; then
    log "✅ CloudFront admin API working"
else
    error "❌ CloudFront admin API failed"
    echo "Response:"
    cat /tmp/cf_admin.json 2>/dev/null
fi

echo ""
echo "3. TESTING AUTHENTICATION THROUGH CLOUDFRONT"
echo "============================================="

info "Testing login through CloudFront..."
CF_LOGIN=$(curl -s -w "%{http_code}" -o /tmp/cf_login.json \
    -X POST "$CLOUDFRONT_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "CloudFront login response: $CF_LOGIN"

if [ "$CF_LOGIN" = "200" ]; then
    log "✅ CloudFront login working"
    
    # Test admin API with token
    if command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/cf_login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            info "Testing admin API with token through CloudFront..."
            
            CF_USERS=$(curl -s -w "%{http_code}" -o /tmp/cf_users.json \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                "$CLOUDFRONT_URL/api/new-admin/users")
            
            echo "CloudFront admin users response: $CF_USERS"
            
            if [ "$CF_USERS" = "200" ]; then
                log "✅ CLOUDFRONT AUTHENTICATION WORKING!"
            else
                error "❌ CloudFront authentication failed"
                echo "Response:"
                cat /tmp/cf_users.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ CloudFront login failed"
    echo "Response:"
    cat /tmp/cf_login.json 2>/dev/null
fi

echo ""
echo "4. HEADER COMPARISON"
echo "===================="

info "Testing header forwarding..."

echo "Direct server headers:"
curl -s -I "$DIRECT_URL/api/new-admin/health" | head -10

echo ""
echo "CloudFront headers:"
curl -s -I "$CLOUDFRONT_URL/api/new-admin/health" | head -10

echo ""
echo "5. CLOUDFRONT CONFIGURATION RECOMMENDATIONS"
echo "==========================================="

echo ""
warn "🔧 CLOUDFRONT CONFIGURATION CHECKLIST:"
echo ""
echo "1. CREATE SEPARATE BEHAVIOR FOR /api/*:"
echo "   - Path Pattern: /api/*"
echo "   - Cache Policy: CachingDisabled"
echo "   - Origin Request Policy: Include Authorization header"
echo "   - Allowed Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE"
echo ""
echo "2. ORIGIN REQUEST POLICY HEADERS:"
echo "   - Authorization"
echo "   - Content-Type"
echo "   - Accept"
echo "   - Origin"
echo "   - Referer"
echo "   - User-Agent"
echo ""
echo "3. CACHE POLICY:"
echo "   - Use 'CachingDisabled' for API routes"
echo "   - Or create custom policy with TTL = 0"
echo ""
echo "4. CORS CONFIGURATION:"
echo "   - Allow all origins for development"
echo "   - Include proper CORS headers"
echo ""

if [ "$CF_USERS" = "200" ]; then
    log "🎉 CLOUDFRONT IS WORKING CORRECTLY!"
    echo "The issue might be browser-specific or intermittent."
else
    error "❌ CLOUDFRONT CONFIGURATION NEEDS FIXING"
    echo ""
    echo "Most likely issues:"
    echo "1. Authorization header not being forwarded"
    echo "2. API responses being cached"
    echo "3. CORS configuration problems"
fi

# Cleanup
rm -f /tmp/direct_*.json /tmp/cf_*.json

echo ""
log "Debug complete. Check CloudFront configuration based on results above."