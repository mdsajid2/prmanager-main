#!/bin/bash

# CloudFront Setup Helper Script
# This script helps you set up CloudFront distribution for PR Manager

echo "🌐 CloudFront Setup Helper for PR Manager"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    warn "AWS CLI not found. Install it from: https://aws.amazon.com/cli/"
    echo "This script will provide manual setup instructions instead."
    MANUAL_SETUP=true
else
    log "AWS CLI found"
    MANUAL_SETUP=false
fi

# Get configuration
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your EC2 public IP: " EC2_IP
read -p "Enter AWS region for certificate (use us-east-1 for CloudFront): " REGION

if [ -z "$REGION" ]; then
    REGION="us-east-1"
fi

echo ""
info "Configuration:"
echo "  Domain: $DOMAIN"
echo "  EC2 IP: $EC2_IP"
echo "  Region: $REGION"
echo ""

if [ "$MANUAL_SETUP" = true ]; then
    echo "📋 Manual Setup Instructions"
    echo "============================"
    echo ""
    
    echo "1. 📜 Request SSL Certificate:"
    echo "   - Go to AWS Certificate Manager (ACM) in us-east-1 region"
    echo "   - Click 'Request a certificate'"
    echo "   - Add domains: $DOMAIN and www.$DOMAIN"
    echo "   - Choose DNS validation"
    echo "   - Add the CNAME records to your DNS"
    echo ""
    
    echo "2. 🌐 Create CloudFront Distribution:"
    echo "   - Go to CloudFront console"
    echo "   - Click 'Create Distribution'"
    echo "   - Origin Domain: $EC2_IP"
    echo "   - Protocol: HTTP Only"
    echo "   - Port: 8080"
    echo "   - Viewer Protocol Policy: Redirect HTTP to HTTPS"
    echo "   - Alternate Domain Names: $DOMAIN, www.$DOMAIN"
    echo "   - SSL Certificate: Select your ACM certificate"
    echo ""
    
    echo "3. 🔧 Configure Cache Behaviors:"
    echo "   Add these behaviors in order:"
    echo "   - Path: /api/* → Cache Policy: CachingDisabled"
    echo "   - Path: *.js → Cache Policy: CachingOptimized"
    echo "   - Path: *.css → Cache Policy: CachingOptimized"
    echo "   - Path: *.png → Cache Policy: CachingOptimized"
    echo ""
    
    echo "4. 🌍 Update DNS:"
    echo "   - Point $DOMAIN to your CloudFront distribution"
    echo "   - Point www.$DOMAIN to your CloudFront distribution"
    echo ""
    
    echo "5. ✅ Test Setup:"
    echo "   - https://$DOMAIN/health"
    echo "   - https://$DOMAIN/api/health"
    echo ""
    
else
    echo "🚀 Automated Setup"
    echo "=================="
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        warn "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    log "AWS credentials verified"
    
    # Request certificate
    log "Requesting SSL certificate..."
    CERT_ARN=$(aws acm request-certificate \
        --domain-name "$DOMAIN" \
        --subject-alternative-names "www.$DOMAIN" \
        --validation-method DNS \
        --region "$REGION" \
        --query 'CertificateArn' \
        --output text)
    
    if [ $? -eq 0 ]; then
        log "Certificate requested: $CERT_ARN"
        echo "  You need to validate the certificate by adding DNS records."
        echo "  Check ACM console for validation records."
    else
        warn "Failed to request certificate"
    fi
    
    # Create CloudFront distribution config
    log "Creating CloudFront distribution configuration..."
    
    cat > cloudfront-config.json << EOF
{
    "CallerReference": "pr-manager-$(date +%s)",
    "Comment": "PR Manager Distribution",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "pr-manager-origin",
                "DomainName": "$EC2_IP",
                "CustomOriginConfig": {
                    "HTTPPort": 8080,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "pr-manager-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": true,
            "Cookies": {
                "Forward": "all"
            },
            "Headers": {
                "Quantity": 3,
                "Items": ["Authorization", "Content-Type", "X-Forwarded-For"]
            }
        }
    },
    "Enabled": true,
    "Aliases": {
        "Quantity": 2,
        "Items": ["$DOMAIN", "www.$DOMAIN"]
    },
    "ViewerCertificate": {
        "ACMCertificateArn": "$CERT_ARN",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    }
}
EOF
    
    info "CloudFront configuration saved to cloudfront-config.json"
    echo ""
    echo "Next steps:"
    echo "1. Validate your SSL certificate in ACM console"
    echo "2. Create CloudFront distribution:"
    echo "   aws cloudfront create-distribution --distribution-config file://cloudfront-config.json"
    echo "3. Update your DNS to point to the CloudFront distribution"
    echo ""
fi

echo "📚 For detailed setup instructions, see CLOUDFRONT_SETUP.md"
echo ""
echo "🔧 After setup, test with:"
echo "  curl -I https://$DOMAIN/health"
echo "  curl https://$DOMAIN/api/health"
echo ""
echo "🎉 CloudFront setup helper completed!"