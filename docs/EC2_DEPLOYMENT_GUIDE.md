# EC2 Deployment Guide for PR Manager

## 🚀 Complete EC2 Deployment Setup

This guide will help you deploy PR Manager on AWS EC2 with full production setup including SSL, monitoring, and automated deployments.

---

## 📋 Prerequisites

### **1. AWS EC2 Instance**

- **Instance Type**: t3.small or larger (2GB+ RAM recommended)
- **OS**: Ubuntu 22.04 LTS, Amazon Linux 2023, or RHEL 8/9
- **Storage**: 20GB+ SSD
- **Security Group**: Allow ports 22 (SSH), 80 (HTTP) - HTTPS handled by CloudFront

**Supported Operating Systems:**

- Ubuntu 20.04/22.04 LTS (apt-based)
- Amazon Linux 2023 (yum-based)
- Red Hat Enterprise Linux 8/9 (yum-based)
- CentOS 8/9 (yum-based)

### **2. Domain Setup**

- Domain name pointing to your EC2 instance IP
- DNS A record: `your-domain.com` → `EC2_PUBLIC_IP`
- DNS A record: `www.your-domain.com` → `EC2_PUBLIC_IP`

### **3. GitHub Repository**

- Push your PR Manager code to GitHub
- Make repository public or set up deploy keys

---

## 🎯 Deployment Options

### **Option 1: Quick Deployment (5 minutes)**

For rapid setup and testing:

```bash
# 1. Connect to your EC2 instance
# For Ubuntu: ssh -i your-key.pem ubuntu@your-ec2-ip
# For Amazon Linux: ssh -i your-key.pem ec2-user@your-ec2-ip

# 2. Download and run quick setup
wget https://raw.githubusercontent.com/YOUR_USERNAME/pr-manager/main/quick-deploy-ec2.sh
chmod +x quick-deploy-ec2.sh

# 3. Edit the script with your GitHub repo URL
nano quick-deploy-ec2.sh
# Update: GITHUB_REPO="https://github.com/YOUR_USERNAME/pr-manager.git"

# 4. Run deployment (script auto-detects OS and package manager)
sudo ./quick-deploy-ec2.sh
```

### **Option 2: Full Production Deployment (15 minutes)**

For complete production setup with SSL, monitoring, and security:

```bash
# 1. Connect to EC2
# For Ubuntu: ssh -i your-key.pem ubuntu@your-ec2-ip
# For Amazon Linux: ssh -i your-key.pem ec2-user@your-ec2-ip

# 2. Download full deployment script
wget https://raw.githubusercontent.com/YOUR_USERNAME/pr-manager/main/deploy-ec2.sh
chmod +x deploy-ec2.sh

# 3. Edit configuration
nano deploy-ec2.sh
# Update these variables:
# GITHUB_REPO="https://github.com/YOUR_USERNAME/pr-manager.git"
# DOMAIN="your-domain.com"
# EMAIL="your-email@domain.com"

# 4. Run full deployment (script auto-detects OS and package manager)
sudo ./deploy-ec2.sh
```

---

## 🔧 Manual Step-by-Step Setup

If you prefer manual setup or need to customize:

### **Step 1: System Setup**

**For Ubuntu/Debian:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**For Amazon Linux/RHEL/CentOS:**

```bash
# Update system
sudo yum update -y

# Install EPEL repository
sudo yum install -y epel-release

# Install dependencies
sudo yum install -y curl wget git nginx fail2ban

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**Verify installations:**

```bash
node --version
npm --version
nginx -v
```

### **Step 2: Application Setup**

```bash
# Create application directory
sudo mkdir -p /opt/pr-manager
cd /opt/pr-manager

# Clone your repository
sudo git clone https://github.com/YOUR_USERNAME/pr-manager.git .

# Install dependencies
sudo npm run install:all

# Build applications
cd server && sudo npm run build && cd ..
cd web && sudo npm run build && cd ..
```

### **Step 3: Environment Configuration**

```bash
# Create environment file
sudo nano /opt/pr-manager/.env
```

Add your configuration:

```env
NODE_ENV=production
PORT=3001

# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here
# GEMINI_API_KEY=your_gemini_key_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here

# Security
SESSION_SECRET=your_random_secret_here
```

### **Step 4: Systemd Service**

```bash
# Create service file
sudo nano /etc/systemd/system/pr-manager.service
```

Add service configuration:

```ini
[Unit]
Description=PR Manager API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pr-manager/server
Environment=NODE_ENV=production
EnvironmentFile=/opt/pr-manager/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable pr-manager
sudo systemctl start pr-manager

# Check status
sudo systemctl status pr-manager
```

### **Step 5: Nginx Configuration**

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pr-manager
```

Add Nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Serve static files
    location / {
        root /opt/pr-manager/web/dist;
        try_files $uri $uri/ /index.html;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/pr-manager /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### **Step 6: SSL Certificate (CloudFront)**

SSL is handled by CloudFront - no local SSL setup needed on EC2.

See `CLOUDFRONT_SETUP.md` for complete CloudFront configuration.

### **Step 7: Security Setup**

**For Ubuntu/Debian (UFW):**

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443
```

**For Amazon Linux/RHEL/CentOS (firewalld):**

```bash
# Configure firewall
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Configure fail2ban (all systems):**

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

**SELinux Configuration (RHEL-based systems):**

```bash
# If SELinux is enforcing, configure it for nginx
sudo setsebool -P httpd_can_network_connect 1
```

---

## 🔄 Automated Deployment with GitHub Actions

### **Step 1: Set up GitHub Secrets**

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add:

- `EC2_HOST`: Your EC2 instance public IP or domain
- `EC2_USERNAME`: `ubuntu` (for Ubuntu instances)
- `EC2_SSH_KEY`: Your private SSH key content

### **Step 2: GitHub Actions Workflow**

The workflow file is already created at `.github/workflows/deploy-ec2.yml`. It will:

1. Build your application
2. Deploy to EC2 via SSH
3. Restart services
4. Perform health checks

### **Step 3: Deploy**

Simply push to the main branch:

```bash
git add .
git commit -m "Deploy to EC2"
git push origin main
```

---

## 🛠️ Management Commands

### **Application Management**

```bash
# Update application
/opt/pr-manager/update.sh

# Monitor status
/opt/pr-manager/monitor.sh

# Create backup
/opt/pr-manager/backup.sh

# View logs
sudo journalctl -u pr-manager -f

# Restart service
sudo systemctl restart pr-manager
```

### **Nginx Management**

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### **System Monitoring**

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
ss -tulpn | grep :3001
```

---

## 💰 Cost Estimation

### **EC2 Instance Costs (Monthly)**

- **t3.small**: ~$15-20/month
- **t3.medium**: ~$30-40/month
- **t3.large**: ~$60-80/month

### **Additional Costs**

- **Elastic IP**: ~$3.65/month (if not attached to running instance)
- **EBS Storage**: ~$0.10/GB/month
- **Data Transfer**: First 1GB free, then ~$0.09/GB

### **Total Monthly Cost**

- **Small setup**: ~$18-25/month
- **Medium setup**: ~$35-45/month

---

## 🔍 Troubleshooting

### **Service Won't Start**

```bash
# Check service status
sudo systemctl status pr-manager

# View detailed logs
sudo journalctl -u pr-manager -f

# Check if port is in use
sudo ss -tulpn | grep :3001

# Test application manually
cd /opt/pr-manager/server
node dist/index.js
```

### **Nginx Issues**

```bash
# Test configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### **SSL Certificate Issues**

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### **Performance Issues**

```bash
# Check system resources
htop
free -h
df -h

# Check application logs for errors
sudo journalctl -u pr-manager --since "1 hour ago"

# Monitor network connections
sudo ss -tulpn | grep :3001
```

---

## 🚀 Scaling and Optimization

### **Performance Optimization**

1. **Enable Gzip compression** (already configured in Nginx)
2. **Use PM2 for process management**:

   ```bash
   npm install -g pm2
   pm2 start /opt/pr-manager/server/dist/index.js --name pr-manager
   pm2 startup
   pm2 save
   ```

3. **Add Redis for caching**:
   ```bash
   sudo apt install redis-server
   # Update your application to use Redis
   ```

### **Monitoring Setup**

1. **Install monitoring tools**:

   ```bash
   sudo apt install htop iotop nethogs
   ```

2. **Set up log monitoring**:

   ```bash
   sudo apt install logwatch
   ```

3. **Add uptime monitoring** with services like UptimeRobot

### **Backup Strategy**

1. **Automated backups**:

   ```bash
   # Add to crontab
   0 2 * * * /opt/pr-manager/backup.sh
   ```

2. **Database backups** (if you add a database later)
3. **Configuration backups**

---

## 🎯 Production Checklist

- [ ] EC2 instance properly sized and configured
- [ ] Domain DNS pointing to EC2 instance
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (UFW)
- [ ] Fail2ban configured for security
- [ ] Application service running and enabled
- [ ] Nginx configured and running
- [ ] Environment variables set with real API keys
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] GitHub Actions deployment working
- [ ] Health checks passing
- [ ] Performance testing completed

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs: `sudo journalctl -u pr-manager -f`
3. Check system resources: `htop`, `free -h`, `df -h`
4. Test individual components manually
5. Review Nginx configuration and logs

Your PR Manager is now ready for production use on EC2! 🎉
