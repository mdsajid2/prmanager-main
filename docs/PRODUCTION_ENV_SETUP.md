# 🔐 Production Environment Setup Guide

## ⚠️ CRITICAL SECURITY NOTICE

**NEVER commit .env files to your repository!** They contain sensitive credentials.

## 📋 Production Environment Variables

### **Required for Production:**

```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Database (Your Supabase Database)
DATABASE_URL=postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Security Keys (GENERATE NEW ONES FOR PRODUCTION!)
JWT_SECRET=GENERATE_A_NEW_64_CHARACTER_SECRET_FOR_PRODUCTION
ENCRYPTION_KEY=GENERATE_A_NEW_64_CHARACTER_HEX_KEY_FOR_PRODUCTION

# AI Provider (Choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=your_production_openai_key

# GitHub Integration (Optional but recommended)
GITHUB_TOKEN=your_production_github_token

# Optional: Kiro API
# KIRO_API_KEY=your_production_kiro_key
```

## 🔑 **Generate Secure Keys:**

### **JWT Secret (64+ characters):**

```bash
# Generate a secure JWT secret
openssl rand -base64 64
```

### **Encryption Key (64 hex characters):**

```bash
# Generate a secure encryption key
openssl rand -hex 32
```

## 🚀 **Production Deployment Steps:**

### **1. On your EC2 instance, create the production .env file:**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to your app directory
cd /home/ec2-user/prmanager

# Create production .env file (NEVER commit this!)
sudo nano .env
```

### **2. Copy and paste your production environment variables:**

```bash
# Production Environment Variables
PORT=8080
NODE_ENV=production

# Database (Your Supabase Database)
DATABASE_URL=postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Security Keys (GENERATE NEW ONES!)
JWT_SECRET=your_new_production_jwt_secret_here
ENCRYPTION_KEY=your_new_production_encryption_key_here

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=your_production_openai_key

# GitHub Integration
GITHUB_TOKEN=your_production_github_token
```

### **3. Set proper file permissions:**

```bash
# Secure the .env file (only owner can read/write)
sudo chmod 600 .env
sudo chown ec2-user:ec2-user .env
```

### **4. Deploy with the updated environment:**

```bash
# Deploy your application
sudo ./deploy.sh
```

## 🛡️ **Security Best Practices:**

### **✅ DO:**

- ✅ Use different keys for development and production
- ✅ Generate strong, random keys (64+ characters)
- ✅ Set proper file permissions (600) on .env files
- ✅ Use environment variables for all sensitive data
- ✅ Regularly rotate your keys and tokens
- ✅ Use separate databases for dev/staging/production

### **❌ DON'T:**

- ❌ NEVER commit .env files to git
- ❌ Don't share .env files via email/chat
- ❌ Don't use the same keys across environments
- ❌ Don't hardcode secrets in your code
- ❌ Don't use weak or predictable keys

## 🔍 **Verify Security:**

### **Check that .env files are not tracked:**

```bash
# This should return nothing
git ls-files | grep -E "\.env"

# This should show .env files are ignored
git status --ignored | grep -E "\.env"
```

### **Check file permissions on production:**

```bash
# Should show: -rw------- (600)
ls -la .env
```

## 🚨 **If .env Files Were Accidentally Committed:**

### **1. Remove from git history:**

```bash
# Remove from current commit
git rm --cached .env .env.development .env.production

# Remove from git history (DANGEROUS - creates new commit hashes)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env .env.development .env.production' \
  --prune-empty --tag-name-filter cat -- --all
```

### **2. Rotate ALL compromised credentials:**

- 🔄 Generate new JWT_SECRET
- 🔄 Generate new ENCRYPTION_KEY
- 🔄 Rotate GitHub tokens
- 🔄 Rotate API keys
- 🔄 Update database passwords if exposed

## 📞 **Production Checklist:**

- [ ] Generated new JWT_SECRET for production
- [ ] Generated new ENCRYPTION_KEY for production
- [ ] Created production .env file on EC2
- [ ] Set proper file permissions (600)
- [ ] Verified .env files are not in git
- [ ] Tested application with production environment
- [ ] Set up database migration for encrypted tokens
- [ ] Verified all API integrations work

## 🎯 **Environment Differences:**

| Variable       | Development     | Production             |
| -------------- | --------------- | ---------------------- |
| NODE_ENV       | development     | production             |
| PORT           | 3001            | 8080                   |
| JWT_SECRET     | Dev key         | **NEW** Production key |
| ENCRYPTION_KEY | Dev key         | **NEW** Production key |
| DATABASE_URL   | Same (Supabase) | Same (Supabase)        |
| API Keys       | Dev keys        | Production keys        |

Your production environment is now secure and ready for deployment! 🚀🔐
