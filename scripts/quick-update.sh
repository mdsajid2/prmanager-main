#!/bin/bash

# Quick update script for server and web changes
set -e

APP_DIR="/home/ec2-user/prmanager"

echo "🔄 Quick Update: Rebuilding applications..."

echo "📦 Building web application..."
cd $APP_DIR/web
npm run build

echo "📦 Building server application..."
cd $APP_DIR/server
npm run build

echo "🔄 Restarting service..."
sudo systemctl restart pr-manager

sleep 3

if systemctl is-active --quiet pr-manager; then
    echo "✅ Service restarted successfully"
    echo "🌐 Your app is now available at: http://your-ec2-ip:3001"
    echo "📊 Health check: http://your-ec2-ip:3001/health"
else
    echo "❌ Service failed to restart"
    echo "Check logs: journalctl -u pr-manager -f"
fi