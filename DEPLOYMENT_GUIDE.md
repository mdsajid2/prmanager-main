# 🚀 Ultimate Deployment Guide

This guide provides comprehensive, safe deployment procedures for the PR Manager application with zero-downtime guarantees and automatic rollback capabilities.

## 📋 Quick Reference

### For Any Deployment (Local or Production)

```bash
# The ultimate safe deployment script
./scripts/ultimate-safe-deploy.sh
```

### For Specific Issues

```bash
# Fix GitHub token storage issues
./scripts/fix-github-token-storage.sh

# Fix system health dashboard
./scripts/final-system-health-fix.sh

# Monitor production
./scripts/monitor-production.sh

# Emergency rollback
./scripts/rollback-production.sh
```

## 🛡️ Safety Features

### ✅ Zero-Downtime Deployment

- Starts new instance on alternate port
- Tests thoroughly before switching traffic
- Keeps old instance running until new one is verified

### ✅ Automatic Rollback

- Creates comprehensive backups before any changes
- Automatically restores on failure
- Preserves working state at all times

### ✅ Comprehensive Testing

- Health checks on all critical endpoints
- Database connection verification
- Build integrity validation
- API functionality testing

### ✅ Smart Recovery

- Multiple rollback attempts
- Process monitoring and restart
- Detailed logging for troubleshooting

## 📁 Deployment Scripts Overview

### `ultimate-safe-deploy.sh` - The Master Script

**Use this for all deployments**

- ✅ Complete backup and restore system
- ✅ Zero-downtime service restart
- ✅ Comprehensive health checks
- ✅ Automatic rollback on failure
- ✅ Database migration handling
- ✅ Build verification
- ✅ Cleanup and maintenance

### `fix-github-token-storage.sh` - Token Storage Fix

**Use when GitHub token storage fails**

- ✅ Fixes API URL detection issues
- ✅ Updates frontend configuration
- ✅ Tests token endpoints
- ✅ Rebuilds and restarts safely

### `final-system-health-fix.sh` - Health Dashboard Fix

**Use when System Health shows "Database: UNHEALTHY"**

- ✅ Replaces complex database queries
- ✅ Implements robust health checks
- ✅ Maintains all existing functionality
- ✅ Safe backup and restore

## 🎯 Deployment Scenarios

### 1. Regular Feature Deployment

```bash
# After making code changes
git add .
git commit -m "Add new feature"
git push

# Deploy safely
./scripts/ultimate-safe-deploy.sh
```

### 2. Production Deployment

```bash
# On your EC2 server
cd /home/ec2-user/prmanager
git pull
sudo ./scripts/ultimate-safe-deploy.sh
```

### 3. Emergency Fix Deployment

```bash
# For critical fixes
./scripts/ultimate-safe-deploy.sh

# If that fails, manual rollback:
./scripts/rollback-production.sh
```

### 4. First-Time Setup

```bash
# Clone and setup
git clone <your-repo>
cd prmanager
cp .env.example .env
# Edit .env with your configuration

# Deploy
./scripts/ultimate-safe-deploy.sh
```

## 🔧 Configuration

### Environment Variables

Ensure these are set in your `.env` file:

```bash
# Database
DATABASE_URL=postgresql://...

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=your-secret
ENCRYPTION_KEY=your-encryption-key

# Optional
GITHUB_TOKEN=your-github-token
OPENAI_API_KEY=your-openai-key
```

### Production Environment (`.env.production.server`)

```bash
NODE_ENV=production
PORT=8080
# ... other production-specific settings
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints

- `GET /health` - Basic server health
- `GET /api/auth/health` - Authentication service health
- `GET /api/system-health` - Comprehensive system health
- `GET /api/tokens` - Token storage service (requires auth)

### Log Files

- Deployment logs: `/tmp/deployment-YYYYMMDD-HHMMSS.log`
- Server logs: `server.log`, `server-8080.log`, `server-3001.log`
- Rollback logs: `rollback-server.log`

### Backup Locations

- Automatic backups: `/tmp/prmanager-backup-YYYYMMDD-HHMMSS/`
- Auto-cleanup: 7 days retention
- Manual backups: Use `cp -r` before major changes

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "Connection Refused" Errors

```bash
# Check if server is running
ps aux | grep node

# Check ports
netstat -tlnp | grep :8080
netstat -tlnp | grep :3001

# Fix with deployment script
./scripts/ultimate-safe-deploy.sh
```

#### 2. "Database: UNHEALTHY" in Dashboard

```bash
./scripts/final-system-health-fix.sh
```

#### 3. GitHub Token Storage Fails

```bash
./scripts/fix-github-token-storage.sh
```

#### 4. Build Failures

```bash
# Check dependencies
npm install
cd server && npm install && cd ..
cd web && npm install && cd ..

# Clean build
rm -rf node_modules server/node_modules web/node_modules
npm install
./scripts/ultimate-safe-deploy.sh
```

#### 5. Database Connection Issues

```bash
# Test database connection
cd server
node check-production-db.js

# Check environment variables
echo $DATABASE_URL
```

### Emergency Procedures

#### Complete System Failure

```bash
# 1. Stop all processes
sudo pkill -f "node.*server"

# 2. Restore from backup
BACKUP_DIR="/tmp/prmanager-backup-YYYYMMDD-HHMMSS"  # Use latest
cp -r $BACKUP_DIR/* .

# 3. Restart
cd server
npm start
```

#### Database Recovery

```bash
# Check database status
cd server
node check-production-db.js

# Run migrations if needed
node migration-manager.js
```

## 📈 Performance Optimization

### Recommended Deployment Flow

1. **Test locally first**: Always test changes locally
2. **Use staging environment**: If available, deploy to staging first
3. **Deploy during low traffic**: Minimize user impact
4. **Monitor after deployment**: Watch logs and health checks
5. **Keep rollback ready**: Have rollback plan prepared

### Resource Management

- **Memory**: Monitor Node.js memory usage
- **CPU**: Watch for high CPU during builds
- **Disk**: Clean up old logs and backups
- **Network**: Monitor API response times

## 🔐 Security Considerations

### Deployment Security

- ✅ Environment variables are never logged
- ✅ Sensitive data is encrypted in backups
- ✅ Database credentials are protected
- ✅ API tokens are handled securely

### Access Control

- Use proper SSH keys for EC2 access
- Limit sudo access to deployment scripts
- Rotate secrets regularly
- Monitor access logs

## 📚 Additional Resources

### Useful Commands

```bash
# Check system status
./scripts/monitor-production.sh

# View logs
tail -f server.log
tail -f /tmp/deployment-*.log

# Check processes
ps aux | grep node
netstat -tlnp | grep :8080

# Database operations
cd server && node check-production-db.js
cd database && node migration-manager.js
```

### File Structure

```
prmanager/
├── scripts/
│   ├── ultimate-safe-deploy.sh      # Master deployment script
│   ├── fix-github-token-storage.sh  # Token storage fix
│   ├── final-system-health-fix.sh   # Health dashboard fix
│   ├── monitor-production.sh        # System monitoring
│   └── rollback-production.sh       # Emergency rollback
├── server/                          # Backend application
├── web/                            # Frontend application
├── database/                       # Database migrations
├── .env                           # Environment configuration
├── .env.production.server         # Production configuration
└── DEPLOYMENT_GUIDE.md           # This guide
```

## 🎉 Success Indicators

After successful deployment, you should see:

- ✅ All health check endpoints returning 200/401 (as expected)
- ✅ GitHub token storage working without errors
- ✅ System Health Dashboard showing "Database: HEALTHY"
- ✅ All existing functionality preserved
- ✅ New features working as expected
- ✅ No error messages in logs
- ✅ Proper response times on all endpoints

---

**Remember**: The `ultimate-safe-deploy.sh` script is designed to be your go-to solution for all deployments. It handles edge cases, provides safety nets, and ensures your system stays operational throughout the deployment process.

For any issues not covered in this guide, check the deployment logs and use the troubleshooting section above.
