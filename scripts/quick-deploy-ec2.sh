#!/bin/bash

# Quick EC2 Deployment Script for PR Manager
# Run this on your EC2 instance after pushing code to GitHub

set -e

echo "🚀 Quick PR Manager EC2 Setup"
echo "=============================="

# Configuration - UPDATE THESE VALUES
GITHUB_REPO="https://github.com/YOUR_USERNAME/pr-manager.git"
DOMAIN="your-domain.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "Please run as root: sudo ./quick-deploy-ec2.sh"
fi

log "Installing system dependencies..."
apt update
apt install -y curl git nginx ufw htop

log "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

log "Cloning repository..."
cd /opt
rm -rf pr-manager
git clone $GITHUB_REPO pr-manager
cd pr-manager

log "Installing dependencies..."
npm run install:all

log "Building applications..."
cd server && npm run build && cd ..
cd web && npm run build && cd ..

log "Setting up environment..."
cat > .env << EOF
NODE_ENV=production
PORT=3001
AI_PROVIDER=mock

# Add your API keys here:
# OPENAI_API_KEY=your_key_here
# GITHUB_TOKEN=your_token_here
EOF

warn "Please edit /opt/pr-manager/.env with your API keys"

log "Creating systemd service..."
cat > /etc/systemd/system/pr-manager.service << EOF
[Unit]
Description=PR Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pr-manager/server
Environment=NODE_ENV=production
EnvironmentFile=/opt/pr-manager/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

log "Starting service..."
systemctl daemon-reload
systemctl enable pr-manager
systemctl start pr-manager

log "Configuring Nginx..."
cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /opt/pr-manager/web/dist;
    index index.html;
    
    server_name _;
    
    # CloudFront real IP
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;
    
    # Security headers for CloudFront
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets for CloudFront
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CloudFront headers
        proxy_set_header CloudFront-Forwarded-Proto \$http_cloudfront_forwarded_proto;
    }
}
EOF

log "Starting Nginx..."
nginx -t
systemctl restart nginx
systemctl enable nginx

log "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

log "Creating update script..."
cat > /opt/pr-manager/update.sh << 'EOF'
#!/bin/bash
cd /opt/pr-manager
git pull origin main
npm run install:all
cd server && npm run build && cd ..
cd web && npm run build && cd ..
sudo systemctl restart pr-manager
echo "✅ Updated successfully!"
EOF
chmod +x /opt/pr-manager/update.sh

# Final check
sleep 3
if systemctl is-active --quiet pr-manager; then
    log "✅ PR Manager is running!"
else
    error "❌ Service failed to start. Check: journalctl -u pr-manager"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "✅ PR Manager is running on port 3001"
echo "✅ Nginx is serving on port 80"
echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
echo ""
echo "📝 Next steps:"
echo "1. Edit /opt/pr-manager/.env with your API keys"
echo "2. Run: sudo systemctl restart pr-manager"
echo "3. Set up your domain DNS to point to this server"
echo ""
echo "🔧 Useful commands:"
echo "- Update: /opt/pr-manager/update.sh"
echo "- Logs: journalctl -u pr-manager -f"
echo "- Restart: sudo systemctl restart pr-manager"
echo ""
echo "🎯 Your PR Manager is ready!"