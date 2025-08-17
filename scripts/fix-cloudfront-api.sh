#!/bin/bash

# CloudFront API Fix Script
echo "🔧 CloudFront API Configuration Fix"
echo "===================================="

echo "This script helps you fix CloudFront API routing issues."
echo ""

# Get distribution ID
echo "1. Get your CloudFront Distribution ID:"
echo "   - Go to CloudFront Console"
echo "   - Copy your distribution ID"
echo ""
read -p "Enter your CloudFront Distribution ID: " DIST_ID

if [ -z "$DIST_ID" ]; then
    echo "❌ Distribution ID is required"
    exit 1
fi

echo ""
echo "2. Checking current distribution config..."

# Get current config
aws cloudfront get-distribution-config --id "$DIST_ID" > current-config.json 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Failed to get distribution config. Make sure:"
    echo "   - AWS CLI is configured"
    echo "   - You have CloudFront permissions"
    echo "   - Distribution ID is correct"
    exit 1
fi

echo "✅ Current config retrieved"

echo ""
echo "3. Manual Configuration Steps:"
echo "=============================="
echo ""
echo "Go to CloudFront Console and configure these behaviors:"
echo ""
echo "🔹 Behavior 1: /api/*"
echo "   - Path Pattern: /api/*"
echo "   - Origin: Your EC2 origin"
echo "   - Cache Policy: CachingDisabled"
echo "   - Origin Request Policy: CORS-S3Origin"
echo "   - Viewer Protocol Policy: Redirect HTTP to HTTPS"
echo "   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE"
echo ""
echo "🔹 Behavior 2: Default (*)"
echo "   - Path Pattern: Default (*)"
echo "   - Origin: Your EC2 origin"
echo "   - Cache Policy: CachingOptimized"
echo "   - Viewer Protocol Policy: Redirect HTTP to HTTPS"
echo ""
echo "4. After making changes:"
echo "   - Create invalidation for /*"
echo "   - Wait 5-10 minutes for deployment"
echo ""
echo "5. Test the fix:"
echo "   curl -I https://your-domain.com/api/health"
echo "   curl -I https://your-domain.com/health"
echo ""

# Create invalidation
read -p "Create cache invalidation now? (y/n): " CREATE_INVALIDATION

if [[ $CREATE_INVALIDATION =~ ^[Yy]$ ]]; then
    echo "Creating invalidation..."
    aws cloudfront create-invalidation \
        --distribution-id "$DIST_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text
    
    if [ $? -eq 0 ]; then
        echo "✅ Invalidation created successfully"
    else
        echo "❌ Failed to create invalidation"
    fi
fi

echo ""
echo "🎯 Common Issues & Solutions:"
echo "============================"
echo ""
echo "❌ 403 Forbidden:"
echo "   - Check Origin Request Policy allows all headers"
echo "   - Ensure EC2 security group allows port 8080"
echo "   - Verify Origin domain and port are correct"
echo ""
echo "❌ CORS Errors:"
echo "   - Ensure /api/* behavior has CachingDisabled"
echo "   - Check Origin Request Policy forwards headers"
echo "   - Verify allowed HTTP methods include OPTIONS"
echo ""
echo "❌ Still getting HTML:"
echo "   - Wait for CloudFront deployment (5-10 minutes)"
echo "   - Clear browser cache"
echo "   - Test with curl instead of browser"
echo ""
echo "✅ Test Commands:"
echo "   curl -v https://your-domain.com/api/health"
echo "   curl -X POST https://your-domain.com/api/auth/login"
echo ""
echo "🎉 Configuration help completed!"