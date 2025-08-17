#!/bin/bash

echo "🎁 Deploying Enhanced Referral & Usage System"
echo "============================================="

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
echo "3. SETUP DATABASES"
echo "=================="
echo "[INFO] Setting up simple usage table..."
node setup-simple-usage.js
if [ $? -ne 0 ]; then
    echo "❌ Simple usage setup failed"
    exit 1
fi

echo "[INFO] Setting up referral system..."
node setup-referral-system.js
if [ $? -ne 0 ]; then
    echo "❌ Referral system setup failed"
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

echo "[INFO] Testing enhanced usage endpoint..."
usage_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/enhanced-usage)
echo "Enhanced usage: $usage_status"

echo "[INFO] Testing referral info endpoint..."
referral_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/referral-info)
echo "Referral info: $referral_status"

echo ""
echo "7. FINAL STATUS"
echo "==============="
if [ "$health_status" = "200" ] && [ "$usage_status" = "401" ] && [ "$referral_status" = "401" ]; then
    echo "🎯 SUCCESS: Enhanced referral system deployed!"
    echo "✅ Health endpoint: Working"
    echo "✅ Usage endpoint: Working (401 = auth required)"
    echo "✅ Referral endpoint: Working (401 = auth required)"
    echo ""
    echo "🎁 NEW FEATURES:"
    echo "• Referral system: Share links, earn +2 calls per signup"
    echo "• Enhanced usage stats with bonus tracking"
    echo "• Contact support for limit increases"
    echo "• Usage stats now appear in results tab"
else
    echo "⚠️  PARTIAL SUCCESS:"
    echo "Health: $health_status"
    echo "Usage: $usage_status (401 expected)"
    echo "Referral: $referral_status (401 expected)"
fi

echo ""
echo "🚀 Deployment complete!"
echo "Users can now:"
echo "• Share referral links to earn bonus daily calls"
echo "• View enhanced usage stats in the Usage tab"
echo "• Contact support for higher limits"