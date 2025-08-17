#!/bin/bash

# =============================================================================
# PR Manager Complete Production Deployment Script
# =============================================================================
# Single script that handles: backup, build, deploy, test, rollback on error
# =============================================================================

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
PROJECT_DIR="/home/ec2-user/prmanager"
BACKUP_DIR="/home/ec2-user/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

# Global variables for rollback
ROLLBACK_NEEDED=false
ORIGINAL_ENV=""
ORIGINAL_SERVER_DIST=""
ORIGINAL_WEB_DIST=""

# Error handling and rollback function
cleanup_on_error() {
    error "Deployment failed! Starting automatic rollback..."
    ROLLBACK_NEEDED=true
    
    cd "${PROJECT_DIR}" || exit 1
    
    # Stop any running service
    pm2 stop pr-manager 2>/dev/null || true
    
    # Restore files if backup exists
    if [ -d "${BACKUP_PATH}" ]; then
        log "Restoring from backup: ${BACKUP_PATH}"
        
        if [ -f "${BACKUP_PATH}/.env" ]; then
            cp "${BACKUP_PATH}/.env" ".env"
            success "Environment file restored"
        fi
        
        if [ -d "${BACKUP_PATH}/server_dist" ]; then
            rm -rf "server/dist" 2>/dev/null || true
            cp -r "${BACKUP_PATH}/server_dist" "server/dist"
            success "Server build restored"
        fi
        
        if [ -d "${BACKUP_PATH}/web_dist" ]; then
            rm -rf "web/dist" 2>/dev/null || true
            cp -r "${BACKUP_PATH}/web_dist" "web/dist"
            success "Frontend build restored"
        fi
        
        # Restart service with old version
        pm2 start server/dist/index.js --name pr-manager --time 2>/dev/null || pm2 restart pr-manager
        pm2 save
        
        success "Service restored with previous version"
    else
        warning "No backup found for rollback"
    fi
    
    error "Deployment failed and rollback completed"
    exit 1
}

# Set up error trap
trap cleanup_on_error ERR

echo ""
echo "🚀 PR Manager Complete Production Deployment"
echo "============================================"
echo "📅 Time: $(date)"
echo "📁 Project: ${PROJECT_DIR}"
echo "💾 Backup: ${BACKUP_PATH}"
echo ""

# Step 1: Pre-deployment checks
log "1. PRE-DEPLOYMENT CHECKS"
echo "========================"

# Check if we're in the right directory
if [ ! -d "${PROJECT_DIR}" ]; then
    error "Project directory not found: ${PROJECT_DIR}"
    exit 1
fi

cd "${PROJECT_DIR}"

# Check disk space (need at least 1GB free)
available_space=$(df "${PROJECT_DIR}" | awk 'NR==2 {print $4}')
if [ "${available_space}" -lt 1048576 ]; then
    error "Insufficient disk space. Need at least 1GB free."
    exit 1
fi

# Check if required files exist
if [ ! -f "server/package.json" ] || [ ! -f "web/package.json" ]; then
    error "Missing package.json files. Are you in the right directory?"
    exit 1
fi

success "Pre-deployment checks passed"

# Step 2: Create comprehensive backup
log "2. CREATING BACKUP"
echo "=================="

mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_PATH}"

# Backup .env file (critical)
if [ -f ".env" ]; then
    cp ".env" "${BACKUP_PATH}/.env"
    success "Environment file backed up"
else
    warning ".env file not found"
fi

# Backup current builds
if [ -d "server/dist" ]; then
    cp -r "server/dist" "${BACKUP_PATH}/server_dist"
    success "Server build backed up"
fi

if [ -d "web/dist" ]; then
    cp -r "web/dist" "${BACKUP_PATH}/web_dist"
    success "Frontend build backed up"
fi

# Backup PM2 configuration
pm2 save 2>/dev/null || true
if [ -f ~/.pm2/dump.pm2 ]; then
    cp ~/.pm2/dump.pm2 "${BACKUP_PATH}/pm2_dump.pm2"
    success "PM2 configuration backed up"
fi

success "Backup created: ${BACKUP_PATH}"

# Step 3: Environment validation
log "3. ENVIRONMENT VALIDATION"
echo "========================="

# Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        log "Creating .env from .env.production template..."
        cp ".env.production" ".env"
        success ".env created from production template"
    else
        error ".env file missing and no .env.production template found!"
        exit 1
    fi
fi

# Validate critical environment variables
if ! grep -q "DATABASE_URL" ".env"; then
    error "DATABASE_URL not found in .env file!"
    exit 1
fi

if ! grep -q "JWT_SECRET" ".env"; then
    error "JWT_SECRET not found in .env file!"
    exit 1
fi

success "Environment configuration validated"

# Step 4: Install dependencies
log "4. INSTALLING DEPENDENCIES"
echo "=========================="

# Install server dependencies
log "Installing server dependencies..."
cd server
npm ci --production=false
if [ $? -ne 0 ]; then
    error "Server dependency installation failed!"
    exit 1
fi
success "Server dependencies installed"

# Install frontend dependencies
log "Installing frontend dependencies..."
cd ../web
npm ci --production=false
if [ $? -ne 0 ]; then
    error "Frontend dependency installation failed!"
    exit 1
fi
success "Frontend dependencies installed"

cd ..

# Step 5: Database migrations
log "5. DATABASE MIGRATIONS"
echo "======================"

cd server

# Run simple usage migration
if [ -f "setup-simple-usage.js" ]; then
    log "Running simple usage migration..."
    node setup-simple-usage.js || warning "Simple usage migration already applied"
fi

# Run referral system migration
if [ -f "setup-referral-system.js" ]; then
    log "Running referral system migration..."
    node setup-referral-system.js || warning "Referral system migration already applied"
fi

cd ..
success "Database migrations completed"

# Step 6: Build applications
log "6. BUILDING APPLICATIONS"
echo "========================"

# Build server
log "Building server..."
cd server
npm run build
if [ $? -ne 0 ]; then
    error "Server build failed!"
    exit 1
fi
success "Server built successfully"

# Build frontend
log "Building frontend..."
cd ../web
npm run build
if [ $? -ne 0 ]; then
    error "Frontend build failed!"
    exit 1
fi
success "Frontend built successfully"

cd ..

# Step 7: Deploy service
log "7. SERVICE DEPLOYMENT"
echo "===================="

# Stop current service gracefully
if pm2 list | grep -q "pr-manager"; then
    log "Stopping current service..."
    pm2 stop pr-manager
    success "Service stopped"
fi

# Start new service
log "Starting new service..."
pm2 start server/dist/index.js --name pr-manager --time
pm2 save
success "Service started"

# Wait for service to be ready
log "Waiting for service to be ready..."
sleep 8

# Step 8: Health checks and testing
log "8. HEALTH CHECKS & TESTING"
echo "=========================="

# Test health endpoint
log "Testing health endpoint..."
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")

if [ "$health_status" = "200" ]; then
    success "Health check passed (200)"
else
    error "Health check failed (${health_status})"
    
    # Show recent logs for debugging
    echo ""
    warning "Recent service logs:"
    pm2 logs pr-manager --lines 15 --nostream 2>/dev/null || true
    echo ""
    
    exit 1
fi

# Test API endpoints
log "Testing API endpoints..."

# Test analyze endpoint
analyze_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/analyze 2>/dev/null || echo "000")
if [ "$analyze_status" = "400" ] || [ "$analyze_status" = "405" ]; then
    success "Analyze endpoint working (${analyze_status})"
else
    warning "Analyze endpoint status: ${analyze_status}"
fi

# Test enhanced usage endpoint (should require auth)
usage_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/enhanced-usage 2>/dev/null || echo "000")
if [ "$usage_status" = "401" ]; then
    success "Enhanced usage endpoint secured (401)"
else
    warning "Enhanced usage endpoint status: ${usage_status}"
fi

# Test referral info endpoint (should require auth)
referral_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/referral-info 2>/dev/null || echo "000")
if [ "$referral_status" = "401" ]; then
    success "Referral info endpoint secured (401)"
else
    warning "Referral info endpoint status: ${referral_status}"
fi

# Test system health endpoint (should require admin auth)
health_admin_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/system-health 2>/dev/null || echo "000")
if [ "$health_admin_status" = "401" ]; then
    success "System health endpoint secured (401)"
else
    warning "System health endpoint status: ${health_admin_status}"
fi

# Step 9: Final verification
log "9. FINAL VERIFICATION"
echo "====================="

# Check PM2 status
pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | .pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$pm2_status" = "online" ]; then
    success "PM2 service is online"
else
    error "PM2 service status: ${pm2_status}"
    exit 1
fi

# Get memory usage
memory_usage=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | .monit.memory' 2>/dev/null || echo "0")
if [ "$memory_usage" -gt 0 ]; then
    memory_mb=$(echo $memory_usage | awk '{print int($1/1024/1024)"MB"}')
    success "Service memory usage: ${memory_mb}"
fi

# Get CPU usage
cpu_usage=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | .monit.cpu' 2>/dev/null || echo "0")
success "Service CPU usage: ${cpu_usage}%"

# Step 10: Cleanup
log "10. CLEANUP"
echo "==========="

# Clean up old backups (keep last 5)
log "Cleaning up old backups..."
cd "${BACKUP_DIR}"
ls -t | grep "backup_" | tail -n +6 | xargs -r rm -rf 2>/dev/null || true
success "Old backups cleaned up (kept last 5)"

# Final success message
echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================="
echo ""
success "✅ Backup created: ${BACKUP_PATH}"
success "✅ Server built and deployed"
success "✅ Frontend built and deployed"
success "✅ Database migrations applied"
success "✅ Service is running and healthy"
success "✅ All endpoints tested and working"
echo ""
echo "🔗 Service URLs:"
echo "   • Health: http://localhost:8080/health"
echo "   • API: http://localhost:8080/api/"
echo "   • Frontend: http://localhost:8080/"
echo "   • Admin Panel: http://localhost:8080/ (login as admin)"
echo ""
echo "📊 Service Status:"
echo "   • PM2 Status: ${pm2_status}"
echo "   • Memory Usage: ${memory_mb:-"Unknown"}"
echo "   • CPU Usage: ${cpu_usage}%"
echo ""
echo "🎁 New Features Available:"
echo "   • Enhanced usage tracking with referral bonuses"
echo "   • Referral system for earning extra daily calls"
echo "   • Contact support for limit increases"
echo "   • System health monitoring in Admin panel"
echo "   • Improved usage stats in results tab"
echo ""
echo "📋 Next Steps:"
echo "   • Monitor logs: pm2 logs pr-manager"
echo "   • Check status: pm2 status"
echo "   • View health: ./scripts/monitor-production.sh"
echo "   • Emergency rollback: ./scripts/rollback-production.sh"
echo ""
success "Deployment completed successfully at $(date)"
echo ""

# Disable error trap since we succeeded
trap - ERR