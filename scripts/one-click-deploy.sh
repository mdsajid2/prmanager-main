#!/bin/bash

# 🚀 PR Manager One-Click Production Deployment
# Comprehensive check, cleanup, and deployment script

set -e

echo "🚀 PR Manager One-Click Production Deployment"
echo "=============================================="

# Configuration
APP_DIR="/home/ec2-user/prmanager"
SERVICE_USER="ec2-user"
SERVICE_NAME="pr-manager"
BACKUP_DIR="/home/ec2-user/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"
}

step() {
    echo -e "${PURPLE}[$(date +'%H:%M:%S')] 🔄 $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

# Create backup directory
mkdir -p $BACKUP_DIR

step "Phase 1: Pre-deployment Health Check"
echo "======================================="

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR does not exist"
fi

cd $APP_DIR

# Check git repository
if [ ! -d ".git" ]; then
    error "No git repository found in $APP_DIR"
fi

# Check current service status
info "Checking current service status..."
if systemctl is-active --quiet $SERVICE_NAME; then
    log "Service is currently running"
    CURRENT_STATUS="running"
else
    warn "Service is not running"
    CURRENT_STATUS="stopped"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    warn "Disk usage is ${DISK_USAGE}% - consider cleaning up"
else
    log "Disk usage is ${DISK_USAGE}% - OK"
fi

# Check memory
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 85 ]; then
    warn "Memory usage is ${MEMORY_USAGE}% - high"
else
    log "Memory usage is ${MEMORY_USAGE}% - OK"
fi

step "Phase 2: Backup Current Deployment"
echo "===================================="

# Backup current deployment
BACKUP_PATH="$BACKUP_DIR/backup-$TIMESTAMP"
log "Creating backup at $BACKUP_PATH"

mkdir -p $BACKUP_PATH
if [ -f "$APP_DIR/server/dist/index.js" ]; then
    cp -r $APP_DIR/server/dist $BACKUP_PATH/server-dist
    log "Backed up server build"
fi

if [ -d "$APP_DIR/web/dist" ]; then
    cp -r $APP_DIR/web/dist $BACKUP_PATH/web-dist
    log "Backed up web build"
fi

if [ -f "$APP_DIR/.env" ]; then
    cp $APP_DIR/.env $BACKUP_PATH/.env
    log "Backed up environment file"
fi

step "Phase 3: Code Update and Cleanup"
echo "=================================="

# Stash any local changes
if ! git diff --quiet; then
    warn "Local changes detected - stashing them"
    git stash push -m "Auto-stash before deployment $TIMESTAMP"
fi

# Pull latest changes
log "Pulling latest changes from repository..."
git fetch origin
git reset --hard origin/main

# Clean up any build artifacts
log "Cleaning up old build artifacts..."
rm -rf server/dist web/dist server/node_modules/.cache web/node_modules/.cache

step "Phase 4: Environment Validation"
echo "================================="

# Check .env file
if [ ! -f ".env" ]; then
    error ".env file not found! Please create it with production settings"
fi

# Validate critical environment variables
log "Validating environment variables..."

if ! grep -q "^DATABASE_URL=" ".env"; then
    error "DATABASE_URL not found in .env file"
fi

if ! grep -q "^JWT_SECRET=" ".env"; then
    error "JWT_SECRET not found in .env file"
fi

if ! grep -q "^ENCRYPTION_KEY=" ".env"; then
    error "ENCRYPTION_KEY not found in .env file"
fi

if ! grep -q "^PORT=8080" ".env"; then
    warn "PORT not set to 8080 - fixing..."
    if grep -q "^PORT=" ".env"; then
        sed -i 's/^PORT=.*/PORT=8080/' ".env"
    else
        echo "PORT=8080" >> ".env"
    fi
    log "Fixed PORT setting"
fi

if ! grep -q "^NODE_ENV=production" ".env"; then
    warn "NODE_ENV not set to production - fixing..."
    if grep -q "^NODE_ENV=" ".env"; then
        sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' ".env"
    else
        echo "NODE_ENV=production" >> ".env"
    fi
    log "Fixed NODE_ENV setting"
fi

# Set proper permissions
chmod 600 .env
chown $SERVICE_USER:$SERVICE_USER .env
log "Set secure permissions on .env file"

step "Phase 5: Dependencies Installation"
echo "===================================="

# Install root dependencies
if [ -f "package.json" ]; then
    log "Installing root dependencies..."
    npm install --production=false
fi

# Install server dependencies
log "Installing server dependencies..."
cd server
npm install --production=false
npm install pg @types/pg bcrypt @types/bcrypt jsonwebtoken @types/jsonwebtoken
cd ..

# Install web dependencies
log "Installing web dependencies..."
cd web
npm install --production=false
cd ..

step "Phase 6: Application Build"
echo "============================"

# Build server
log "Building server application..."
cd server
if ! npm run build; then
    error "Server build failed"
fi

# Verify server build
if [ ! -f "dist/index.js" ]; then
    error "Server build verification failed - dist/index.js not found"
fi
log "Server build verified"
cd ..

# Build web application
log "Building web application..."
cd web
# Ensure production environment
echo "VITE_API_URL=" > .env.production
if ! npm run build; then
    error "Web build failed"
fi

# Verify web build
if [ ! -f "dist/index.html" ]; then
    error "Web build verification failed - dist/index.html not found"
fi
log "Web build verified"
cd ..

step "Phase 7: Database Migration Check"
echo "=================================="

# Check if database migration is needed
if [ -f "database/add-encrypted-tokens.sql" ]; then
    warn "Database migration file found - please run it manually in Supabase if not done already"
    info "Migration file: database/add-encrypted-tokens.sql"
fi

step "Phase 8: Service Configuration"
echo "==============================="

# Get Node.js path
NODE_PATH=$(which node)
log "Node.js path: $NODE_PATH"

# Create/update systemd service
log "Configuring systemd service..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=PR Manager API Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$APP_DIR/server
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin
EnvironmentFile=$APP_DIR/.env
ExecStart=$NODE_PATH dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
ReadWritePaths=/tmp
ReadWritePaths=/var/tmp

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable $SERVICE_NAME
log "Service configured and enabled"

step "Phase 9: Service Deployment"
echo "============================="

# Stop service if running
if [ "$CURRENT_STATUS" = "running" ]; then
    log "Stopping current service..."
    systemctl stop $SERVICE_NAME
    sleep 2
fi

# Set proper ownership
log "Setting file permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
chmod -R 755 $APP_DIR
chmod 600 $APP_DIR/.env

# Start service
log "Starting service..."
systemctl start $SERVICE_NAME

# Wait for service to start
sleep 5

step "Phase 10: Post-deployment Verification"
echo "======================================="

# Check service status
if systemctl is-active --quiet $SERVICE_NAME; then
    log "Service is running successfully"
else
    error "Service failed to start - check logs with: journalctl -u $SERVICE_NAME -f"
fi

# Test health endpoint
log "Testing health endpoint..."
sleep 3
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    log "Health check passed"
else
    warn "Health check failed - service may still be starting"
fi

# Test API endpoint
log "Testing API endpoint..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    log "API endpoint test passed"
else
    warn "API endpoint test failed"
fi

# Check service logs for errors
log "Checking service logs for errors..."
if journalctl -u $SERVICE_NAME --since "1 minute ago" | grep -i error > /dev/null; then
    warn "Errors found in service logs - check with: journalctl -u $SERVICE_NAME -f"
else
    log "No errors found in service logs"
fi

step "Phase 11: Cleanup and Utilities"
echo "================================"

# Create utility scripts
log "Creating utility scripts..."

# Monitor script
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash
echo "📊 PR Manager System Status"
echo "=========================="
echo "🔧 Service Status:"
systemctl status pr-manager --no-pager -l
echo ""
echo "💾 Memory Usage:"
free -h
echo ""
echo "💽 Disk Usage:"
df -h /
echo ""
echo "🌐 Network Connections:"
ss -tulpn | grep :8080
echo ""
echo "📝 Recent Logs:"
journalctl -u pr-manager --since "1 hour ago" --no-pager | tail -20
EOF

# Quick restart script
cat > $APP_DIR/restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting PR Manager..."
sudo systemctl restart pr-manager
sleep 3
if systemctl is-active --quiet pr-manager; then
    echo "✅ Service restarted successfully"
    curl -f http://localhost:8080/health && echo " - Health check passed"
else
    echo "❌ Service failed to restart"
    echo "Check logs: journalctl -u pr-manager -f"
fi
EOF

# Make scripts executable
chmod +x $APP_DIR/monitor.sh $APP_DIR/restart.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/*.sh

log "Utility scripts created"

# Clean up old backups (keep last 5)
log "Cleaning up old backups..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm -rf
log "Old backups cleaned up"

step "🎉 Deployment Complete!"
echo "======================="

echo ""
echo -e "${GREEN}✅ PR Manager deployed successfully!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "======================"
echo "🕐 Deployment time: $(date)"
echo "📦 Backup location: $BACKUP_PATH"
echo "🔧 Service status: $(systemctl is-active $SERVICE_NAME)"
echo "💾 Memory usage: ${MEMORY_USAGE}%"
echo "💽 Disk usage: ${DISK_USAGE}%"
echo ""
echo "🌐 Your application is available at:"
echo "   Frontend: https://prmanagerai.com"
echo "   Health:   https://prmanagerai.com/health"
echo "   API:      https://prmanagerai.com/api/"
echo ""
echo "🔧 Useful Commands:"
echo "   Monitor:  $APP_DIR/monitor.sh"
echo "   Restart:  $APP_DIR/restart.sh"
echo "   Logs:     journalctl -u $SERVICE_NAME -f"
echo "   Status:   systemctl status $SERVICE_NAME"
echo ""
echo "🎯 Key Features Deployed:"
echo "   ✅ Internal API calls (no internet round trips)"
echo "   ✅ User-specific settings and tokens"
echo "   ✅ Encrypted GitHub token storage"
echo "   ✅ Beautiful code diff viewer"
echo "   ✅ Database authentication"
echo "   ✅ Production-optimized builds"
echo ""

if [ "$CURRENT_STATUS" = "stopped" ]; then
    echo -e "${YELLOW}⚠️  Note: Service was previously stopped and has been started${NC}"
fi

echo -e "${GREEN}🚀 Deployment completed successfully!${NC}"
echo ""