#!/bin/bash

# 🚀 Quick Frontend Update for Production
# This script updates only the frontend build without full redeployment

set -e

echo "🚀 Updating Frontend in Production"
echo "=================================="

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[UPDATE] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARNING] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "Application directory $APP_DIR does not exist"
    exit 1
fi

cd $APP_DIR

log "📦 Building frontend..."
cd web

# Set production API URL to empty (use same domain)
echo "VITE_API_URL=" > .env.production

if ! npm run build; then
    echo "Failed to build web application"
    exit 1
fi

cd ..

# Verify build
if [ ! -d "$APP_DIR/web/dist" ]; then
    echo "Web build failed - web/dist directory not found"
    exit 1
fi

log "✅ Frontend built successfully"

# Set permissions
chown -R ec2-user:ec2-user $APP_DIR/web/dist
chmod -R 755 $APP_DIR/web/dist

log "🔄 Restarting service to pick up new frontend..."
systemctl restart $SERVICE_NAME

# Wait and check status
sleep 3

if systemctl is-active --quiet $SERVICE_NAME; then
    log "✅ Service restarted successfully"
    
    # Test health endpoint
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        log "✅ Health check passed"
    else
        warn "Health check failed"
    fi
    
    echo ""
    echo "🎉 Frontend update completed!"
    echo "Your changes are now live at your domain."
    
else
    echo "❌ Service failed to restart - check logs: journalctl -u $SERVICE_NAME -f"
    exit 1
fi