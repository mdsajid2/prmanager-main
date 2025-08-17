#!/bin/bash

# Force Kill All Processes on Port 8080
echo "💀 FORCE KILLING ALL PROCESSES ON PORT 8080"
echo "==========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[KILL] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. AGGRESSIVE PROCESS KILLING"
echo "============================="

info "Killing ALL node processes..."
pkill -9 -f node || true

info "Killing ALL PM2 processes..."
pm2 kill || true

info "Killing processes by port 8080 (multiple attempts)..."
for i in {1..5}; do
    echo "Attempt $i:"
    PORT_PIDS=$(lsof -ti:8080 2>/dev/null)
    if [ -n "$PORT_PIDS" ]; then
        echo "Found PIDs: $PORT_PIDS"
        for PID in $PORT_PIDS; do
            echo "Force killing PID: $PID"
            kill -9 $PID 2>/dev/null || true
        done
        sleep 2
    else
        echo "No processes found on port 8080"
        break
    fi
done

info "Killing by process name..."
pkill -9 -f "dist/index.js" || true
pkill -9 -f "prmanager" || true

sleep 3

echo ""
echo "2. FINAL VERIFICATION"
echo "===================="

info "Checking if port 8080 is free..."
if lsof -i:8080 >/dev/null 2>&1; then
    error "❌ Port 8080 is STILL in use!"
    echo "Remaining processes:"
    lsof -i:8080
    
    # Last resort - kill by PID directly
    REMAINING_PIDS=$(lsof -ti:8080 2>/dev/null)
    if [ -n "$REMAINING_PIDS" ]; then
        warn "Using last resort - direct PID kill..."
        for PID in $REMAINING_PIDS; do
            echo "Force killing remaining PID: $PID"
            kill -9 $PID 2>/dev/null || true
        done
        sleep 2
    fi
    
    # Check one more time
    if lsof -i:8080 >/dev/null 2>&1; then
        error "❌ CANNOT FREE PORT 8080!"
        lsof -i:8080
        exit 1
    fi
fi

log "✅ Port 8080 is now completely free!"

echo ""
echo "3. STARTING FRESH SERVER"
echo "======================="

cd /home/ec2-user/prmanager

info "Starting fresh PM2 process on port 8080..."

# Ensure we're using the right environment
export NODE_ENV=production
export PORT=8080

# Start PM2 with explicit configuration
pm2 start server/dist/index.js \
    --name pr-manager \
    --env production \
    --max-memory-restart 1G \
    --time

# Save PM2 configuration
pm2 save

sleep 5

echo ""
echo "4. VERIFICATION"
echo "==============="

info "Checking PM2 status..."
pm2 status

info "Checking port 8080..."
if lsof -i:8080 >/dev/null 2>&1; then
    log "✅ Port 8080 is now in use by our server"
    lsof -i:8080
else
    error "❌ No process on port 8080 - server failed to start"
    echo "PM2 logs:"
    pm2 logs pr-manager --lines 10
    exit 1
fi

info "Testing server health..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health response: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "🎉 SERVER IS RUNNING ON PORT 8080!"
    
    # Test authentication
    info "Testing authentication..."
    LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    echo "Login test: $LOGIN"
    
    if [ "$LOGIN" = "200" ] && command -v jq >/dev/null 2>&1; then
        TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            info "Testing daily usage endpoint..."
            DAILY=$(curl -s -w "%{http_code}" -o /tmp/daily.json \
                -H "Authorization: Bearer $TOKEN" \
                http://localhost:8080/api/analyze/daily-usage)
            
            echo "Daily usage: $DAILY"
            
            if [ "$DAILY" = "200" ]; then
                log "🎉 ALL ENDPOINTS WORKING!"
            else
                warn "Daily usage endpoint issue"
                cat /tmp/daily.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Server health check failed"
    echo "Response:"
    cat /tmp/health.json 2>/dev/null
    echo "PM2 logs:"
    pm2 logs pr-manager --lines 20
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 FINAL RESULT:"
echo "   Health: $HEALTH"
echo "   Login: $LOGIN"
echo "   Daily Usage: $DAILY"
echo ""

if [ "$HEALTH" = "200" ]; then
    log "🎉 SUCCESS! SERVER RUNNING ON PORT 8080"
    echo ""
    echo "✅ Port 8080 conflict resolved"
    echo "✅ Server running properly"
    echo "✅ All processes killed and restarted"
    echo ""
    echo "🌐 ACCESS URLs:"
    echo "   Production: https://www.prmanagerai.com/"
    echo "   Direct: http://$PUBLIC_IP:8080/"
    echo "   Admin: http://$PUBLIC_IP:8080/admin"
else
    error "❌ SERVER STILL NOT WORKING"
    echo "Check PM2 logs: pm2 logs pr-manager"
fi

pm2 status

# Cleanup
rm -f /tmp/*.json

log "✅ Force kill and restart complete!"