#!/bin/bash

# 🔐 PR Manager Production Key Generator
# This script generates secure encryption keys for production use

set -e

echo "🔐 PR Manager Production Key Generator"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ Error: openssl is not installed${NC}"
    echo "Please install openssl first:"
    echo "  macOS: brew install openssl"
    echo "  Ubuntu/Debian: sudo apt-get install openssl"
    echo "  CentOS/RHEL: sudo yum install openssl"
    exit 1
fi

echo -e "${BLUE}🔑 Generating secure keys for production...${NC}"
echo ""

# Generate JWT Secret (64 characters base64)
echo -e "${YELLOW}1. Generating JWT_SECRET (64 characters)...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo -e "${GREEN}✅ JWT_SECRET generated${NC}"
echo ""

# Generate Encryption Key (64 hex characters)
echo -e "${YELLOW}2. Generating ENCRYPTION_KEY (64 hex characters)...${NC}"
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✅ ENCRYPTION_KEY generated${NC}"
echo ""

# Generate additional secure random string for session secrets
echo -e "${YELLOW}3. Generating SESSION_SECRET (optional)...${NC}"
SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo -e "${GREEN}✅ SESSION_SECRET generated${NC}"
echo ""

# Display the keys
echo -e "${BLUE}🎯 Your Production Keys:${NC}"
echo "========================"
echo ""
echo -e "${GREEN}# Add these to your production .env file:${NC}"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""
echo "# Optional - for additional session security:"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""

# Save to file option
echo -e "${YELLOW}💾 Save keys to file? (y/n):${NC}"
read -r save_to_file

if [[ $save_to_file =~ ^[Yy]$ ]]; then
    KEYS_FILE="production-keys-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$KEYS_FILE" << EOF
# PR Manager Production Keys
# Generated on: $(date)
# 
# ⚠️  SECURITY WARNING:
# - These keys are for PRODUCTION use only
# - Never commit this file to git
# - Store securely and delete after use
# - Use different keys for each environment

# Authentication & Security Keys
JWT_SECRET=$JWT_SECRET

ENCRYPTION_KEY=$ENCRYPTION_KEY

# Optional Session Secret
SESSION_SECRET=$SESSION_SECRET

# Complete Production .env Template:
# ===================================
# 
# # Server Configuration
# PORT=8080
# NODE_ENV=production
# 
# # Database (Your Supabase Database)
# DATABASE_URL=your_supabase_database_url_here
# 
# # Security Keys (Generated above)
# JWT_SECRET=$JWT_SECRET
# ENCRYPTION_KEY=$ENCRYPTION_KEY
# 
# # AI Provider
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_production_openai_key
# 
# # GitHub Integration
# GITHUB_TOKEN=your_production_github_token
EOF

    echo -e "${GREEN}✅ Keys saved to: $KEYS_FILE${NC}"
    echo -e "${RED}⚠️  Remember to delete this file after copying to production!${NC}"
    echo ""
fi

# Security reminders
echo -e "${RED}🛡️  SECURITY REMINDERS:${NC}"
echo "======================"
echo "✅ Use these keys ONLY in production"
echo "✅ Never commit keys to git repositories"
echo "✅ Store keys securely (password manager, vault, etc.)"
echo "✅ Use different keys for dev/staging/production"
echo "✅ Rotate keys regularly (every 6-12 months)"
echo "✅ Set proper file permissions on .env (chmod 600)"
echo ""

# Usage instructions
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "=============="
echo "1. Copy the keys above to your production .env file"
echo "2. SSH into your EC2 instance"
echo "3. Create/edit the .env file: sudo nano /home/ec2-user/prmanager/.env"
echo "4. Paste the keys and other production variables"
echo "5. Set secure permissions: sudo chmod 600 .env"
echo "6. Deploy: sudo ./deploy.sh"
echo ""

echo -e "${GREEN}🎉 Key generation complete!${NC}"