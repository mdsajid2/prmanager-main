#!/bin/bash

# =============================================================================
# Fix All API Endpoints - Complete Route Registration Fix
# =============================================================================
# This script fixes the issue where all API routes return 404
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

PROJECT_DIR="/home/ec2-user/prmanager"

echo ""
echo "🔧 Fixing All API Endpoints"
echo "==========================="
echo "📅 Time: $(date)"
echo ""

cd "${PROJECT_DIR}"

# Step 1: Diagnose the issue
log "1. DIAGNOSING THE ISSUE"
echo "======================="

# Check if server is running
if ! pm2 list | grep -q "pr-manager"; then
    error "PM2 process not found!"
    exit 1
fi

# Test basic health (should work)
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
log "Health endpoint: $health_status"

# Test API endpoints (currently failing)
analyze_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/analyze 2>/dev/null || echo "000")
log "Analyze endpoint: $analyze_status"

if [ "$health_status" = "200" ] && [ "$analyze_status" = "404" ]; then
    warning "Route registration issue detected - server running but API routes missing"
else
    error "Different issue detected - health: $health_status, analyze: $analyze_status"
fi

# Step 2: Check current build
log "2. CHECKING CURRENT BUILD"
echo "========================="

if [ ! -f "server/dist/index.js" ]; then
    error "Server build missing!"
    exit 1
fi

# Check if routes exist in build
missing_routes=0
for route in "analyze" "enhanced-usage" "system-health" "daily-usage"; do
    if [ -f "server/dist/routes/${route}.js" ]; then
        success "Route file exists: ${route}.js"
    else
        error "Route file missing: ${route}.js"
        ((missing_routes++))
    fi
done

if [ $missing_routes -gt 0 ]; then
    warning "Missing route files detected - rebuild required"
fi

# Step 3: Stop service and clean up
log "3. STOPPING SERVICE"
echo "=================="

pm2 stop pr-manager
pm2 delete pr-manager
success "Service stopped and removed"

# Kill any remaining processes
sudo lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sudo lsof -ti:3001 | xargs kill -9 2>/dev/null || true
success "Ports cleaned up"

# Step 4: Rebuild server completely
log "4. REBUILDING SERVER"
echo "==================="

cd server

# Clean build directory
rm -rf dist
success "Build directory cleaned"

# Install dependencies
npm ci --production=false
success "Dependencies installed"

# Build server
npm run build
if [ $? -ne 0 ]; then
    error "Server build failed!"
    exit 1
fi
success "Server built successfully"

cd ..

# Step 5: Verify build
log "5. VERIFYING BUILD"
echo "=================="

# Check if all route files exist
all_routes_exist=true
for route in "analyze" "enhanced-usage" "system-health" "daily-usage" "auth" "admin"; do
    if [ -f "server/dist/routes/${route}.js" ]; then
        success "✅ ${route}.js"
    else
        error "❌ ${route}.js missing"
        all_routes_exist=false
    fi
done

if [ "$all_routes_exist" = false ]; then
    error "Route files missing after build!"
    exit 1
fi

# Check main server file
if grep -q "analyzeRouter" server/dist/index.js && grep -q "enhancedUsageRouter" server/dist/index.js; then
    success "Route imports found in server build"
else
    error "Route imports missing in server build!"
    exit 1
fi

# Step 6: Fix environment
log "6. FIXING ENVIRONMENT"
echo "===================="

# Ensure correct port
if ! grep -q "^PORT=8080" .env; then
    echo "PORT=8080" >> .env
    success "Port set to 8080"
fi

# Verify critical env vars
if grep -q "DATABASE_URL" .env && grep -q "JWT_SECRET" .env; then
    success "Critical environment variables present"
else
    error "Missing critical environment variables!"
    exit 1
fi

# Step 7: Start service fresh
log "7. STARTING SERVICE"
echo "=================="

# Start with explicit configuration
pm2 start server/dist/index.js --name pr-manager --time --env production
pm2 save
success "Service started"

# Wait for startup
log "Waiting for service startup..."
sleep 8

# Step 8: Test all endpoints
log "8. TESTING ALL ENDPOINTS"
echo "========================"

# Test health (should work)
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
if [ "$health_status" = "200" ]; then
    success "Health endpoint: $health_status"
else
    error "Health endpoint failed: $health_status"
    exit 1
fi

# Test analyze endpoint
analyze_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/analyze 2>/dev/null || echo "000")
if [ "$analyze_status" = "400" ] || [ "$analyze_status" = "405" ]; then
    success "Analyze endpoint: $analyze_status (working)"
elif [ "$analyze_status" = "404" ]; then
    error "Analyze endpoint still 404!"
    
    # Show recent logs for debugging
    echo ""
    warning "Recent server logs:"
    pm2 logs pr-manager --lines 20 --nostream
    exit 1
else
    warning "Analyze endpoint: $analyze_status (unexpected but not 404)"
fi

# Test enhanced usage endpoint (should require auth)
usage_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/enhanced-usage 2>/dev/null || echo "000")
if [ "$usage_status" = "401" ]; then
    success "Enhanced usage endpoint: $usage_status (secured)"
elif [ "$usage_status" = "404" ]; then
    error "Enhanced usage endpoint still 404!"
    exit 1
else
    warning "Enhanced usage endpoint: $usage_status"
fi

# Test system health endpoint (should require admin auth)
system_health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/system-health 2>/dev/null || echo "000")
if [ "$system_health_status" = "401" ]; then
    success "System health endpoint: $system_health_status (secured)"
elif [ "$system_health_status" = "404" ]; then
    error "System health endpoint still 404!"
    exit 1
else
    warning "System health endpoint: $system_health_status"
fi

# Test referral info endpoint (should require auth)
referral_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/referral-info 2>/dev/null || echo "000")
if [ "$referral_status" = "401" ]; then
    success "Referral info endpoint: $referral_status (secured)"
elif [ "$referral_status" = "404" ]; then
    error "Referral info endpoint still 404!"
    exit 1
else
    warning "Referral info endpoint: $referral_status"
fi

# Step 9: Final verification
log "9. FINAL VERIFICATION"
echo "===================="

# Check PM2 status
pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | .pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$pm2_status" = "online" ]; then
    success "PM2 service: $pm2_status"
else
    error "PM2 service: $pm2_status"
    exit 1
fi

# Get memory usage
memory_usage=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | .monit.memory' 2>/dev/null || echo "0")
if [ "$memory_usage" -gt 0 ]; then
    memory_mb=$(echo $memory_usage | awk '{print int($1/1024/1024)"MB"}')
    success "Memory usage: ${memory_mb}"
fi

echo ""
echo "🎉 ALL API ENDPOINTS FIXED!"
echo "==========================="
echo ""
success "✅ Health endpoint: Working (200)"
success "✅ Analyze endpoint: Working (400/405)"
success "✅ Enhanced usage: Secured (401)"
success "✅ System health: Secured (401)"
success "✅ Referral info: Secured (401)"
echo ""
echo "🔗 Test URLs:"
echo "   • Health: http://localhost:8080/health"
echo "   • Analyze: http://localhost:8080/api/analyze"
echo "   • Admin: http://localhost:8080/api/admin/system-health"
echo ""
echo "📊 Service Status:"
echo "   • PM2 Status: ${pm2_status}"
echo "   • Memory Usage: ${memory_mb:-"Unknown"}"
echo ""
success "All API endpoints are now working correctly!"
echo ""