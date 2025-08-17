#!/bin/bash

# Health Check Script for PR Manager
# Run this to verify your deployment is working correctly

echo "🏥 PR Manager Health Check"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✅ $1${NC}"; }
check_fail() { echo -e "${RED}❌ $1${NC}"; }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Check if running on EC2
if curl -s --max-time 2 http://169.254.169.254/latest/meta-data/instance-id > /dev/null 2>&1; then
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "🌐 EC2 Instance: $INSTANCE_ID"
    echo "🌐 Public IP: $PUBLIC_IP"
else
    echo "🖥️  Running on local/non-EC2 environment"
fi

echo ""

# Check system resources
echo "💾 System Resources:"
echo "   Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "   Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not installed"
fi

echo ""

# Check application files
if [ -d "/opt/pr-manager" ]; then
    check_pass "Application directory exists"
    
    if [ -f "/opt/pr-manager/.env" ]; then
        check_pass "Environment file exists"
    else
        check_warn "Environment file missing"
    fi
    
    if [ -d "/opt/pr-manager/server/dist" ]; then
        check_pass "Server build exists"
    else
        check_fail "Server not built"
    fi
    
    if [ -d "/opt/pr-manager/web/dist" ]; then
        check_pass "Frontend build exists"
    else
        check_fail "Frontend not built"
    fi
else
    check_fail "Application directory not found"
fi

echo ""

# Check systemd service
if systemctl is-active --quiet pr-manager; then
    check_pass "PR Manager service is running"
    
    # Check if service is listening on port
    if ss -tulpn | grep -q ":3001"; then
        check_pass "Service listening on port 3001"
    else
        check_fail "Service not listening on port 3001"
    fi
else
    check_fail "PR Manager service is not running"
    echo "   Try: sudo systemctl start pr-manager"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    check_pass "Nginx is running"
    
    if ss -tulpn | grep -q ":80"; then
        check_pass "Nginx listening on port 80"
    else
        check_fail "Nginx not listening on port 80"
    fi
    
    # Port 443 not needed - CloudFront handles HTTPS
    check_pass "HTTPS handled by CloudFront (port 443 not needed locally)"
else
    check_fail "Nginx is not running"
fi

echo ""

# Check API health endpoint
echo "🔍 Testing API endpoints:"

if curl -s --max-time 5 http://localhost:3001/health > /dev/null; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
    check_pass "API health endpoint responding"
    echo "   Response: $HEALTH_RESPONSE"
else
    check_fail "API health endpoint not responding"
fi

# Test frontend (if Nginx is running)
if systemctl is-active --quiet nginx; then
    if curl -s --max-time 5 http://localhost/ > /dev/null; then
        check_pass "Frontend accessible via Nginx"
    else
        check_fail "Frontend not accessible via Nginx"
    fi
fi

echo ""

# Check firewall
echo "🔥 Firewall Status:"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if [[ $UFW_STATUS == *"active"* ]]; then
        check_pass "UFW firewall is active"
    else
        check_warn "UFW firewall is inactive"
    fi
else
    check_warn "UFW not installed"
fi

echo ""

# SSL is handled by CloudFront - no local certificates needed
check_pass "SSL handled by CloudFront (no local certificates needed)"

echo ""

# Check recent logs for errors
echo "📝 Recent Error Check:"
if journalctl -u pr-manager --since "1 hour ago" | grep -i error > /dev/null; then
    check_warn "Errors found in recent logs"
    echo "   Check with: journalctl -u pr-manager --since '1 hour ago' | grep -i error"
else
    check_pass "No recent errors in logs"
fi

echo ""

# Performance check
echo "⚡ Performance Check:"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3001/health 2>/dev/null || echo "failed")
if [ "$RESPONSE_TIME" != "failed" ]; then
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        check_pass "API response time: ${RESPONSE_TIME}s"
    else
        check_warn "API response time slow: ${RESPONSE_TIME}s"
    fi
else
    check_fail "Could not measure API response time"
fi

echo ""

# Summary
echo "📊 Health Check Summary"
echo "======================"

if systemctl is-active --quiet pr-manager && systemctl is-active --quiet nginx; then
    echo -e "${GREEN}🎉 PR Manager is healthy and running!${NC}"
    
    if [ ! -z "$PUBLIC_IP" ]; then
        echo "🌐 Access your app at: http://$PUBLIC_IP"
    fi
    
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs: journalctl -u pr-manager -f"
    echo "   Restart: sudo systemctl restart pr-manager"
    echo "   Update: /opt/pr-manager/update.sh"
    echo "   Monitor: /opt/pr-manager/monitor.sh"
else
    echo -e "${RED}⚠️  PR Manager has issues that need attention${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   Check service: sudo systemctl status pr-manager"
    echo "   View logs: journalctl -u pr-manager -f"
    echo "   Check Nginx: sudo systemctl status nginx"
fi

echo ""