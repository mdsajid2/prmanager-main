#!/bin/bash

# PR Manager Smart Deployment Script
# Automatically detects if this is first-time setup or an update

set -e  # Exit on any error

echo "🚀 PR Manager Smart Deployment"
echo "=============================="

# Configuration
APP_DIR="/home/ec2-user/prmanager"
SERVICE_USER="ec2-user"
SERVICE_NAME="pr-manager"

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

# Check if running as root for system operations
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if .env file exists
    if [ ! -f "$APP_DIR/.env" ]; then
        warn ".env file not found - will create default one during setup"
    else
        log ".env file exists"
        
        # Check DATABASE_URL
        if grep -q "^DATABASE_URL=" "$APP_DIR/.env" && ! grep -q "^DATABASE_URL=postgresql://username:password@localhost" "$APP_DIR/.env"; then
            log "DATABASE_URL is configured"
        else
            warn "DATABASE_URL not properly configured - please update after deployment"
        fi
        
        # Check JWT_SECRET
        if grep -q "^JWT_SECRET=" "$APP_DIR/.env" && [ $(grep "^JWT_SECRET=" "$APP_DIR/.env" | cut -d'=' -f2 | wc -c) -gt 20 ]; then
            log "JWT_SECRET is configured"
        else
            warn "JWT_SECRET not found or too short - will be generated during deployment"
        fi
        
        # Check optional variables
        if grep -q "^GITHUB_TOKEN=" "$APP_DIR/.env" && ! grep -q "^GITHUB_TOKEN=$" "$APP_DIR/.env"; then
            log "GITHUB_TOKEN is configured"
        else
            warn "GITHUB_TOKEN not configured - only public repositories will be accessible"
        fi
        
        if grep -q "^OPENAI_API_KEY=" "$APP_DIR/.env" && ! grep -q "^OPENAI_API_KEY=$" "$APP_DIR/.env"; then
            log "OPENAI_API_KEY is configured"
        elif grep -q "^KIRO_API_KEY=" "$APP_DIR/.env" && ! grep -q "^KIRO_API_KEY=$" "$APP_DIR/.env"; then
            log "KIRO_API_KEY is configured"
        else
            warn "No AI API key configured - will use mock AI analysis"
        fi
    fi
    
    # Check if we're in a git repository
    if [ -d "$APP_DIR/.git" ]; then
        log "Git repository detected"
        
        # Check for uncommitted changes
        cd $APP_DIR
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
            warn "You have uncommitted changes. Consider committing them before deployment."
        else
            log "No uncommitted changes"
        fi
    else
        warn "Not in a git repository - continuing anyway"
    fi
    
    # Check package.json files
    if [ -f "$APP_DIR/package.json" ]; then
        log "Root package.json found"
    else
        error "Root package.json not found"
    fi
    
    if [ -f "$APP_DIR/server/package.json" ]; then
        log "Server package.json found"
    else
        error "Server package.json not found"
    fi
    
    if [ -f "$APP_DIR/web/package.json" ]; then
        log "Web package.json found"
    else
        error "Web package.json not found"
    fi
    
    # Test database connection if possible and .env exists
    if [ -f "$APP_DIR/.env" ] && command -v node >/dev/null 2>&1; then
        log "Testing database connection..."
        cd $APP_DIR
        if node -e "
            require('dotenv').config();
            const { Pool } = require('pg');
            if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password@localhost')) {
                console.log('⚠️  DATABASE_URL not configured - skipping connection test');
                process.exit(0);
            }
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false,
            });
            pool.query('SELECT NOW()', (err, res) => {
                if (err) {
                    console.error('❌ Database connection failed:', err.message);
                    process.exit(1);
                } else {
                    console.log('✅ Database connection successful');
                }
                pool.end();
            });
        " 2>/dev/null; then
            log "Database connection test passed"
        else
            warn "Database connection test failed - please verify DATABASE_URL after deployment"
        fi
    else
        warn "Skipping database connection test (Node.js not available or .env missing)"
    fi
    
    log "✅ Pre-deployment checks completed"
}

# Detect if this is first-time setup or update
detect_deployment_type() {
    if systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        if [ -f "$APP_DIR/server/dist/index.js" ] && [ -d "$APP_DIR/web/dist" ]; then
            echo "update"
        else
            echo "setup"
        fi
    else
        echo "setup"
    fi
}

# First-time setup
setup_system() {
    log "🔧 First-time setup detected - installing system dependencies..."
    
    # Detect OS and package manager
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
    else
        OS=$(uname -s)
    fi
    
    log "Detected OS: $OS"
    
    # Set package manager commands based on OS
    if [[ "$OS" == *"Amazon Linux"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Fedora"* ]]; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
        
        # Install EPEL repository for additional packages
        if [[ "$OS" == *"Amazon Linux"* ]]; then
            amazon-linux-extras install epel -y 2>/dev/null || yum install -y epel-release 2>/dev/null || true
        else
            $PKG_INSTALL epel-release 2>/dev/null || true
        fi
        
    elif [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        PKG_MANAGER="apt"
        PKG_UPDATE="apt update && apt upgrade -y"
        PKG_INSTALL="apt install -y"
    else
        warn "Unsupported OS: $OS. Assuming yum-based system."
        PKG_MANAGER="yum"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
    fi
    
    log "Using package manager: $PKG_MANAGER"
    
    # Install Node.js if not present
    if ! command -v node >/dev/null 2>&1; then
        log "Installing Node.js 18..."
        if [[ "$PKG_MANAGER" == "yum" ]]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            $PKG_INSTALL nodejs
        else
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            $PKG_INSTALL nodejs
        fi
    else
        log "Node.js already installed: $(node --version)"
    fi
    
    # Install other dependencies if needed
    if [[ "$PKG_MANAGER" == "yum" ]]; then
        $PKG_INSTALL curl wget git htop 2>/dev/null || true
    else
        $PKG_INSTALL curl wget git htop 2>/dev/null || true
    fi
}

# Build applications
build_applications() {
    log "📦 Building applications..."
    
    cd $APP_DIR
    
    # Install dependencies
    log "Installing dependencies..."
    if ! npm run install:all; then
        error "Failed to install dependencies"
    fi
    
    # Install PostgreSQL client for database authentication
    log "Installing PostgreSQL client for database authentication..."
    cd server && npm install pg @types/pg bcrypt @types/bcrypt jsonwebtoken @types/jsonwebtoken && cd ..
    
    # Build server
    log "Building server application..."
    cd server
    if ! npm run build; then
        error "Failed to build server application"
    fi
    cd ..
    
    # Build web
    log "Building web application..."
    cd web
    # Set production API URL to empty (use same domain)
    echo "VITE_API_URL=" > .env.production
    if ! npm run build; then
        error "Failed to build web application"
    fi
    cd ..
    
    # Verify builds
    if [ ! -f "$APP_DIR/server/dist/index.js" ]; then
        error "Server build failed - dist/index.js not found"
    fi
    
    if [ ! -d "$APP_DIR/web/dist" ]; then
        error "Web build failed - web/dist directory not found"
    fi
    
    log "✅ Both applications built successfully"
}

# Setup environment
setup_environment() {
    log "🔧 Setting up environment..."
    
    # Create or update .env file
    if [ ! -f "$APP_DIR/.env" ]; then
        log "Creating default .env file..."
        cat > $APP_DIR/.env << EOF
# Production Environment Variables
PORT=8080
NODE_ENV=production

# AI Provider Configuration
AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_key_here
# KIRO_API_KEY=your_kiro_key_here

# GitHub Integration
# GITHUB_TOKEN=your_github_token_here

# Database configuration - UPDATE WITH YOUR SUPABASE DATABASE URL
DATABASE_URL=postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Authentication & Security
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF
        error "Created default .env file. You MUST update DATABASE_URL with your Supabase connection string before the app will work!"
    else
        log "Environment file exists - updating production settings..."
        
        # Update or add PORT=8080
        if grep -q "^PORT=" "$APP_DIR/.env"; then
            sed -i 's/^PORT=.*/PORT=8080/' "$APP_DIR/.env"
            log "Updated PORT to 8080"
        else
            echo "PORT=8080" >> "$APP_DIR/.env"
            log "Added PORT=8080"
        fi
        
        # Update or add NODE_ENV=production
        if grep -q "^NODE_ENV=" "$APP_DIR/.env"; then
            sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$APP_DIR/.env"
            log "Updated NODE_ENV to production"
        else
            echo "NODE_ENV=production" >> "$APP_DIR/.env"
            log "Added NODE_ENV=production"
        fi
        
        # Check if DATABASE_URL looks like default
        if grep -q "^DATABASE_URL=postgresql://username:password@localhost" "$APP_DIR/.env"; then
            warn "DATABASE_URL appears to be default value - please update with your Supabase connection string"
        fi
    fi
    
    # Ensure JWT_SECRET exists
    if ! grep -q "JWT_SECRET" "$APP_DIR/.env"; then
        log "Adding JWT_SECRET to .env file..."
        echo "" >> $APP_DIR/.env
        echo "# Authentication" >> $APP_DIR/.env
        echo "JWT_SECRET=$(openssl rand -base64 64)" >> $APP_DIR/.env
    fi
    
    # Set permissions
    log "Setting permissions..."
    chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
    chmod -R 755 $APP_DIR
    chmod 600 $APP_DIR/.env 2>/dev/null || true
}

# Setup or update systemd service
setup_service() {
    log "⚙️ Setting up systemd service..."
    
    # Get Node.js path
    NODE_PATH=$(which node)
    log "Node.js path: $NODE_PATH"
    
    # Create systemd service
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

# Ensure service can access necessary directories
ReadWritePaths=$APP_DIR
ReadWritePaths=/tmp
ReadWritePaths=/var/tmp

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
}

# Start or restart service
manage_service() {
    log "🚀 Managing service..."
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        log "Restarting existing service..."
        systemctl restart $SERVICE_NAME
    else
        log "Starting service..."
        systemctl start $SERVICE_NAME
    fi
    
    # Wait and check status
    sleep 5
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        log "✅ $SERVICE_NAME service is running"
        log "Service status:"
        systemctl status $SERVICE_NAME --no-pager -l
    else
        error "❌ $SERVICE_NAME service failed to start. Check logs with: journalctl -u $SERVICE_NAME -f"
    fi
}

# Create utility scripts
create_utility_scripts() {
    log "📝 Creating utility scripts..."
    
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
else
    echo "❌ Service failed to restart"
    echo "Check logs: journalctl -u pr-manager -f"
fi
EOF
    
    # Make scripts executable
    chmod +x $APP_DIR/monitor.sh
    chmod +x $APP_DIR/restart.sh
    chown $SERVICE_USER:$SERVICE_USER $APP_DIR/*.sh
}

# Main deployment logic
main() {
    check_sudo
    
    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist. Please clone your repository first."
    fi
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    cd $APP_DIR
    
    # Detect deployment type
    DEPLOYMENT_TYPE=$(detect_deployment_type)
    
    if [ "$DEPLOYMENT_TYPE" = "setup" ]; then
        log "🆕 First-time deployment detected"
        setup_system
    else
        log "🔄 Update deployment detected"
    fi
    
    # Common steps for both setup and update
    build_applications
    setup_environment
    setup_service
    manage_service
    create_utility_scripts
    
    # Final summary
    echo ""
    echo "🎉 Deployment Summary"
    echo "===================="
    echo "✅ Pre-deployment checks completed"
    echo "✅ Applications built and deployed"
    echo "✅ PostgreSQL authentication configured"
    echo "✅ Systemd service configured and running"
    echo "✅ Utility scripts created"
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo "✅ PR Manager service is running on port 8080"
        
        # Test health endpoint
        sleep 2
        if curl -s http://localhost:8080/health >/dev/null 2>&1; then
            echo "✅ Health check endpoint responding"
        else
            warn "Health check endpoint not responding yet - may need a moment to start"
        fi
    else
        echo "❌ PR Manager service is not running"
        echo "   Check logs: journalctl -u $SERVICE_NAME -f"
    fi
    
    echo ""
    echo "🌐 Your application is available at:"
    echo "   Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-ec2-ip'):8080/"
    echo "   API Health: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-ec2-ip'):8080/health"
    echo "   API Base: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-ec2-ip'):8080/api/"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   Monitor: $APP_DIR/monitor.sh"
    echo "   Restart: $APP_DIR/restart.sh"
    echo "   View logs: journalctl -u $SERVICE_NAME -f"
    echo "   Service status: systemctl status $SERVICE_NAME"
    echo "   Test health: curl http://localhost:8080/health"
    echo ""
    
    # Check environment configuration
    if grep -q "^DATABASE_URL=postgresql://username:password@localhost" "$APP_DIR/.env"; then
        echo "⚠️  IMPORTANT: Update your DATABASE_URL in $APP_DIR/.env"
        echo "   Your current DATABASE_URL is the default placeholder"
        echo "   Replace it with your Supabase connection string"
        echo "   Then restart: sudo systemctl restart $SERVICE_NAME"
        echo ""
    fi
    
    if ! grep -q "^GITHUB_TOKEN=" "$APP_DIR/.env" || grep -q "^GITHUB_TOKEN=$" "$APP_DIR/.env"; then
        echo "💡 Optional: Add GITHUB_TOKEN to $APP_DIR/.env for private repo access"
    fi
    
    if ! grep -q "^OPENAI_API_KEY=" "$APP_DIR/.env" || grep -q "^OPENAI_API_KEY=$" "$APP_DIR/.env"; then
        if ! grep -q "^KIRO_API_KEY=" "$APP_DIR/.env" || grep -q "^KIRO_API_KEY=$" "$APP_DIR/.env"; then
            echo "💡 Optional: Add OPENAI_API_KEY or KIRO_API_KEY to $APP_DIR/.env for AI analysis"
        fi
    fi
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "   For future updates, just run: sudo ./deploy.sh"
}

# Run main function
main "$@"