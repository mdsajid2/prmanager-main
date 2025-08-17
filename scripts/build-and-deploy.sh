#!/bin/bash

# PR Manager Build and Deploy Script
# This script only builds and deploys the application (no OS setup)

set -e  # Exit on any error

echo "🔨 PR Manager Build and Deploy Script"
echo "====================================="

# Configuration
APP_DIR="/home/ec2-user/prmanager"
SERVICE_USER="ec2-user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR does not exist. Please create it and clone your repository first."
fi

# Check if we're in a git repository
cd $APP_DIR
if [ ! -d ".git" ]; then
    error "No git repository found in $APP_DIR. Please clone your repository first."
fi

log "Starting PR Manager build and deployment..."

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    error "Node.js is not installed. Please install Node.js first."
fi

if ! command -v npm >/dev/null 2>&1; then
    error "npm is not installed. Please install npm first."
fi

log "Node.js version: $(node --version)"
log "npm version: $(npm --version)"

# Install dependencies and build
log "Installing dependencies..."
if ! npm run install:all; then
    error "Failed to install dependencies"
fi

log "Building server application..."
cd server
if ! npm run build; then
    error "Failed to build server application"
fi
cd ..

log "Building web application..."
cd web
if ! npm run build; then
    error "Failed to build web application"
fi
cd ..

# Verify builds completed successfully
if [ ! -f "$APP_DIR/server/dist/index.js" ]; then
    error "Server build failed - dist/index.js not found"
fi

if [ ! -d "$APP_DIR/web/dist" ]; then
    error "Web build failed - web/dist directory not found"
fi

log "✅ Both applications built successfully"

# Set up environment variables if they don't exist
log "Checking environment variables..."
if [ ! -f "$APP_DIR/.env" ]; then
    log "Creating default .env file..."
    cat > $APP_DIR/.env << EOF
# Production Environment Variables
# Note: NODE_ENV is set automatically by the runtime environment
PORT=3001

# AI Provider Configuration
AI_PROVIDER=mock
# OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here
# GEMINI_API_KEY=your_gemini_key_here

# GitHub Integration
# GITHUB_TOKEN=your_github_token_here

# Database configuration (using mock for development)
DATABASE_URL=postgresql://username:password@localhost:5432/prmanager

# Authentication
JWT_SECRET=$(openssl rand -base64 64)
EOF
    warn "Created default .env file. Please edit $APP_DIR/.env with your API keys"
else
    log "Environment file already exists"
fi

# Ensure JWT_SECRET exists in .env
if ! grep -q "JWT_SECRET" "$APP_DIR/.env"; then
    log "Adding JWT_SECRET to .env file..."
    echo "" >> $APP_DIR/.env
    echo "# Authentication" >> $APP_DIR/.env
    echo "JWT_SECRET=$(openssl rand -base64 64)" >> $APP_DIR/.env
fi

# Check if service user exists (ec2-user should already exist)
log "Checking service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    error "Service user $SERVICE_USER does not exist. Please check your system configuration."
else
    log "Service user $SERVICE_USER exists"
fi

# Set permissions
log "Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
chmod -R 755 $APP_DIR
# Ensure the .env file has proper permissions
chmod 600 $APP_DIR/.env 2>/dev/null || true

# Verify Node.js path
NODE_PATH=$(which node)
log "Node.js path: $NODE_PATH"

# Verify built application exists
if [ ! -f "$APP_DIR/server/dist/index.js" ]; then
    error "Built server application not found at $APP_DIR/server/dist/index.js"
fi

# Create or update systemd service
log "Creating/updating systemd service..."
cat > /etc/systemd/system/pr-manager.service << EOF
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
SyslogIdentifier=pr-manager

# Ensure service can access necessary directories
ReadWritePaths=$APP_DIR
ReadWritePaths=/tmp
ReadWritePaths=/var/tmp

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and restart service
log "Reloading systemd and restarting service..."
systemctl daemon-reload
systemctl enable pr-manager

# Stop service if running, then start it
if systemctl is-active --quiet pr-manager; then
    log "Stopping existing service..."
    systemctl stop pr-manager
fi

# Test the application manually first
log "Testing application manually..."
cd $APP_DIR/server
if timeout 10s $NODE_PATH dist/index.js > /tmp/pr-manager-test.log 2>&1 &
then
    TEST_PID=$!
    sleep 3
    if kill -0 $TEST_PID 2>/dev/null; then
        log "✅ Application starts successfully"
        kill $TEST_PID 2>/dev/null || true
    else
        warn "Application may have issues. Check test log:"
        cat /tmp/pr-manager-test.log
    fi
else
    warn "Could not test application startup"
fi

log "Starting PR Manager service..."
systemctl start pr-manager

# Check service status with detailed information
sleep 5
if systemctl is-active --quiet pr-manager; then
    log "✅ PR Manager service is running"
    log "Service status:"
    systemctl status pr-manager --no-pager -l
else
    error "❌ PR Manager service failed to start."
    echo ""
    echo "🔍 Debugging Information:"
    echo "========================"
    echo "Service status:"
    systemctl status pr-manager --no-pager -l || true
    echo ""
    echo "Recent logs:"
    journalctl -u pr-manager --no-pager -l --since "5 minutes ago" || true
    echo ""
    echo "Environment file:"
    ls -la $APP_DIR/.env || true
    echo ""
    echo "Built application:"
    ls -la $APP_DIR/server/dist/index.js || true
    echo ""
    echo "Node.js version and path:"
    echo "Node: $NODE_PATH"
    $NODE_PATH --version || true
    echo ""
    echo "Working directory contents:"
    ls -la $APP_DIR/server/ || true
    echo ""
    echo "🔧 To debug further, run:"
    echo "   journalctl -u pr-manager -f"
    echo "   systemctl status pr-manager"
    echo "   cd $APP_DIR/server && $NODE_PATH dist/index.js"
    exit 1
fi

# Create or update utility scripts
log "Creating utility scripts..."

# Update script
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating PR Manager..."

# Navigate to app directory
cd /home/ec2-user/prmanager

# Pull latest changes (you should do this manually before running this script)
# git pull origin main

# Install dependencies
npm run install:all

# Build applications
cd server && npm run build && cd ..
cd web && npm run build && cd ..

# Restart service
sudo systemctl restart pr-manager

# Check status
sleep 3
if systemctl is-active --quiet pr-manager; then
    echo "✅ Update completed successfully"
else
    echo "❌ Update failed. Check logs: journalctl -u pr-manager -f"
    exit 1
fi
EOF

# Monitor script
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash

echo "📊 PR Manager System Status"
echo "=========================="

# Service status
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
ss -tulpn | grep :3001

echo ""
echo "📝 Recent Logs:"
journalctl -u pr-manager --since "1 hour ago" --no-pager | tail -20
EOF

# Backup script
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ec2-user/backups/pr-manager"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "📦 Creating backup..."

# Backup application files
tar -czf $BACKUP_DIR/pr-manager_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    /home/ec2-user/prmanager

# Keep only last 7 backups
find $BACKUP_DIR -name "pr-manager_*.tar.gz" -mtime +7 -delete

echo "✅ Backup created: $BACKUP_DIR/pr-manager_$DATE.tar.gz"
EOF

# Make scripts executable
chmod +x $APP_DIR/update.sh
chmod +x $APP_DIR/monitor.sh
chmod +x $APP_DIR/backup.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/*.sh

# Final status check
log "Performing final status check..."
sleep 2

echo ""
echo "🎉 Build and Deployment Summary"
echo "==============================="
echo "✅ Dependencies installed"
echo "✅ Application built (server + web)"
echo "✅ Systemd service created and started"
echo "✅ Utility scripts created"

if systemctl is-active --quiet pr-manager; then
    echo "✅ PR Manager service is running on port 3001"
else
    echo "❌ PR Manager service is not running"
fi

echo ""
echo "📋 Important Files:"
echo "   Application: $APP_DIR"
echo "   Environment: $APP_DIR/.env"
echo "   Service: /etc/systemd/system/pr-manager.service"
echo ""
echo "🔧 Useful Commands:"
echo "   Update app: $APP_DIR/update.sh"
echo "   Monitor: $APP_DIR/monitor.sh"
echo "   Backup: $APP_DIR/backup.sh"
echo "   View logs: journalctl -u pr-manager -f"
echo "   Restart: sudo systemctl restart pr-manager"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Edit $APP_DIR/.env with your API keys"
echo "   2. Configure your web server (nginx/apache) to serve the app"
echo "   3. Test your application at http://localhost:3001"
echo ""
echo "🎉 Build and deployment completed successfully!"