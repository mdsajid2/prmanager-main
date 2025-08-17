#!/bin/bash

# Rebuild and Restart Existing Process
echo "🔄 REBUILD AND RESTART"
echo "====================="

cd /home/ec2-user/prmanager

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
echo "1. REBUILD SERVER"
echo "================="

info "Rebuilding server with all routes..."
cd server
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server rebuilt"
cd ..

echo ""
echo "2. FIND AND RESTART EXISTING PROCESS"
echo "===================================="

info "Finding process on port 8080..."
PORT_PID=$(lsof -ti:8080 2>/dev/null)

if [ -n "$PORT_PID" ]; then
    log "Found process on port 8080: $PORT_PID"
    
    info "Killing existing process..."
    kill -9 $PORT_PID
    sleep 2
    
    info "Starting fresh process..."
    nohup node server/dist/index.js > server.log 2>&1 &
    NEW_PID=$!
    
    log "Started new process: $NEW_PID"
    sleep 3
    
    # Register with PM2 for management
    info "Registering with PM2..."
    pm2 start server/dist/index.js --name pr-manager || true
    pm2 save
    
else
    info "No process on port 8080, starting fresh..."
    pm2 start server/dist/index.js --name pr-manager
    pm2 save
fi

echo ""
echo "3. TEST ENDPOINTS"
echo "================="

sleep 5

info "Testing health..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "✅ Server responding"
    
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
                log "🎉 DAILY USAGE ENDPOINT WORKING!"
            else
                warn "Daily usage still not working"
                echo "Response:"
                cat /tmp/daily.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Server not responding"
    echo "Checking logs..."
    tail -20 server.log 2>/dev/null || pm2 logs pr-manager --lines 20
fi

echo ""
echo "4. FINAL STATUS"
echo "==============="

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 RESULT:"
echo "   Health: $HEALTH"
echo "   Daily Usage: $DAILY"
echo ""

if [ "$HEALTH" = "200" ] && [ "$DAILY" = "200" ]; then
    log "🎉 SUCCESS!"
    echo ""
    echo "✅ Server rebuilt and restarted"
    echo "✅ All endpoints working"
    echo ""
    echo "🌐 Your app should work at:"
    echo "   https://www.prmanagerai.com/"
else
    error "❌ ISSUES REMAIN"
    echo "Check server logs for details"
fi

# Show what's running
info "Current processes on port 8080..."
lsof -i:8080 || echo "No processes"

pm2 status 2>/dev/null || echo "PM2 not managing processes"

# Cleanup
rm -f /tmp/*.json

log "✅ Rebuild and restart complete!"