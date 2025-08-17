#!/bin/bash

echo "🔍 Verifying System Health Integration"
echo "====================================="

# Check if SystemHealthDashboard component exists
if [ -f "web/src/components/SystemHealthDashboard.tsx" ]; then
    echo "✅ SystemHealthDashboard component exists"
else
    echo "❌ SystemHealthDashboard component missing"
    exit 1
fi

# Check if system health service exists
if [ -f "server/src/services/system-health.ts" ]; then
    echo "✅ System health service exists"
else
    echo "❌ System health service missing"
    exit 1
fi

# Check if system health routes exist
if [ -f "server/src/routes/system-health.ts" ]; then
    echo "✅ System health routes exist"
else
    echo "❌ System health routes missing"
    exit 1
fi

# Check if AdminPanel imports SystemHealthDashboard
if grep -q "SystemHealthDashboard" "web/src/components/AdminPanel.tsx"; then
    echo "✅ AdminPanel imports SystemHealthDashboard"
else
    echo "❌ AdminPanel missing SystemHealthDashboard import"
    exit 1
fi

# Check if AdminPanel has system tab
if grep -q "System Health" "web/src/components/AdminPanel.tsx"; then
    echo "✅ AdminPanel has System Health tab"
else
    echo "❌ AdminPanel missing System Health tab"
    exit 1
fi

# Check if server index includes system health routes
if grep -q "system-health" "server/src/index.ts"; then
    echo "✅ Server includes system health routes"
else
    echo "❌ Server missing system health routes"
    exit 1
fi

echo ""
echo "🎯 Integration Status: All components properly integrated!"
echo ""
echo "📋 To see System Health Dashboard:"
echo "1. Deploy the application: sudo ./scripts/deploy-production.sh"
echo "2. Login as admin user (using ADMIN_EMAIL from .env)"
echo "3. Navigate to Admin Panel"
echo "4. Click the '🔍 System Health' tab"
echo ""
echo "🔧 If you don't see the tab:"
echo "- Check browser console for errors"
echo "- Verify you're logged in as admin"
echo "- Make sure the latest code is deployed"
echo ""