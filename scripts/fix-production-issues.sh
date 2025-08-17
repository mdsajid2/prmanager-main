#!/bin/bash

# Comprehensive Production Fix Script
echo "🔧 FIXING PRODUCTION ISSUES"
echo "==========================="

APP_DIR="/home/ec2-user/prmanager"
SERVICE_NAME="pr-manager"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[FIX] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    exit 1
fi

cd $APP_DIR

echo ""
echo "1. GENERATING NEW PRODUCTION KEYS"
echo "================================="

info "Generating secure production keys..."

# Generate new keys
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)

log "✅ New keys generated"

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
log "✅ Current .env backed up"

# Update .env with new keys
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env
sed -i "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$NEW_ENCRYPTION_KEY/" .env

# Ensure production settings
if grep -q "^NODE_ENV=" .env; then
    sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env
else
    echo "NODE_ENV=production" >> .env
fi

if grep -q "^PORT=" .env; then
    sed -i 's/^PORT=.*/PORT=8080/' .env
else
    echo "PORT=8080" >> .env
fi

log "✅ Production keys and settings updated"

echo ""
echo "2. FIXING FRONTEND API CONFIGURATION"
echo "===================================="

info "Updating frontend configuration for production..."

# Ensure web/.env.production is correct
cat > web/.env.production << 'FRONTEND_ENV'
# Production environment variables for frontend
VITE_API_URL=
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=PR Manager
FRONTEND_ENV

log "✅ Frontend .env.production updated"

echo ""
echo "3. REBUILDING APPLICATIONS"
echo "=========================="

info "Installing dependencies..."
npm run install:all

info "Building server..."
cd server
npm run build
if [ ! -f "dist/index.js" ]; then
    error "Server build failed!"
    exit 1
fi
cd ..

info "Building frontend with production settings..."
cd web
# Ensure we're using production environment
NODE_ENV=production npm run build
if [ ! -d "dist" ]; then
    error "Frontend build failed!"
    exit 1
fi
cd ..

log "✅ Applications rebuilt successfully"

echo ""
echo "4. VERIFYING BUILD CONFIGURATION"
echo "================================"

info "Checking for localhost references in frontend build..."
LOCALHOST_REFS=$(grep -r "localhost:3001" web/dist/ 2>/dev/null || true)
if [ -n "$LOCALHOST_REFS" ]; then
    warn "Found localhost references - this might be expected for development fallback"
    echo "$LOCALHOST_REFS" | head -3
else
    log "✅ No problematic localhost references found"
fi

echo ""
echo "5. CLEANING UP EXISTING PROCESSES"
echo "================================="

info "Stopping existing processes..."

# Stop PM2 processes
if command -v pm2 >/dev/null 2>&1; then
    sudo -u ec2-user pm2 stop $SERVICE_NAME 2>/dev/null || true
    sudo -u ec2-user pm2 delete $SERVICE_NAME 2>/dev/null || true
fi

# Kill any processes on port 8080
PORT_PROCESSES=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PORT_PROCESSES" ]; then
    log "Killing processes on port 8080..."
    kill -9 $PORT_PROCESSES 2>/dev/null || true
    sleep 2
fi

log "✅ Existing processes cleaned up"

echo ""
echo "6. SETTING UP DATABASE ADMIN USER"
echo "================================="

info "Setting up admin user in database..."

cd server

# Create admin setup script
cat > setup_admin_production.js << 'ADMIN_SETUP'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function setupAdmin() {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.log('❌ ADMIN_EMAIL or ADMIN_PASSWORD not set');
      return;
    }
    
    console.log('🔍 Setting up admin user:', process.env.ADMIN_EMAIL);
    
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    // Upsert admin user
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, subscription_plan, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        subscription_plan = EXCLUDED.subscription_plan,
        is_verified = EXCLUDED.is_verified,
        updated_at = CURRENT_TIMESTAMP
    `, [
      process.env.ADMIN_EMAIL,
      hashedPassword,
      'Admin',
      'User',
      'enterprise',
      true
    ]);
    
    console.log('✅ Admin user configured successfully');
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupAdmin();
ADMIN_SETUP

if node setup_admin_production.js; then
    log "✅ Admin user configured"
else
    error "❌ Admin setup failed"
fi

rm -f setup_admin_production.js
cd ..

echo ""
echo "7. STARTING PM2 SERVICE"
echo "======================="

info "Starting application with PM2..."

# Update ecosystem config
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'dist/index.js',
    cwd: '$APP_DIR/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF

# Create logs directory
mkdir -p logs
chown -R ec2-user:ec2-user logs

# Start with PM2 as ec2-user
sudo -u ec2-user bash << 'PM2_START'
cd /home/ec2-user/prmanager

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Start PM2 app
pm2 start ecosystem.config.js

# Save configuration
pm2 save
PM2_START

# Setup startup script
sudo -u ec2-user pm2 startup systemd -u ec2-user --hp /home/ec2-user > /tmp/pm2_startup.sh 2>&1 || true
if [ -f /tmp/pm2_startup.sh ]; then
    STARTUP_CMD=$(grep "sudo env PATH" /tmp/pm2_startup.sh | head -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval $STARTUP_CMD
    fi
    rm -f /tmp/pm2_startup.sh
fi

log "✅ PM2 service started"

echo ""
echo "8. TESTING DEPLOYMENT"
echo "===================="

sleep 5

info "Testing server health..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Server is responding"
    curl -s http://localhost:8080/health
else
    error "❌ Server not responding"
    sudo -u ec2-user pm2 logs $SERVICE_NAME --lines 10
fi

info "Testing admin login..."
if [ -f ".env" ]; then
    ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)
    ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d'=' -f2)
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_test.json \
            -X POST http://localhost:8080/api/auth/login \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
        
        if [ "$LOGIN_RESPONSE" = "200" ]; then
            log "✅ Admin login successful"
        else
            warn "Admin login failed (HTTP $LOGIN_RESPONSE)"
            cat /tmp/login_test.json 2>/dev/null || true
        fi
        rm -f /tmp/login_test.json
    fi
fi

echo ""
echo "9. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 PRODUCTION FIXES COMPLETED!"
echo ""
echo "🌐 YOUR APPLICATION:"
echo "   URL: http://$PUBLIC_IP:8080/"
echo "   Admin: http://$PUBLIC_IP:8080/admin"
echo "   Health: http://$PUBLIC_IP:8080/health"
echo ""
echo "🔐 NEW SECURITY KEYS:"
echo "   JWT_SECRET: $NEW_JWT_SECRET"
echo "   ENCRYPTION_KEY: $NEW_ENCRYPTION_KEY"
echo "   (These are now active in your .env file)"
echo ""
echo "🔧 MANAGEMENT COMMANDS:"
echo "   Status: pm2 status"
echo "   Logs: pm2 logs $SERVICE_NAME"
echo "   Restart: pm2 restart $SERVICE_NAME"
echo ""

# Final PM2 status
sudo -u ec2-user pm2 status

echo ""
log "✅ All fixes applied! Test your application now."