#!/bin/bash

# Final Fix Script - Resolve Port 8080 Issue
echo "🔧 FINAL FIX - RESOLVING PORT 8080 ISSUE"
echo "========================================"

APP_DIR="/home/ec2-user/prmanager"

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

cd $APP_DIR

echo ""
echo "1. KILLING ALL NODE PROCESSES"
echo "============================="

info "Stopping all Node.js processes..."
pkill -f node || true
pkill -f pm2 || true

# Kill specific ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

sleep 3

info "Cleaning PM2..."
pm2 kill || true
pm2 delete all 2>/dev/null || true

log "✅ All processes stopped"

echo ""
echo "2. CHECKING CURRENT CODE"
echo "========================"

info "Checking if new admin routes exist in server code..."
if grep -r "new-admin" server/src/ >/dev/null 2>&1; then
    log "✅ New admin routes found in source code"
else
    error "❌ New admin routes not found in source code"
    echo "Pulling latest code..."
    git pull origin main
fi

echo ""
echo "3. REBUILDING EVERYTHING FROM SCRATCH"
echo "====================================="

info "Installing dependencies..."
npm run install:all

info "Building server..."
cd server
rm -rf dist
npm run build

if [ ! -f "dist/index.js" ]; then
    error "❌ Server build failed!"
    exit 1
fi

log "✅ Server built successfully"
cd ..

info "Building frontend..."
cd web
rm -rf dist
npm run build

if [ ! -d "dist" ]; then
    error "❌ Frontend build failed!"
    exit 1
fi

log "✅ Frontend built successfully"
cd ..

echo ""
echo "4. CONFIGURING ENVIRONMENT FOR PRODUCTION"
echo "=========================================="

info "Setting up production environment..."

# Ensure correct environment variables
cat > .env << 'PROD_ENV'
# Production Environment
NODE_ENV=production
PORT=8080

# Database configuration
DATABASE_URL=postgresql://postgres.qgoolddhdvuhidstzqhq:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Authentication - Production Keys
JWT_SECRET=pr_mgr_2024_k9x7m3n8q2w5e1r6t9y4u8i5o0p3a7s2d6f9g1h4j7k0l3z8x5c2v7b4n1m9q6w3e8r5t2y7u
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=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

# Admin Access
ADMIN_EMAIL=mdsajid8636@gmail.com
ADMIN_PASSWORD=SahYan@2020
PROD_ENV

log "✅ Production environment configured"

echo ""
echo "5. STARTING PRODUCTION SERVER"
echo "============================="

info "Starting server with PM2..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'pr-manager',
    script: './server/dist/index.js',
    cwd: '/home/ec2-user/prmanager',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true
  }]
};
ECOSYSTEM

# Create logs directory
mkdir -p logs

# Start PM2
pm2 start ecosystem.config.js
pm2 save

# Setup startup
pm2 startup systemd -u ec2-user --hp /home/ec2-user > /tmp/pm2_startup.sh 2>&1 || true
if [ -f /tmp/pm2_startup.sh ]; then
    STARTUP_CMD=$(grep "sudo env PATH" /tmp/pm2_startup.sh | head -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval $STARTUP_CMD
    fi
    rm -f /tmp/pm2_startup.sh
fi

sleep 5

log "✅ PM2 started"

echo ""
echo "6. COMPREHENSIVE TESTING"
echo "======================="

info "Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json http://localhost:8080/health 2>/dev/null)
echo "Health response: $HEALTH_RESPONSE"

if [ "$HEALTH_RESPONSE" != "200" ]; then
    error "❌ Server not responding"
    pm2 logs pr-manager --lines 20
    exit 1
fi

log "✅ Server is responding"

info "Testing new admin health..."
ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/admin_health.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin health: $ADMIN_HEALTH"

if [ "$ADMIN_HEALTH" != "200" ]; then
    error "❌ New admin API not responding"
    echo "Response:"
    cat /tmp/admin_health.json 2>/dev/null
    echo "Server logs:"
    pm2 logs pr-manager --lines 20
    exit 1
fi

log "✅ New admin API is responding"

info "Testing admin authentication..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login.json \
    -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"mdsajid8636@gmail.com","password":"SahYan@2020"}')

echo "Login response: $LOGIN_RESPONSE"

if [ "$LOGIN_RESPONSE" != "200" ]; then
    error "❌ Admin login failed"
    cat /tmp/login.json 2>/dev/null
    exit 1
fi

log "✅ Admin login successful"

info "Testing new admin users endpoint..."
if command -v jq >/dev/null 2>&1; then
    TOKEN=$(jq -r '.token' /tmp/login.json 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/users.json \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/new-admin/users)
        
        echo "Users endpoint response: $USERS_RESPONSE"
        
        if [ "$USERS_RESPONSE" = "200" ]; then
            log "✅ NEW ADMIN API FULLY WORKING!"
            echo "Users found: $(cat /tmp/users.json | jq length 2>/dev/null || echo 'N/A')"
        else
            error "❌ New admin users endpoint failed"
            cat /tmp/users.json 2>/dev/null
            pm2 logs pr-manager --lines 10
            exit 1
        fi
    fi
fi

echo ""
echo "7. FINAL VERIFICATION"
echo "===================="

info "Checking what's running on port 8080..."
lsof -i:8080

info "PM2 status..."
pm2 status

echo ""
echo "8. SUCCESS!"
echo "==========="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 PRODUCTION SERVER IS NOW WORKING!"
echo ""
echo "✅ Server running on port 8080"
echo "✅ New admin API working"
echo "✅ Authentication working"
echo "✅ All tests passed"
echo ""
echo "🌐 ACCESS URLs:"
echo "   Production App: http://$PUBLIC_IP:8080/"
echo "   Production Admin: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🔧 CloudFront should now work perfectly!"
echo ""
echo "👤 Admin Login:"
echo "   Email: mdsajid8636@gmail.com"
echo "   Password: SahYan@2020"
echo ""

# Cleanup
rm -f /tmp/health.json /tmp/admin_health.json /tmp/login.json /tmp/users.json

log "✅ Setup complete! Try accessing the new admin panel now."