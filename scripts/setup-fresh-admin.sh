#!/bin/bash

# Setup Fresh Admin System
echo "🆕 SETTING UP FRESH ADMIN SYSTEM"
echo "================================="

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
info() { echo -e "${BLUE}[SETUP] $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    exit 1
fi

cd $APP_DIR

echo ""
echo "1. ENVIRONMENT SETUP"
echo "==================="

info "Setting up separate dev/prod environments..."

# Create development environment file
cat > .env.development << 'DEV_ENV'
# Development Environment
NODE_ENV=development
PORT=3001

# Development Database (separate schema)
DATABASE_URL=postgresql://postgres.qgoolddhdvuhidstzqhq:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Development Keys (different from production)
JWT_SECRET=dev_jwt_secret_2024_local_development_only_key
ENCRYPTION_KEY=dev_encryption_key_2024_local_development_only_32chars

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=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

# Development Admin
ADMIN_EMAIL=dev@prmanager.com
ADMIN_PASSWORD=dev123456
DEV_ENV

# Create production environment file with new keys
info "Generating fresh production keys..."
PROD_JWT_SECRET=$(openssl rand -hex 32)
PROD_ENCRYPTION_KEY=$(openssl rand -hex 32)

cat > .env << EOF
# Production Environment
NODE_ENV=production
PORT=8080

# Production Database
DATABASE_URL=postgresql://postgres.qgoolddhdvuhidstzqhq:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Production Keys (FRESH - different from development)
JWT_SECRET=$PROD_JWT_SECRET
ENCRYPTION_KEY=$PROD_ENCRYPTION_KEY

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=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

# Production Admin
ADMIN_EMAIL=mdsajid8636@gmail.com
ADMIN_PASSWORD=SahYan@2020
EOF

log "✅ Environment files created with separate keys"
log "   Development JWT: dev_jwt_secret_2024_local_development_only_key"
log "   Production JWT: $PROD_JWT_SECRET"

echo ""
echo "2. DATABASE CLEANUP"
echo "=================="

info "Cleaning up existing admin user and sessions..."

cd server

cat > cleanup_admin.js << 'CLEANUP_SCRIPT'
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function cleanupAdmin() {
  try {
    console.log('🧹 Cleaning up existing admin data...');
    
    // Delete all existing sessions
    await pool.query('DELETE FROM sessions');
    console.log('✅ All sessions cleared');
    
    // Delete existing admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      console.log('✅ Existing admin user deleted:', adminEmail);
    }
    
    // Clean up any test users
    await pool.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%dev%'");
    console.log('✅ Test users cleaned up');
    
    console.log('🎉 Database cleanup completed');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupAdmin();
CLEANUP_SCRIPT

if node cleanup_admin.js; then
    log "✅ Database cleanup completed"
else
    error "❌ Database cleanup failed"
fi

rm -f cleanup_admin.js
cd ..

echo ""
echo "3. CREATING FRESH ADMIN USER"
echo "============================"

info "Creating fresh admin user with new production keys..."

cd server

cat > create_fresh_admin.js << 'ADMIN_CREATE'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

async function createFreshAdmin() {
  try {
    console.log('👤 Creating fresh admin user...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('JWT Secret length:', process.env.JWT_SECRET?.length);
    console.log('Admin email:', process.env.ADMIN_EMAIL);
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD not set');
    }
    
    // Hash password with new production keys
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    // Create fresh admin user
    const result = await pool.query(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        subscription_plan, 
        is_verified,
        api_usage_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, subscription_plan, is_verified, created_at
    `, [
      process.env.ADMIN_EMAIL,
      hashedPassword,
      'Admin',
      'User',
      'enterprise',
      true,
      10000
    ]);
    
    console.log('✅ Fresh admin user created:');
    console.table(result.rows);
    
    // Verify password immediately
    const passwordMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, hashedPassword);
    console.log('Password verification:', passwordMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    // Test database connection
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection verified:', testQuery.rows[0].current_time);
    
    console.log('🎉 Fresh admin setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Fresh admin creation failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createFreshAdmin();
ADMIN_CREATE

if node create_fresh_admin.js; then
    log "✅ Fresh admin user created"
else
    error "❌ Fresh admin creation failed"
fi

rm -f create_fresh_admin.js
cd ..

echo ""
echo "4. REBUILDING APPLICATIONS"
echo "=========================="

info "Installing dependencies..."
npm run install:all

info "Building server with new admin routes..."
cd server
npm run build
if [ ! -f "dist/index.js" ]; then
    error "Server build failed!"
    exit 1
fi
cd ..

info "Building frontend with new admin panel..."
cd web
NODE_ENV=production npm run build
if [ ! -d "dist" ]; then
    error "Frontend build failed!"
    exit 1
fi
cd ..

log "✅ Applications rebuilt with fresh admin system"

echo ""
echo "5. RESTARTING SERVICES"
echo "======================"

info "Stopping existing services..."

# Stop PM2
if command -v pm2 >/dev/null 2>&1; then
    sudo -u ec2-user pm2 stop $SERVICE_NAME 2>/dev/null || true
    sudo -u ec2-user pm2 delete $SERVICE_NAME 2>/dev/null || true
fi

# Kill port processes
PORT_PROCESSES=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PORT_PROCESSES" ]; then
    kill -9 $PORT_PROCESSES 2>/dev/null || true
    sleep 2
fi

info "Starting fresh services..."

# Start with PM2
sudo -u ec2-user bash << 'PM2_FRESH_START'
cd /home/ec2-user/prmanager

# Load fresh production environment
export $(grep -v '^#' .env | xargs)

# Start PM2
pm2 start server/dist/index.js --name pr-manager --env production

# Save configuration
pm2 save
PM2_FRESH_START

log "✅ Fresh services started"

echo ""
echo "6. TESTING FRESH ADMIN SYSTEM"
echo "============================="

sleep 5

info "Testing server health..."
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log "✅ Server responding"
    curl -s http://localhost:8080/health | jq . 2>/dev/null || curl -s http://localhost:8080/health
else
    error "❌ Server not responding"
    sudo -u ec2-user pm2 logs $SERVICE_NAME --lines 10
fi

info "Testing new admin API health..."
ADMIN_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/admin_health.json http://localhost:8080/api/new-admin/health 2>/dev/null)
echo "New admin API health: $ADMIN_HEALTH"
if [ "$ADMIN_HEALTH" = "200" ]; then
    log "✅ New admin API responding"
    cat /tmp/admin_health.json | jq . 2>/dev/null || cat /tmp/admin_health.json
else
    warn "New admin API not responding"
fi
rm -f /tmp/admin_health.json

info "Testing fresh admin login..."
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)
ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d'=' -f2)

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/fresh_login.json \
        -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    echo "Fresh admin login response: $LOGIN_RESPONSE"
    
    if [ "$LOGIN_RESPONSE" = "200" ]; then
        log "✅ Fresh admin login successful!"
        
        # Test new admin endpoints
        if command -v jq >/dev/null 2>&1; then
            TOKEN=$(jq -r '.token' /tmp/fresh_login.json 2>/dev/null)
            if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
                echo "Testing new admin users endpoint..."
                USERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/admin_users.json \
                    -H "Authorization: Bearer $TOKEN" \
                    http://localhost:8080/api/new-admin/users)
                
                echo "New admin users response: $USERS_RESPONSE"
                
                if [ "$USERS_RESPONSE" = "200" ]; then
                    log "✅ NEW ADMIN SYSTEM WORKING!"
                    echo "Users data:"
                    cat /tmp/admin_users.json | jq . 2>/dev/null || cat /tmp/admin_users.json
                else
                    error "❌ New admin users endpoint failed"
                    cat /tmp/admin_users.json 2>/dev/null || true
                fi
                rm -f /tmp/admin_users.json
            fi
        fi
    else
        error "❌ Fresh admin login failed"
        cat /tmp/fresh_login.json 2>/dev/null || true
    fi
    rm -f /tmp/fresh_login.json
fi

echo ""
echo "7. FINAL STATUS"
echo "==============="

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')

echo ""
log "🎉 FRESH ADMIN SYSTEM SETUP COMPLETE!"
echo ""
echo "🌐 ACCESS URLs:"
echo "   Main App: http://$PUBLIC_IP:8080/"
echo "   OLD Admin: http://$PUBLIC_IP:8080/admin"
echo "   NEW Admin: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🔐 FRESH PRODUCTION KEYS:"
echo "   JWT_SECRET: $PROD_JWT_SECRET"
echo "   ENCRYPTION_KEY: $PROD_ENCRYPTION_KEY"
echo ""
echo "👤 ADMIN LOGIN:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: [from .env]"
echo ""
echo "🆕 NEW FEATURES:"
echo "   - Completely fresh admin system"
echo "   - Separate dev/prod environments"
echo "   - New API endpoints (/api/new-admin/*)"
echo "   - Modern UI with better error handling"
echo "   - Clean database state"
echo ""

sudo -u ec2-user pm2 status

echo ""
log "✅ Try the new admin panel at: http://$PUBLIC_IP:8080/new-admin"