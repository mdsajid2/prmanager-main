#!/bin/bash

# EC2 Status Check Script
echo "🔍 EC2 PR Manager Status Check"
echo "=============================="

APP_DIR="/home/ec2-user/prmanager"

echo ""
echo "📁 Current .env file:"
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ .env file exists"
    echo "PORT setting:"
    grep "^PORT=" "$APP_DIR/.env" || echo "❌ No PORT setting found"
else
    echo "❌ .env file not found"
fi

echo ""
echo "🚀 Service Status:"
systemctl status pr-manager --no-pager -l

echo ""
echo "🌐 Network Connections:"
echo "Port 3001:"
ss -tulpn | grep :3001 || echo "❌ Nothing on port 3001"
echo "Port 8080:"
ss -tulpn | grep :8080 || echo "❌ Nothing on port 8080"

echo ""
echo "📝 Recent Service Logs:"
journalctl -u pr-manager --since "5 minutes ago" --no-pager | tail -10

echo ""
echo "🔧 Process Information:"
ps aux | grep node | grep -v grep || echo "❌ No node processes found"