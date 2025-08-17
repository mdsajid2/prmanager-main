# CloudFront Setup Guide for PR Manager

## 🌐 CloudFront + EC2 Deployment Architecture

This guide shows how to set up AWS CloudFront as a CDN with SSL termination in front of your EC2-hosted PR Manager application.

```
Internet → CloudFront (SSL/CDN) → EC2 (HTTP only) → PR Manager
```

## 🎯 Benefits of CloudFront + EC2

- **Global Performance**: CDN edge locations worldwide
- **Free SSL**: AWS Certificate Manager integration
- **Cost Effective**: No need for EC2 SSL certificates
- **Better Caching**: Static assets cached globally
- **DDoS Protection**: Built-in AWS Shield
- **Custom Domains**: Easy domain management

---

## 📋 Prerequisites

1. **EC2 Instance**: Deployed with HTTP-only configuration
2. **Domain Name**: Registered domain you control
3. **AWS Account**: With CloudFront and Certificate Manager access

---

## 🚀 Step-by-Step Setup

### **Step 1: Deploy EC2 Instance (HTTP Only)**

Use the updated deployment scripts that skip SSL:

```bash
# On your EC2 instance
wget https://raw.githubusercontent.com/YOUR_USERNAME/pr-manager/main/quick-deploy-ec2.sh
chmod +x quick-deploy-ec2.sh
sudo ./quick-deploy-ec2.sh
```

Your EC2 will serve HTTP on port 80 only.

### **Step 2: Request SSL Certificate**

1. **Go to AWS Certificate Manager**

   - Region: **us-east-1** (required for CloudFront)
   - Click "Request a certificate"

2. **Request Public Certificate**

   - Domain names:
     - `your-domain.com`
     - `www.your-domain.com`
   - Validation method: DNS validation (recommended)

3. **Complete DNS Validation**
   - Add CNAME records to your domain DNS
   - Wait for validation (5-30 minutes)

### **Step 3: Create CloudFront Distribution**

1. **Go to CloudFront Console**

   - Click "Create Distribution"

2. **Origin Settings**

   ```
   Origin Domain: your-ec2-public-ip
   Protocol: HTTP Only
   HTTP Port: 80
   Origin Path: (leave empty)
   ```

3. **Default Cache Behavior**

   ```
   Viewer Protocol Policy: Redirect HTTP to HTTPS
   Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   Cache Policy: CachingDisabled (for API routes)
   Origin Request Policy: CORS-S3Origin
   ```

4. **Additional Cache Behaviors** (Add these in order)

   **For Static Assets:**

   ```
   Path Pattern: *.js
   Cache Policy: CachingOptimized
   Origin Request Policy: (none)
   ```

   ```
   Path Pattern: *.css
   Cache Policy: CachingOptimized
   Origin Request Policy: (none)
   ```

   ```
   Path Pattern: *.png
   Cache Policy: CachingOptimized
   Origin Request Policy: (none)
   ```

   ```
   Path Pattern: *.jpg
   Cache Policy: CachingOptimized
   Origin Request Policy: (none)
   ```

   ```
   Path Pattern: /api/*
   Cache Policy: CachingDisabled
   Origin Request Policy: AllViewer
   ```

5. **Distribution Settings**

   ```
   Price Class: Use All Edge Locations (or choose based on your needs)
   Alternate Domain Names (CNAMEs):
     - your-domain.com
     - www.your-domain.com
   SSL Certificate: Custom SSL Certificate (select your ACM certificate)
   Security Policy: TLSv1.2_2021
   ```

6. **Create Distribution**
   - Click "Create Distribution"
   - Wait 10-15 minutes for deployment

### **Step 4: Update DNS Records**

Point your domain to CloudFront:

```
Type: A
Name: your-domain.com
Value: (CloudFront distribution domain name)
Alias: Yes (if using Route 53)

Type: CNAME
Name: www.your-domain.com
Value: your-cloudfront-domain.cloudfront.net
```

### **Step 5: Test Your Setup**

```bash
# Test HTTP redirect to HTTPS
curl -I http://your-domain.com

# Test HTTPS
curl -I https://your-domain.com

# Test API
curl https://your-domain.com/api/health

# Test static assets
curl -I https://your-domain.com/assets/index.js
```

---

## 🔧 CloudFront Cache Policies

### **Custom Cache Policy for API Routes**

Create a custom cache policy for better API handling:

1. **Go to CloudFront → Policies → Cache**
2. **Create Cache Policy**
   ```
   Name: PR-Manager-API-NoCache
   TTL Settings:
     - Default TTL: 0
     - Maximum TTL: 0
   Cache Key Settings:
     - Headers: Include the following headers
       - Authorization
       - Content-Type
       - X-Forwarded-For
     - Query Strings: All
     - Cookies: None
   ```

### **Custom Origin Request Policy**

1. **Go to CloudFront → Policies → Origin Request**
2. **Create Origin Request Policy**
   ```
   Name: PR-Manager-AllHeaders
   Headers: Include the following headers
     - Authorization
     - Content-Type
     - User-Agent
     - X-Forwarded-For
     - CloudFront-Forwarded-Proto
     - CloudFront-Is-Desktop-Viewer
     - CloudFront-Is-Mobile-Viewer
   Query Strings: All
   Cookies: All
   ```

---

## 📊 Optimized Cache Behaviors

Update your CloudFront distribution with these optimized behaviors:

| Path Pattern  | Cache Policy           | Origin Request Policy | Viewer Protocol        |
| ------------- | ---------------------- | --------------------- | ---------------------- |
| `/api/*`      | PR-Manager-API-NoCache | PR-Manager-AllHeaders | Redirect HTTP to HTTPS |
| `/health`     | CachingDisabled        | AllViewer             | Redirect HTTP to HTTPS |
| `*.js`        | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `*.css`       | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `*.png`       | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `*.jpg`       | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `*.svg`       | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `*.ico`       | CachingOptimized       | None                  | Redirect HTTP to HTTPS |
| `Default (*)` | CachingDisabled        | AllViewer             | Redirect HTTP to HTTPS |

---

## 🔍 Health Check Script Update

Update your health check to test CloudFront:

```bash
# Add to health-check.sh
echo "🌐 CloudFront Check:"

# Test CloudFront distribution
if curl -s --max-time 10 https://your-domain.com/health > /dev/null; then
    CF_RESPONSE=$(curl -s https://your-domain.com/health)
    check_pass "CloudFront distribution responding"
    echo "   Response: $CF_RESPONSE"

    # Check CloudFront headers
    CF_HEADERS=$(curl -I -s https://your-domain.com/ | grep -i cloudfront)
    if [ ! -z "$CF_HEADERS" ]; then
        check_pass "CloudFront headers present"
    else
        check_warn "CloudFront headers not detected"
    fi
else
    check_fail "CloudFront distribution not responding"
fi
```

---

## 💰 Cost Optimization

### **CloudFront Pricing**

- **Data Transfer**: $0.085/GB for first 10TB
- **Requests**: $0.0075 per 10,000 HTTP requests
- **SSL Certificate**: Free with ACM

### **Monthly Cost Estimates**

- **Low Traffic** (1GB, 100K requests): ~$1-2
- **Medium Traffic** (10GB, 1M requests): ~$5-10
- **High Traffic** (100GB, 10M requests): ~$15-25

### **Cost Optimization Tips**

1. **Use appropriate cache policies** for static assets
2. **Enable Gzip compression** in CloudFront
3. **Choose optimal price class** based on your audience
4. **Monitor usage** with CloudWatch

---

## 🔧 Troubleshooting

### **Common Issues**

**1. 502 Bad Gateway**

```bash
# Check EC2 health
curl http://your-ec2-ip/health

# Check Nginx status
sudo systemctl status nginx

# Check application logs
journalctl -u pr-manager -f
```

**2. SSL Certificate Issues**

- Ensure certificate is in **us-east-1** region
- Verify domain validation is complete
- Check CNAME records in DNS

**3. Caching Issues**

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**4. API Not Working**

- Check `/api/*` cache behavior is set to no-cache
- Verify origin request policy includes all headers
- Test direct EC2 access: `http://ec2-ip/api/health`

### **Monitoring Commands**

```bash
# Check CloudFront logs (if enabled)
aws logs describe-log-groups --log-group-name-prefix "/aws/cloudfront"

# Monitor EC2 performance
htop
iostat -x 1

# Check Nginx access logs
tail -f /var/log/nginx/access.log
```

---

## 📋 Deployment Checklist

- [ ] EC2 instance deployed with HTTP-only configuration
- [ ] SSL certificate requested and validated in us-east-1
- [ ] CloudFront distribution created and deployed
- [ ] Cache behaviors configured for API and static assets
- [ ] DNS records updated to point to CloudFront
- [ ] Health checks passing for both EC2 and CloudFront
- [ ] API endpoints working through CloudFront
- [ ] Static assets loading with proper caching headers
- [ ] HTTPS redirect working correctly
- [ ] Performance testing completed

---

## 🎯 Final Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Internet  │───▶│  CloudFront  │───▶│     EC2     │───▶│ PR Manager   │
│   (HTTPS)   │    │   (SSL/CDN)  │    │   (HTTP)    │    │ (Node.js API)│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │  ACM SSL     │
                   │ Certificate  │
                   └──────────────┘
```

**Benefits:**

- ✅ Global CDN performance
- ✅ Free SSL with auto-renewal
- ✅ DDoS protection
- ✅ Cost-effective scaling
- ✅ Easy domain management
- ✅ Simplified EC2 configuration

Your PR Manager is now ready for global deployment with CloudFront! 🌐
