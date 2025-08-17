# 🚀 PR Manager Production Deployment Guide

This guide covers the complete production deployment process for PR Manager, including the enhanced referral system and usage tracking features.

## 📋 Prerequisites

- EC2 instance with Node.js, npm, and PM2 installed
- Database access (Supabase PostgreSQL)
- Git repository access
- Sufficient disk space (minimum 1GB free)

## 🎯 Quick Deployment

### Standard Deployment

```bash
# SSH to your EC2 instance
ssh ec2-user@your-server-ip

# Navigate to project directory
cd /home/ec2-user/prmanager

# Run the deployment script
sudo ./scripts/deploy-production.sh
```

This single command will:

- ✅ Create comprehensive backups
- ✅ Preserve and validate .env configuration
- ✅ Update dependencies
- ✅ Run database migrations
- ✅ Build server and frontend
- ✅ Deploy with zero downtime
- ✅ Run health checks
- ✅ Clean up old backups

## 🔧 Available Scripts

### 1. Main Deployment Script

```bash
./scripts/deploy-production.sh
```

**Features:**

- Automatic .env backup and restoration
- Comprehensive error handling with rollback
- Database migration management
- Health checks and validation
- Backup management (keeps last 5)
- Zero-downtime deployment

### 2. Rollback Script

```bash
# Interactive rollback
./scripts/rollback-production.sh

# List available backups
./scripts/rollback-production.sh --list

# Rollback to specific backup
./scripts/rollback-production.sh prmanager_backup_20241216_143022
```

### 3. Monitoring Script

```bash
# Real-time monitoring dashboard
./scripts/monitor-production.sh

# One-time health check
./scripts/monitor-production.sh --once
```

## 🗄️ Database Management

The deployment script automatically handles database migrations:

### Tables Created/Updated:

- `daily_usage` - Enhanced with bonus_calls and total_limit
- `user_referral_stats` - User referral codes and statistics
- `referrals` - Referral tracking and completion
- `limit_requests` - User requests for higher limits

### Manual Database Operations:

```bash
# Simple usage table setup
cd server && node setup-simple-usage.js

# Referral system setup
cd server && node setup-referral-system.js

# Production database migration
cd server && node migrate-production-db.js
```

## 🔒 Environment Configuration

### Required Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Admin Access
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password

# Production URLs
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# AI Configuration (optional)
OPENAI_API_KEY=sk-...
```

### Environment File Management:

- The deployment script automatically preserves your existing `.env` file
- If `.env` is missing, it creates one from `.env.production` template
- Critical variables are validated before deployment
- Backup includes `.env` for easy rollback

## 📊 Health Monitoring

### Automatic Health Checks:

- ✅ Health endpoint (`/health`) - Should return 200
- ✅ Analyze endpoint (`/api/analyze`) - Should return 400/405
- ✅ Enhanced usage endpoint (`/api/enhanced-usage`) - Should return 401 (auth required)
- ✅ Referral info endpoint (`/api/referral-info`) - Should return 401 (auth required)

### Manual Health Check:

```bash
# Quick health check
curl http://localhost:8080/health

# Full monitoring dashboard
./scripts/monitor-production.sh
```

## 🎁 New Features Deployed

### Enhanced Usage System:

- **Base Limit**: 10 free AI calls per day
- **Referral Bonuses**: +2 calls per successful referral
- **Usage Tracking**: Real-time usage stats in results tab
- **Contact Support**: Direct email for limit increases

### Referral System:

- **Unique Codes**: Each user gets a unique referral code
- **Share Links**: `https://yourdomain.com?ref=REF12345678`
- **Automatic Bonuses**: +2 daily calls per successful signup
- **Statistics**: Track total, successful referrals, and bonus earned

### User Experience:

- **Usage Tab**: Clean usage stats in results view
- **Referral UI**: Easy sharing with copy-to-clipboard
- **Contact Form**: Pre-filled support requests
- **Progress Bars**: Visual usage tracking with color coding

## 🚨 Emergency Procedures

### If Deployment Fails:

The script automatically rolls back on any error, but you can also manually rollback:

```bash
# Emergency rollback to last backup
./scripts/rollback-production.sh

# Check what went wrong
pm2 logs pr-manager
```

### If Service Won't Start:

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs pr-manager

# Restart service
pm2 restart pr-manager

# Check environment
cat .env | grep -E "(DATABASE_URL|JWT_SECRET)"
```

### If Database Issues:

```bash
# Test database connection
cd server && node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect().then(() => console.log('DB OK')).catch(console.error);
"

# Re-run migrations
cd server && node migrate-production-db.js
```

## 📈 Performance Monitoring

### Key Metrics to Watch:

- **Memory Usage**: Should stay under 500MB
- **CPU Usage**: Should stay under 50% average
- **Response Times**: Health endpoint should respond in <100ms
- **Error Rates**: Should be near 0%

### Monitoring Commands:

```bash
# Real-time monitoring
./scripts/monitor-production.sh

# PM2 monitoring
pm2 monit

# System resources
htop
df -h
```

## 🔄 Regular Maintenance

### Weekly Tasks:

```bash
# Clean up old backups (automatic in deployment)
ls -la /home/ec2-user/backups/

# Check disk usage
df -h

# Review logs for errors
pm2 logs pr-manager --lines 100
```

### Monthly Tasks:

```bash
# Update dependencies (in development first)
npm audit
npm update

# Review database performance
# Check user growth and usage patterns
```

## 📞 Support

### Log Locations:

- **PM2 Logs**: `~/.pm2/logs/`
- **Application Logs**: Via `pm2 logs pr-manager`
- **System Logs**: `/var/log/`

### Common Issues:

1. **Port 8080 in use**: Check with `lsof -i :8080`
2. **Database connection**: Verify DATABASE_URL in .env
3. **Memory issues**: Restart with `pm2 restart pr-manager`
4. **Build failures**: Check Node.js version and dependencies

### Getting Help:

- Check logs: `pm2 logs pr-manager`
- Run health check: `./scripts/monitor-production.sh --once`
- Review recent changes: `git log --oneline -10`

---

## 🎉 Success Indicators

After successful deployment, you should see:

- ✅ Health endpoint returns 200
- ✅ PM2 shows service as "online"
- ✅ Frontend loads at your domain
- ✅ Users can sign up with referral codes
- ✅ Usage stats appear in results tab
- ✅ Referral links work correctly

**Your enhanced PR Manager with referral system is now live!** 🚀
