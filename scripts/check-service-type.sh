#!/bin/bash

# Check What Service Management System is Running
echo "🔍 CHECKING SERVICE MANAGEMENT SYSTEM"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[CHECK] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. CHECKING PM2"
echo "==============="

info "PM2 status..."
if command -v pm2 >/dev/null 2>&1; then
    log "✅ PM2 is installed"
    pm2 status
    pm2 list
else
    warn "PM2 not found"
fi

echo ""
echo "2. CHECKING SYSTEMD SERVICES"
echo "============================"

info "Checking for pr-manager systemd service..."
if systemctl list-units --type=service | grep -q pr-manager; then
    log "✅ Found pr-manager systemd service"
    systemctl status pr-manager
else
    info "No pr-manager systemd service found"
fi

info "Checking for any node-related systemd services..."
systemctl list-units --type=service | grep -i node || echo "No node services found"

echo ""
echo "3. CHECKING RUNNING PROCESSES"
echo "============================"

info "All node processes..."
ps aux | grep node | grep -v grep

info "Processes on port 8080..."
lsof -i:8080 || echo "No processes on port 8080"

info "Process tree for port 8080..."
PORT_PIDS=$(lsof -ti:8080 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
    for PID in $PORT_PIDS; do
        echo "Process $PID details:"
        ps -fp $PID
        echo "Parent process:"
        ps -fp $(ps -o ppid= -p $PID | tr -d ' ') 2>/dev/null || echo "No parent found"
        echo "---"
    done
else
    echo "No processes found on port 8080"
fi

echo ""
echo "4. CHECKING AUTO-RESTART MECHANISMS"
echo "==================================="

info "Checking if there's an auto-restart mechanism..."

# Check for systemd service that might be restarting the process
if systemctl is-enabled pr-manager >/dev/null 2>&1; then
    warn "pr-manager systemd service is enabled (auto-restart)"
    systemctl status pr-manager
fi

# Check for PM2 startup
if pm2 startup 2>/dev/null | grep -q "already setup"; then
    warn "PM2 startup is configured (auto-restart)"
fi

# Check for cron jobs
info "Checking cron jobs..."
crontab -l 2>/dev/null | grep -i node || echo "No node-related cron jobs"

echo ""
echo "5. RECOMMENDATION"
echo "================="

echo ""
if systemctl is-active --quiet pr-manager 2>/dev/null; then
    log "🎯 SOLUTION: Use systemd to restart"
    echo "   sudo systemctl restart pr-manager"
    echo "   sudo systemctl status pr-manager"
elif pm2 list | grep -q pr-manager; then
    log "🎯 SOLUTION: Use PM2 to restart"
    echo "   pm2 restart pr-manager"
    echo "   pm2 status"
else
    warn "🤔 UNCLEAR: Multiple processes spawning"
    echo "   There might be an auto-restart mechanism"
    echo "   Need to identify what's spawning new processes"
fi

echo ""
log "✅ Service check complete!"