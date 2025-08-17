#!/bin/bash

# Simple Service Restart
echo "🔄 SIMPLE SERVICE RESTART"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[RESTART] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. IDENTIFY SERVICE TYPE"
echo "======================="

# Check what's managing the service
if systemctl is-active --quiet pr-manager 2>/dev/null; then
    SERVICE_TYPE="systemd"
    log "Using systemd service"
elif pm2 list 2>/dev/null | grep -q pr-manager; then
    SERVICE_TYPE="pm2"
    log "Using PM2"
else
    SERVICE_TYPE="manual"
    warn "No service manager detected - will handle manually"
fi

echo ""
echo "2. RESTART SERVICE"
echo "=================="

case $SERVICE_TYPE in
    "systemd")
        info "Restarting systemd service..."
        systemctl restart pr-manager
        sleep 3
        systemctl status pr-manager
        ;;
    "pm2")
        info "Restarting PM2 service..."
        pm2 restart pr-manager
        sleep 3
        pm2 status
        ;;
    "manual")
        info "Manual restart - killing processes and starting fresh..."
        # Kill existing processes
        pkill -f "dist/index.js" || true
        sleep 2
        
        # Start fresh
        cd /home/ec2-user/prmanager
        nohup node server/dist/index.js > server.log 2>&1 &
        sleep 3
        ;;
esac

echo ""
echo "3. VERIFY RESTART"
echo "================="

info "Checking port 8080..."
if lsof -i:8080 >/dev/null 2>&1; then
    log "✅ Process running on port 8080"
    lsof -i:8080
else
    error "❌ No process on port 8080"
    exit 1
fi

info "Testing health endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "✅ Server is responding"
    
    # Test the problematic endpoint
    info "Testing daily usage endpoint..."
    LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    if [ "$LOGIN" = "200" ] && command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            DAILY=$(curl -s -w "%{http_code}" -o /tmp/daily.json \
                -H "Authorization: Bearer $TOKEN" \
                http://localhost:8080/api/analyze/daily-usage)
            
            echo "Daily usage: $DAILY"
            
            if [ "$DAILY" = "200" ]; then
                log "🎉 ALL ENDPOINTS WORKING!"
            else
                warn "Daily usage endpoint still has issues"
                cat /tmp/daily.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Server not responding"
    cat /tmp/health.json 2>/dev/null
fi

echo ""
echo "4. FINAL STATUS"
echo "==============="

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 RESTART RESULT:"
echo "   Service Type: $SERVICE_TYPE"
echo "   Health: $HEALTH"
echo "   Daily Usage: $DAILY"
echo ""

if [ "$HEALTH" = "200" ]; then
    log "🎉 SERVICE RESTARTED SUCCESSFULLY!"
    echo ""
    echo "🌐 Your app should work at:"
    echo "   https://www.prmanagerai.com/"
    echo "   http://$PUBLIC_IP:8080/"
else
    error "❌ SERVICE RESTART FAILED"
    echo "Check logs based on service type:"
    case $SERVICE_TYPE in
        "systemd") echo "   journalctl -u pr-manager -f" ;;
        "pm2") echo "   pm2 logs pr-manager" ;;
        "manual") echo "   tail -f /home/ec2-user/prmanager/server.log" ;;
    esac
fi

# Cleanup
rm -f /tmp/*.json

log "✅ Simple restart complete!"