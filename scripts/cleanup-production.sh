#!/bin/bash

# 🧹 Production Cleanup Script
# Run this on your EC2 instance to fix the API URL and settings issues

echo "🧹 PR Manager Production Cleanup"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}1. Stopping current service...${NC}"
sudo systemctl stop pr-manager || true

echo -e "${BLUE}2. Pulling latest changes...${NC}"
git pull origin main

echo -e "${BLUE}3. Installing dependencies...${NC}"
cd server && npm install && cd ..
cd web && npm install && cd ..

echo -e "${BLUE}4. Building applications...${NC}"
cd server && npm run build && cd ..
cd web && npm run build && cd ..

echo -e "${BLUE}5. Restarting service...${NC}"
sudo systemctl start pr-manager

echo -e "${BLUE}6. Checking service status...${NC}"
sleep 3
sudo systemctl status pr-manager --no-pager

echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "🌐 Your application should now work correctly at:"
echo "   https://prmanagerai.com"
echo ""
echo "🔧 API calls will now use the correct production URLs"
echo "👥 User settings are now isolated per user"
echo "🔐 GitHub tokens are user-specific"