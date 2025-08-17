#!/bin/bash

echo "🚀 Deploying PR Manager with Admin Setup..."

# Build the application
echo "📦 Building application..."
npm run build

# Setup production admin user
echo "👤 Setting up production admin user..."
node scripts/setup-production-admin.js

# Deploy to production (adjust this based on your deployment method)
echo "🌐 Deploying to production..."

# If using PM2
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 processes..."
    pm2 restart all
fi

# If using systemd
if systemctl is-active --quiet prmanager; then
    echo "🔄 Restarting systemd service..."
    sudo systemctl restart prmanager
fi

echo "✅ Deployment complete!"
echo "🛠️ Admin user setup for: $ADMIN_EMAIL"
echo "🌐 Admin panel available at: /admin"