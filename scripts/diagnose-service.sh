#!/bin/bash

# PR Manager Service Diagnostic Script
# Run this script to diagnose service startup issues

APP_DIR="/home/ec2-user/prmanager"
SERVICE_USER="ec2-user"

echo "🔍 PR Manager Service Diagnostics"
echo "================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script should be run as root (use sudo) for full diagnostics"
fi

echo ""
echo "📁 Directory Structure:"
echo "======================"
ls -la $APP_DIR/ 2>/dev/null || echo "❌ App directory not found"
echo ""
ls -la $APP_DIR/server/ 2>/dev/null || echo "❌ Server directory not found"
echo ""
ls -la $APP_DIR/server/dist/ 2>/dev/null || echo "❌ Server dist directory not found"

echo ""
echo "🔧 System Information:"
echo "====================="
echo "Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
echo "npm version: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "Node.js path: $(which node 2>/dev/null || echo 'Not found')"

echo ""
echo "📄 Environment File:"
echo "==================="
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ .env file exists"
    echo "File permissions: $(ls -la $APP_DIR/.env)"
    echo "File contents (sensitive data hidden):"
    sed 's/=.*/=***HIDDEN***/' $APP_DIR/.env
else
    echo "❌ .env file not found"
fi

echo ""
echo "🔐 Permissions:"
echo "=============="
echo "App directory owner: $(ls -ld $APP_DIR | awk '{print $3":"$4}')"
echo "Service user exists: $(id $SERVICE_USER >/dev/null 2>&1 && echo 'Yes' || echo 'No')"

echo ""
echo "🚀 Service Status:"
echo "================="
if systemctl is-active --quiet pr-manager; then
    echo "✅ Service is running"
else
    echo "❌ Service is not running"
fi

echo ""
echo "Service configuration:"
if [ -f "/etc/systemd/system/pr-manager.service" ]; then
    echo "✅ Service file exists"
    cat /etc/systemd/system/pr-manager.service
else
    echo "❌ Service file not found"
fi

echo ""
echo "📝 Recent Service Logs:"
echo "======================"
journalctl -u pr-manager --no-pager -l --since "10 minutes ago" 2>/dev/null || echo "No logs available"

echo ""
echo "🧪 Manual Test:"
echo "=============="
echo "Testing application startup manually..."
cd $APP_DIR/server 2>/dev/null || { echo "❌ Cannot access server directory"; exit 1; }

if [ -f "dist/index.js" ]; then
    echo "✅ Built application found"
    echo "Testing startup (will timeout after 10 seconds)..."
    
    # Test with environment variables
    export NODE_ENV=production
    export PORT=3001
    if [ -f "$APP_DIR/.env" ]; then
        source $APP_DIR/.env 2>/dev/null || true
    fi
    
    timeout 10s node dist/index.js > /tmp/pr-manager-manual-test.log 2>&1 &
    TEST_PID=$!
    sleep 3
    
    if kill -0 $TEST_PID 2>/dev/null; then
        echo "✅ Application starts successfully"
        kill $TEST_PID 2>/dev/null || true
    else
        echo "❌ Application failed to start"
        echo "Error log:"
        cat /tmp/pr-manager-manual-test.log 2>/dev/null || echo "No error log available"
    fi
else
    echo "❌ Built application not found at dist/index.js"
    echo "Available files in server directory:"
    ls -la .
fi

echo ""
echo "🔧 Troubleshooting Commands:"
echo "============================"
echo "View live logs:     journalctl -u pr-manager -f"
echo "Service status:     systemctl status pr-manager"
echo "Restart service:    sudo systemctl restart pr-manager"
echo "Manual test:        cd $APP_DIR/server && node dist/index.js"
echo "Check port usage:   sudo ss -tulpn | grep :3001"
echo "Check processes:    ps aux | grep node"

echo ""
echo "🎯 Common Issues & Solutions:"
echo "============================"
echo "1. Missing dependencies: Run 'npm run install:all' in app directory"
echo "2. Build failed: Run 'npm run build' in server and web directories"
echo "3. Permission issues: Run 'sudo chown -R ec2-user:ec2-user $APP_DIR'"
echo "4. Port in use: Kill existing processes with 'sudo pkill -f node'"
echo "5. Missing .env: Ensure JWT_SECRET and other vars are set"