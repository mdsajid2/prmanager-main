#!/bin/bash

# Cleanup Existing Services Script
echo "🧹 Cleaning up existing services and processes"
echo "=============================================="

SERVICE_NAME="pr-manager"
APP_DIR="/home/ec2-user/prmanager"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

echo "1. Checking for systemd service..."
if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    log "Stopping systemd service: $SERVICE_NAME"
    systemctl stop $SERVICE_NAME
    systemctl disable $SERVICE_NAME
    log "✅ Systemd service stopped and disabled"
else
    log "No active systemd service found"
fi

echo ""
echo "2. Checking for systemd service file..."
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    log "Removing systemd service file"
    rm -f "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
    log "✅ Systemd service file removed"
else
    log "No systemd service file found"
fi

echo ""
echo "3. Checking for processes on port 8080..."
PORT_PROCESSES=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PORT_PROCESSES" ]; then
    log "Found processes on port 8080: $PORT_PROCESSES"
    log "Killing processes on port 8080..."
    kill -9 $PORT_PROCESSES 2>/dev/null || true
    sleep 2
    log "✅ Port 8080 processes killed"
else
    log "No processes found on port 8080"
fi

echo ""
echo "4. Checking for any Node.js processes..."
NODE_PROCESSES=$(pgrep -f "node.*dist/index.js" 2>/dev/null || true)
if [ -n "$NODE_PROCESSES" ]; then
    log "Found Node.js processes: $NODE_PROCESSES"
    log "Killing Node.js processes..."
    pkill -f "node.*dist/index.js" 2>/dev/null || true
    sleep 2
    log "✅ Node.js processes killed"
else
    log "No Node.js processes found"
fi

echo ""
echo "5. Checking PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    log "Current PM2 status:"
    pm2 status || true
    
    if pm2 describe $SERVICE_NAME >/dev/null 2>&1; then
        log "Stopping PM2 process: $SERVICE_NAME"
        pm2 stop $SERVICE_NAME
        pm2 delete $SERVICE_NAME
        log "✅ PM2 process cleaned up"
    else
        log "No PM2 process found for $SERVICE_NAME"
    fi
else
    log "PM2 not installed"
fi

echo ""
echo "6. Final verification..."
sleep 3

# Check port 8080 again
if lsof -ti:8080 >/dev/null 2>&1; then
    warn "Port 8080 is still in use!"
    lsof -i:8080
else
    log "✅ Port 8080 is now free"
fi

# Check for any remaining processes
REMAINING=$(pgrep -f "prmanager\|pr-manager" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    warn "Some processes still running: $REMAINING"
    ps aux | grep -E "prmanager|pr-manager" | grep -v grep
else
    log "✅ No remaining processes found"
fi

echo ""
echo "🎉 Cleanup completed!"
echo "You can now run the deployment script with PM2"