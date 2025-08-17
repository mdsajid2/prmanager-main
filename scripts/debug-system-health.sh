#!/bin/bash

echo "🔍 Debugging System Health API on EC2"
echo "====================================="

# Test basic health endpoint
echo "1. Testing basic health endpoint..."
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
echo "Health endpoint: $health_status"

# Test system health endpoint (should return 401 without auth)
echo ""
echo "2. Testing system health endpoint (no auth)..."
system_health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/system-health 2>/dev/null || echo "000")
echo "System health endpoint: $system_health_status"

# Test with verbose output to see actual response
echo ""
echo "3. Testing system health endpoint (verbose)..."
curl -v http://localhost:8080/api/admin/system-health 2>&1 | head -20

echo ""
echo "4. Checking PM2 logs for errors..."
pm2 logs pr-manager --lines 10 --nostream 2>/dev/null || echo "PM2 not available"

echo ""
echo "5. Checking if system health routes are loaded..."
echo "Looking for system-health in server logs..."
pm2 logs pr-manager --lines 50 --nostream 2>/dev/null | grep -i "system\|health\|route" || echo "No system health logs found"

echo ""
echo "6. Testing other admin endpoints..."
admin_users_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/users 2>/dev/null || echo "000")
echo "Admin users endpoint: $admin_users_status"

echo ""
echo "7. Checking server build..."
if [ -f "server/dist/routes/system-health.js" ]; then
    echo "✅ System health routes compiled"
else
    echo "❌ System health routes NOT compiled"
fi

if [ -f "server/dist/services/system-health.js" ]; then
    echo "✅ System health service compiled"
else
    echo "❌ System health service NOT compiled"
fi

echo ""
echo "8. Checking server index for route registration..."
if grep -q "system-health" server/dist/index.js 2>/dev/null; then
    echo "✅ System health routes registered in server"
else
    echo "❌ System health routes NOT registered in server"
fi