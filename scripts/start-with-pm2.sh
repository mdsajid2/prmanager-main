#!/bin/bash

# Start Server with PM2
echo "🚀 STARTING SERVER WITH PM2"
echo "==========================="

cd /home/ec2-user/prmanager

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[START] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. CLEAN UP ORPHANED PROCESSES"
echo "=============================="

info "Killing any orphaned node processes..."
pkill -f "dist/index.js" || true
sleep 2

info "Checking if port 8080 is free..."
if lsof -i:8080 >/dev/null 2>&1; then
    warn "Port 8080 still in use, force killing..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -i:8080 >/dev/null 2>&1; then
    error "❌ Cannot free port 8080"
    lsof -i:8080
    exit 1
else
    log "✅ Port 8080 is free"
fi

echo ""
echo "2. START WITH PM2"
echo "================="

info "Starting server with PM2..."

# Start the server with PM2
pm2 start server/dist/index.js --name pr-manager --env production

# Save PM2 configuration
pm2 save

sleep 3

echo ""
echo "3. VERIFY PM2 STATUS"
echo "==================="

info "PM2 status..."
pm2 status

info "Checking if process is running..."
if pm2 list | grep -q pr-manager; then
    log "✅ PM2 process is running"
else
    error "❌ PM2 process failed to start"
    pm2 logs pr-manager --lines 10
    exit 1
fi

echo ""
echo "4. TEST ENDPOINTS"
echo "================="

info "Testing health endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "✅ Server is responding"
    
    info "Testing authentication..."
    LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    echo "Login: $LOGIN"
    
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
                echo "Response:"
                cat /tmp/daily.json 2>/dev/null
            fi
        fi
    fi
else
    error "❌ Server not responding"
    echo "PM2 logs:"
    pm2 logs pr-manager --lines 20
fi

echo ""
echo "5. FINAL STATUS"
echo "==============="

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 STARTUP RESULT:"
echo "   Health: $HEALTH"
echo "   Login: $LOGIN"
echo "   Daily Usage: $DAILY"
echo ""

if [ "$HEALTH" = "200" ]; then
    log "🎉 SERVER STARTED SUCCESSFULLY!"
    echo ""
    echo "✅ PM2 managing the process"
    echo "✅ Server responding on port 8080"
    echo "✅ Ready for production traffic"
    echo ""
    echo "🌐 Your app is live at:"
    echo "   https://www.prmanagerai.com/"
    echo "   http://$PUBLIC_IP:8080/"
    echo ""
    echo "🔧 Management commands:"
    echo "   pm2 status"
    echo "   pm2 logs pr-manager"
    echo "   pm2 restart pr-manager"
else
    error "❌ SERVER STARTUP FAILED"
    echo ""
    echo "🔧 Debug commands:"
    echo "   pm2 logs pr-manager"
    echo "   pm2 status"
fi

pm2 status

# Cleanup
rm -f /tmp/*.json

log "✅ PM2 startup complete!"