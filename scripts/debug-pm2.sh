#!/bin/bash

# Debug PM2 Issues Script
echo "🔍 PM2 Debug Information"
echo "========================"

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

echo "1. Checking PM2 installation..."
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2 is installed: $(pm2 --version)"
else
    echo "❌ PM2 is not installed"
    echo "Installing PM2..."
    npm install -g pm2
fi

echo ""
echo "2. Checking application files..."
if [ -f "$APP_DIR/server/dist/index.js" ]; then
    echo "✅ Server build exists: $APP_DIR/server/dist/index.js"
else
    echo "❌ Server build missing: $APP_DIR/server/dist/index.js"
fi

if [ -f "$APP_DIR/.env" ]; then
    echo "✅ Environment file exists"
    echo "Environment variables:"
    grep -E "^(NODE_ENV|PORT|DATABASE_URL)" $APP_DIR/.env | sed 's/=.*/=***/'
else
    echo "❌ Environment file missing"
fi

echo ""
echo "3. Current PM2 status..."
pm2 status

echo ""
echo "4. PM2 logs for $SERVICE_NAME..."
pm2 logs $SERVICE_NAME --lines 20 || echo "No logs available"

echo ""
echo "5. Testing Node.js directly..."
cd $APP_DIR/server
if node -e "console.log('Node.js test successful')"; then
    echo "✅ Node.js is working"
else
    echo "❌ Node.js test failed"
fi

echo ""
echo "6. Testing server build directly..."
cd $APP_DIR/server
if [ -f "dist/index.js" ]; then
    echo "Testing server startup..."
    timeout 10s node dist/index.js || echo "Server test completed (timeout after 10s)"
else
    echo "❌ Server build file not found"
fi

echo ""
echo "7. Manual PM2 start attempt..."
cd $APP_DIR
echo "Attempting to start with PM2..."
pm2 start server/dist/index.js --name $SERVICE_NAME --env production || echo "PM2 start failed"

echo ""
echo "8. Final PM2 status..."
pm2 status