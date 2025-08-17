#!/bin/bash

# Fix Port 8080 Conflict
echo "🔧 FIXING PORT 8080 CONFLICT"
echo "============================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[FIX] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. CHECKING WHAT'S USING PORT 8080"
echo "=================================="

info "Processes using port 8080..."
lsof -i:8080 || echo "No processes found using lsof"

info "Checking with netstat..."
netstat -tlnp | grep :8080 || echo "No processes found using netstat"

info "Checking all node processes..."
ps aux | grep node

echo ""
echo "2. KILLING ALL PROCESSES ON PORT 8080"
echo "====================================="

info "Killing processes on port 8080..."

# Kill processes using port 8080
PORT_PIDS=$(lsof -ti:8080 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
    echo "Found PIDs using port 8080: $PORT_PIDS"
    for PID in $PORT_PIDS; do
        echo "Killing PID: $PID"
        kill -9 $PID 2>/dev/null || true
    done
    log "✅ Killed processes on port 8080"
else
    log "No processes found on port 8080"
fi

# Kill all PM2 processes
info "Stopping all PM2 processes..."
pm2 kill

# Kill any remaining node processes
info "Killing any remaining node processes..."
pkill -f node || true

sleep 3

echo ""
echo "3. VERIFYING PORT IS FREE"
echo "========================"

info "Checking if port 8080 is now free..."
if lsof -i:8080 >/dev/null 2>&1; then
    error "❌ Port 8080 is still in use!"
    lsof -i:8080
    exit 1
else
    log "✅ Port 8080 is now free"
fi

echo ""
echo "4. STARTING FRESH SERVER"
echo "======================="

cd /home/ec2-user/prmanager

info "Starting server with PM2..."

# Start fresh PM2 process
pm2 start server/dist/index.js --name pr-manager --env production

# Save PM2 configuration
pm2 save

sleep 5

echo ""
echo "5. TESTING SERVER"
echo "================="

info "Testing server startup..."

# Check PM2 status
pm2 status

# Test health endpoint
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health_test.json http://localhost:8080/health 2>/dev/null)
echo "Health endpoint: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    log "✅ Server is running successfully!"
    
    # Test authentication
    info "Testing authentication..."
    LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login_test.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')
    
    echo "Login test: $LOGIN"
    
    if [ "$LOGIN" = "200" ]; then
        log "✅ Authentication working!"
        
        # Test daily usage endpoint
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(jq -r '.token' /tmp/login_test.json 2>/dev/null)
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                info "Testing daily usage endpoint..."
                DAILY_USAGE=$(curl -s -w "%{http_code}" -o /tmp/daily_test.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/analyze/daily-usage)
                
                echo "Daily usage: $DAILY_USAGE"
                
                if [ "$DAILY_USAGE" = "200" ]; then
                    log "✅ Daily usage endpoint working!"
                else
                    warn "Daily usage endpoint not working yet"
                    echo "Response:"
                    cat /tmp/daily_test.json 2>/dev/null
                fi
            fi
        fi
    else
        warn "Authentication test failed"
        cat /tmp/login_test.json 2>/dev/null
    fi
else
    error "❌ Server not responding"
    echo "PM2 logs:"
    pm2 logs pr-manager --lines 10
fi

echo ""
echo "6. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎯 SERVER STATUS:"
echo "   Health: $HEALTH"
echo "   Login: $LOGIN"
echo "   Daily Usage: $DAILY_USAGE"
echo ""

if [ "$HEALTH" = "200" ]; then
    log "🎉 SERVER IS RUNNING!"
    echo ""
    echo "✅ Port 8080 conflict resolved"
    echo "✅ Server started successfully"
    echo "✅ PM2 process running"
    echo ""
    echo "🌐 ACCESS URLs:"
    echo "   Main App: http://$PUBLIC_IP:8080/"
    echo "   Admin Panel: http://$PUBLIC_IP:8080/admin"
    echo "   Production: https://www.prmanagerai.com/"
    echo ""
    echo "🔧 MANAGEMENT:"
    echo "   Status: pm2 status"
    echo "   Logs: pm2 logs pr-manager"
    echo "   Restart: pm2 restart pr-manager"
else
    error "❌ SERVER STILL NOT WORKING"
    echo ""
    echo "Check PM2 logs: pm2 logs pr-manager"
    echo "Check processes: lsof -i:8080"
fi

pm2 status

# Cleanup
rm -f /tmp/*_test.json

log "✅ Port conflict fix complete!"