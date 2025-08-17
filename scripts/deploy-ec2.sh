#!/bin/bash

# PR Manager EC2 Deployment Script
# This script sets up and deploys PR Manager on an EC2 instance

set -e  # Exit on any error

echo "🚀 PR Manager EC2 Deployment Script"
echo "===================================="

# Configuration
GITHUB_REPO="https://github.com/YOUR_USERNAME/pr-manager.git"  # Update this
APP_DIR="/opt/pr-manager"
SERVICE_USER="prmanager"
DOMAIN="your-domain.com"  # Update this
EMAIL="your-email@domain.com"  # Update this for SSL

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

log "Starting PR Manager deployment on EC2..."

# Detect OS and package manager
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        VER=$DISTRIB_RELEASE
    elif [ -f /etc/debian_version ]; then
        OS=Debian
        VER=$(cat /etc/debian_version)
    elif [ -f /etc/SuSe-release ]; then
        OS=openSUSE
    elif [ -f /etc/redhat-release ]; then
        OS=RedHat
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
}

detect_os
log "Detected OS: $OS"

# Set package manager commands based on OS
if [[ "$OS" == *"Amazon Linux"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Fedora"* ]]; then
    PKG_MANAGER="yum"
    PKG_UPDATE="yum update -y"
    PKG_INSTALL="yum install -y"
    NGINX_SERVICE="nginx"
    UFW_AVAILABLE=false
elif [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update && apt upgrade -y"
    PKG_INSTALL="apt install -y"
    NGINX_SERVICE="nginx"
    UFW_AVAILABLE=true
else
    warn "Unsupported OS: $OS. Assuming yum-based system."
    PKG_MANAGER="yum"
    PKG_UPDATE="yum update -y"
    PKG_INSTALL="yum install -y"
    NGINX_SERVICE="nginx"
    UFW_AVAILABLE=false
fi

log "Using package manager: $PKG_MANAGER"

# Update system
log "Updating system packages..."
$PKG_UPDATE

# Install required packages (no certbot needed - using CloudFront SSL)
log "Installing required packages..."
if [[ "$PKG_MANAGER" == "yum" ]]; then
    # Amazon Linux / RHEL packages
    $PKG_INSTALL curl wget git nginx htop
    
    # Install EPEL repository for additional packages
    if [[ "$OS" == *"Amazon Linux"* ]]; then
        amazon-linux-extras install epel -y || yum install -y epel-release
    else
        $PKG_INSTALL epel-release
    fi
    
    # Install fail2ban from EPEL
    $PKG_INSTALL fail2ban
else
    # Ubuntu / Debian packages
    $PKG_INSTALL curl wget git nginx ufw fail2ban htop
fi

# Install Node.js 18
log "Installing Node.js 18..."
if [[ "$PKG_MANAGER" == "yum" ]]; then
    # For Amazon Linux / RHEL
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    $PKG_INSTALL nodejs
else
    # For Ubuntu / Debian
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    $PKG_INSTALL nodejs
fi

# Verify installations
log "Verifying installations..."
node --version
npm --version
nginx -v

# Create service user
log "Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false -d $APP_DIR $SERVICE_USER
fi

# Create application directory
log "Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
log "Cloning repository..."
if [ -d ".git" ]; then
    log "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone $GITHUB_REPO .
fi

# Install dependencies and build
log "Installing dependencies..."
npm run install:all

log "Building applications..."
cd server && npm run build && cd ..
cd web && npm run build && cd ..

# Set up environment variables
log "Setting up environment variables..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat > $APP_DIR/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3001

# AI Provider Configuration
AI_PROVIDER=mock
# OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here
# GEMINI_API_KEY=your_gemini_key_here

# GitHub Integration
# GITHUB_TOKEN=your_github_token_here

# Security
SESSION_SECRET=$(openssl rand -base64 32)
EOF
    warn "Please edit $APP_DIR/.env with your API keys"
fi

# Set permissions
log "Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
chmod -R 755 $APP_DIR

# Create systemd service
log "Creating systemd service..."
cat > /etc/systemd/system/pr-manager.service << EOF
[Unit]
Description=PR Manager API Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/server
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pr-manager

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
log "Starting PR Manager service..."
systemctl daemon-reload
systemctl enable pr-manager
systemctl start pr-manager

# Ensure nginx is enabled and started
systemctl enable $NGINX_SERVICE
systemctl start $NGINX_SERVICE

# Check service status
sleep 3
if systemctl is-active --quiet pr-manager; then
    log "✅ PR Manager service is running"
else
    error "❌ PR Manager service failed to start. Check logs with: journalctl -u pr-manager -f"
fi

# Configure Nginx
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/pr-manager << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN _;
    
    # CloudFront compatibility headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # CloudFront real IP headers
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;

    # Serve static files
    location / {
        root $APP_DIR/web/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CloudFront headers
        proxy_set_header CloudFront-Forwarded-Proto \$http_cloudfront_forwarded_proto;
        proxy_set_header CloudFront-Is-Desktop-Viewer \$http_cloudfront_is_desktop_viewer;
        proxy_set_header CloudFront-Is-Mobile-Viewer \$http_cloudfront_is_mobile_viewer;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/pr-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Handle SELinux on RHEL-based systems
if [[ "$PKG_MANAGER" == "yum" ]] && command -v getenforce >/dev/null 2>&1; then
    if [[ $(getenforce) == "Enforcing" ]]; then
        log "Configuring SELinux for nginx..."
        # Allow nginx to connect to network
        setsebool -P httpd_can_network_connect 1
        # Allow nginx to read/write in app directory
        semanage fcontext -a -t httpd_exec_t "$APP_DIR/web/dist(/.*)?" 2>/dev/null || true
        restorecon -R $APP_DIR/web/dist 2>/dev/null || true
    fi
fi

# Test nginx configuration
nginx -t || error "Nginx configuration test failed"

# Restart nginx
systemctl restart $NGINX_SERVICE
systemctl enable $NGINX_SERVICE

# Configure firewall
log "Configuring firewall..."
if [[ "$UFW_AVAILABLE" == true ]]; then
    # Ubuntu/Debian with UFW
    ufw --force enable
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 80
    ufw allow 443
else
    # Amazon Linux / RHEL with firewalld or iptables
    if systemctl is-active --quiet firewalld; then
        log "Configuring firewalld..."
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --reload
    elif command -v iptables >/dev/null 2>&1; then
        log "Configuring iptables..."
        # Basic iptables rules
        iptables -A INPUT -i lo -j ACCEPT
        iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
        iptables -A INPUT -p tcp --dport 22 -j ACCEPT
        iptables -A INPUT -p tcp --dport 80 -j ACCEPT
        iptables -A INPUT -p tcp --dport 443 -j ACCEPT
        iptables -A INPUT -j DROP
        
        # Save iptables rules
        if command -v iptables-save >/dev/null 2>&1; then
            iptables-save > /etc/sysconfig/iptables 2>/dev/null || true
        fi
    else
        warn "No firewall management tool found. Please configure firewall manually."
    fi
fi

# Configure fail2ban
log "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# SSL will be handled by CloudFront - no local SSL setup needed
log "SSL will be handled by CloudFront - skipping local SSL setup"

# Create deployment script for updates
log "Creating update script..."
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating PR Manager..."

# Navigate to app directory
cd /opt/pr-manager

# Pull latest changes
git pull origin main

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

chmod +x $APP_DIR/update.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/update.sh

# Create monitoring script
log "Creating monitoring script..."
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

chmod +x $APP_DIR/monitor.sh

# Create backup script
log "Creating backup script..."
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/pr-manager"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "📦 Creating backup..."

# Backup application files
tar -czf $BACKUP_DIR/pr-manager_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    /opt/pr-manager

# Keep only last 7 backups
find $BACKUP_DIR -name "pr-manager_*.tar.gz" -mtime +7 -delete

echo "✅ Backup created: $BACKUP_DIR/pr-manager_$DATE.tar.gz"
EOF

chmod +x $APP_DIR/backup.sh

# Set up log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/pr-manager << EOF
/var/log/pr-manager/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload pr-manager
    endscript
}
EOF

# Final status check
log "Performing final status check..."
sleep 5

echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo "✅ System updated and secured"
echo "✅ Node.js and dependencies installed"
echo "✅ Application built and deployed"
echo "✅ Systemd service created and started"
echo "✅ Nginx configured and running"
echo "✅ Firewall configured"
echo "✅ Monitoring and backup scripts created"

if systemctl is-active --quiet pr-manager; then
    echo "✅ PR Manager service is running"
else
    echo "❌ PR Manager service is not running"
fi

if systemctl is-active --quiet $NGINX_SERVICE; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

echo ""
echo "🌐 Your PR Manager is now available at:"
if [[ $setup_ssl == "y" || $setup_ssl == "Y" ]]; then
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
else
    echo "   http://$DOMAIN"
    echo "   http://www.$DOMAIN"
fi

echo ""
echo "📋 Important Files:"
echo "   Application: $APP_DIR"
echo "   Environment: $APP_DIR/.env"
echo "   Service: /etc/systemd/system/pr-manager.service"
echo "   Nginx config: /etc/nginx/sites-available/pr-manager"
echo ""
echo "🔧 Useful Commands:"
echo "   Update app: $APP_DIR/update.sh"
echo "   Monitor: $APP_DIR/monitor.sh"
echo "   Backup: $APP_DIR/backup.sh"
echo "   View logs: journalctl -u pr-manager -f"
echo "   Restart: sudo systemctl restart pr-manager"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Edit $APP_DIR/.env with your API keys"
echo "   2. Update GITHUB_REPO variable in this script"
echo "   3. Update DOMAIN and EMAIL variables"
echo "   4. Test your application"
echo ""
echo "🎉 Deployment completed successfully!"