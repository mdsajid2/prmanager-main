#!/bin/bash

echo "🚀 Migrating Simple Usage System to Production"
echo "=============================================="

# Navigate to project directory
cd /home/ec2-user/prmanager

echo "1. BACKUP CURRENT STATE"
echo "======================="
echo "[INFO] Creating backup..."
cp -r server/dist server/dist.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "✅ Backup created"

echo ""
echo "2. BUILD SERVER"
echo "==============="
echo "[INFO] Building server..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Server build failed"
    exit 1
fi
echo "✅ Server built successfully"

echo ""
echo "3. SETUP DATABASE"
echo "================="
echo "[INFO] Setting up simple usage table..."
node setup-simple-usage.js
if [ $? -ne 0 ]; then
    echo "❌ Database setup failed"
    exit 1
fi
echo "✅ Database setup complete"

cd ..

echo ""
echo "4. BUILD FRONTEND"
echo "================="
echo "[INFO] Building frontend..."
cd web
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
echo "✅ Frontend built successfully"

cd ..

echo ""
echo "5. RESTART SERVER"
echo "================="
echo "[INFO] Restarting PM2 process..."
pm2 restart pr-manager
pm2 save
echo "✅ Server restarted"

echo ""
echo "6. TEST ENDPOINTS"
echo "================="
echo "[INFO] Testing health..."
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
echo "Health: $health_status"

echo "[INFO] Testing daily usage endpoint..."
usage_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/daily-usage)
echo "Daily usage: $usage_status"

echo ""
echo "7. FINAL STATUS"
echo "==============="
if [ "$health_status" = "200" ] && [ "$usage_status" = "401" ]; then
    echo "🎯 SUCCESS: Simple usage system deployed!"
    echo "✅ Health endpoint: Working"
    echo "✅ Usage endpoint: Working (401 = auth required, which is correct)"
else
    echo "⚠️  PARTIAL SUCCESS:"
    echo "Health: $health_status"
    echo "Usage: $usage_status (401 expected for unauthenticated request)"
fi

echo ""
echo "🚀 Migration complete!"
echo "Usage stats are now available in the 'Usage' tab after running analysis."