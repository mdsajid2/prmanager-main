#!/bin/bash

# Test New Admin System
echo "🧪 TESTING NEW ADMIN SYSTEM"
echo "==========================="

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
echo "1. TESTING SERVER ENDPOINTS"
echo "==========================="

info "Testing main health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health endpoint: $HEALTH_RESPONSE"
if [ "$HEALTH_RESPONSE" = "200" ]; then
    log "✅ Main server responding"
else
    error "❌ Main server not responding"
    exit 1
fi

info "Testing new admin health endpoint..."
NEW_ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/new_admin_health.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin health: $NEW_ADMIN_HEALTH"
if [ "$NEW_ADMIN_HEALTH" = "200" ]; then
    log "✅ New admin API responding"
    cat /tmp/new_admin_health.json
else
    error "❌ New admin API not responding"
    echo "Response body:"
    cat /tmp/new_admin_health.json 2>/dev/null || echo "No response body"
fi

echo ""
echo "2. TESTING AUTHENTICATION"
echo "========================="

# Get admin credentials from .env
if [ -f "/home/ec2-user/prmanager/.env" ]; then
    ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' /home/ec2-user/prmanager/.env | cut -d'=' -f2)
    ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' /home/ec2-user/prmanager/.env | cut -d'=' -f2)
    
    info "Testing admin login..."
    echo "Admin email: $ADMIN_EMAIL"
    
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    echo "Login response: $LOGIN_RESPONSE"
    
    if [ "$LOGIN_RESPONSE" = "200" ]; then
        log "✅ Admin login successful"
        
        # Extract token
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                echo "Token extracted: ${TOKEN:0:20}..."
                
                echo ""
                echo "3. TESTING NEW ADMIN ENDPOINTS"
                echo "=============================="
                
                info "Testing new admin users endpoint..."
                USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/users.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/new-admin/users)
                
                echo "Users endpoint response: $USERS_RESPONSE"
                
                if [ "$USERS_RESPONSE" = "200" ]; then
                    log "✅ NEW ADMIN USERS ENDPOINT WORKING!"
                    echo "Number of users found:"
                    cat /tmp/users.json | jq length 2>/dev/null || echo "Users data available"
                    echo ""
                    echo "Sample user data:"
                    cat /tmp/users.json | jq '.[0] // empty' 2>/dev/null || echo "User data available"
                else
                    error "❌ New admin users endpoint failed"
                    echo "Response body:"
                    cat /tmp/users.json 2>/dev/null || echo "No response body"
                fi
                
                info "Testing new admin stats endpoint..."
                STATS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/stats.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/new-admin/stats)
                
                echo "Stats endpoint response: $STATS_RESPONSE"
                
                if [ "$STATS_RESPONSE" = "200" ]; then
                    log "✅ NEW ADMIN STATS ENDPOINT WORKING!"
                    echo "Stats data:"
                    cat /tmp/stats.json | jq . 2>/dev/null || cat /tmp/stats.json
                else
                    warn "Stats endpoint not working (this is optional)"
                    cat /tmp/stats.json 2>/dev/null || echo "No response body"
                fi
                
            else
                error "❌ Could not extract token from login response"
                cat /tmp/login.json
            fi
        else
            warn "jq not available, cannot extract token"
        fi
    else
        error "❌ Admin login failed"
        echo "Response body:"
        cat /tmp/login.json 2>/dev/null || echo "No response body"
    fi
else
    error "❌ .env file not found"
fi

echo ""
echo "4. SUMMARY"
echo "=========="

if [ "$NEW_ADMIN_HEALTH" = "200" ] && [ "$LOGIN_RESPONSE" = "200" ] && [ "$USERS_RESPONSE" = "200" ]; then
    log "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ New admin system is working correctly"
    echo "✅ Authentication is working"
    echo "✅ Admin endpoints are responding"
    echo ""
    echo "🌐 Access your new admin panel at:"
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')
    echo "   http://$PUBLIC_IP:8080/new-admin"
else
    error "❌ SOME TESTS FAILED"
    echo ""
    echo "Issues found:"
    [ "$NEW_ADMIN_HEALTH" != "200" ] && echo "- New admin API not responding"
    [ "$LOGIN_RESPONSE" != "200" ] && echo "- Admin login failed"
    [ "$USERS_RESPONSE" != "200" ] && echo "- Admin users endpoint failed"
    echo ""
    echo "🔧 Check server logs: pm2 logs pr-manager"
fi

# Cleanup
rm -f /tmp/health.json /tmp/new_admin_health.json /tmp/login.json /tmp/users.json /tmp/stats.json

echo ""
echo "🔧 PM2 Status:"
pm2 status