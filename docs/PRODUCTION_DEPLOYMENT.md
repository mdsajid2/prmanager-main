# 🚀 Production Deployment Guide

## Quick Deployment Steps

### 1. Pre-Deployment Check

```bash
# Run this locally before deploying
./pre-deploy-check.sh
```

### 2. Deploy to EC2

```bash
# On your EC2 instance
sudo ./deploy.sh
```

## ✅ Production Readiness Checklist

### Environment Configuration

- [x] **Database**: Uses your Supabase database via `DATABASE_URL`
- [x] **Authentication**: PostgreSQL-based auth service
- [x] **SSL**: Properly configured for Supabase connection
- [x] **Environment Variables**: Loaded correctly in all services
- [x] **Build Process**: TypeScript compilation and optimization
- [x] **Service Management**: Systemd service with auto-restart

### Security Features

- [x] **JWT Tokens**: Secure session management
- [x] **Password Hashing**: bcrypt with salt rounds
- [x] **CORS Configuration**: Proper origin restrictions
- [x] **Environment Isolation**: Production vs development configs
- [x] **Database Security**: SSL connections to Supabase

### Monitoring & Maintenance

- [x] **Health Checks**: `/health` endpoint for monitoring
- [x] **Logging**: Systemd journal integration
- [x] **Service Management**: Start/stop/restart capabilities
- [x] **Utility Scripts**: Monitor and restart scripts included

## 🔧 What the Deployment Script Does

### System Setup (First Time)

1. **Detects OS** and installs appropriate packages
2. **Installs Node.js 18** if not present
3. **Installs system dependencies** (curl, wget, git, htop)

### Application Build

1. **Installs all dependencies** (root, server, web)
2. **Installs database packages** (pg, bcrypt, jsonwebtoken)
3. **Builds server** (TypeScript → JavaScript)
4. **Builds web** (React → optimized static files)
5. **Verifies builds** exist and are complete

### Environment Setup

1. **Creates/updates .env** with production settings
2. **Generates JWT_SECRET** if not present
3. **Sets proper permissions** on files and directories
4. **Configures PORT=8080** for production

### Service Configuration

1. **Creates systemd service** with proper user/permissions
2. **Enables auto-start** on system boot
3. **Configures restart policies** for reliability
4. **Sets up logging** to systemd journal

### Utility Scripts

1. **monitor.sh** - Check system status, memory, logs
2. **restart.sh** - Quick service restart

## 🌐 After Deployment

### Your Application URLs

- **Frontend**: `http://your-ec2-ip:8080/`
- **API Health**: `http://your-ec2-ip:8080/health`
- **API Base**: `http://your-ec2-ip:8080/api/`

### Useful Commands

```bash
# Check service status
systemctl status pr-manager

# View live logs
journalctl -u pr-manager -f

# Restart service
sudo systemctl restart pr-manager

# Quick monitoring
./monitor.sh

# Quick restart
./restart.sh
```

## 🔍 Troubleshooting

### Service Won't Start

```bash
# Check detailed logs
journalctl -u pr-manager --since "10 minutes ago"

# Check if port is in use
sudo netstat -tulpn | grep :8080

# Verify environment file
cat .env
```

### Database Connection Issues

```bash
# Test database connection
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', console.log);
"
```

### Build Failures

```bash
# Clean and rebuild
rm -rf server/dist web/dist server/node_modules web/node_modules
npm run install:all
cd server && npm run build && cd ..
cd web && npm run build && cd ..
```

## 🔒 Security Considerations

### Environment Variables

- ✅ **JWT_SECRET**: Auto-generated 64-character secret
- ✅ **DATABASE_URL**: Secure connection to Supabase
- ✅ **File Permissions**: .env file is 600 (owner read/write only)

### Network Security

- ✅ **CORS**: Configured for your domain
- ✅ **SSL**: Database connections use SSL
- ✅ **Port**: Single port (8080) for both frontend and API

### Application Security

- ✅ **Authentication**: JWT-based with expiration
- ✅ **Password Hashing**: bcrypt with salt
- ✅ **Session Management**: Database-backed sessions
- ✅ **Input Validation**: Request validation middleware

## 📊 Performance Optimizations

### Build Optimizations

- ✅ **TypeScript Compilation**: Optimized JavaScript output
- ✅ **React Build**: Minified and optimized bundle
- ✅ **Static Assets**: Efficient serving via Express
- ✅ **Environment-based**: Production vs development configs

### Runtime Optimizations

- ✅ **Connection Pooling**: PostgreSQL connection pool
- ✅ **Process Management**: Systemd with restart policies
- ✅ **Memory Management**: Proper cleanup and garbage collection
- ✅ **Logging**: Structured logging to systemd journal

## 🎯 Next Steps After Deployment

1. **Test Authentication**: Try login/signup with your database users
2. **Test PR Analysis**: Upload a PR and verify AI analysis works
3. **Monitor Performance**: Use `./monitor.sh` to check system health
4. **Set up Domain**: Point your domain to the EC2 instance
5. **Configure SSL**: Set up HTTPS with Let's Encrypt
6. **Set up Monitoring**: CloudWatch or other monitoring solution

## 🆘 Support

If you encounter issues:

1. **Check logs**: `journalctl -u pr-manager -f`
2. **Run health check**: `curl http://localhost:8080/health`
3. **Verify environment**: Check `.env` file has correct values
4. **Test database**: Use the database connection test above
5. **Check permissions**: Ensure ec2-user owns all files

Your application is **production-ready** and should deploy seamlessly! 🚀
