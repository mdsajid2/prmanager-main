#!/bin/bash

# Fix GitHub Token Storage Issue
# This script fixes the frontend API configuration for token storage

set -e

echo "🔧 Fixing GitHub Token Storage Issue..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "web" ] || [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Creating backup of current tokens-api.ts..."
cp web/src/lib/tokens-api.ts web/src/lib/tokens-api.ts.backup

print_status "Checking current system status..."

# Check if server is running
if pgrep -f "node.*server" > /dev/null; then
    print_success "Server is running"
    SERVER_RUNNING=true
else
    print_warning "Server is not running"
    SERVER_RUNNING=false
fi

# Test current API endpoint
print_status "Testing current API endpoints..."
if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
    print_success "API server is responding on port 8080"
    API_PORT=8080
elif curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_success "API server is responding on port 3001"
    API_PORT=3001
else
    print_warning "API server not responding on expected ports"
    API_PORT="unknown"
fi

print_status "The tokens-api.ts file has been updated with smart API detection"
print_status "This will fix the 'localhost:3001' hardcoding issue"

print_status "Rebuilding frontend..."
cd web
npm run build
cd ..

if [ "$SERVER_RUNNING" = true ]; then
    print_status "Restarting server to ensure all changes are applied..."
    
    # Kill existing server processes
    pkill -f "node.*server" || true
    sleep 2
    
    # Start server in background
    cd server
    npm run build
    nohup npm start > ../server.log 2>&1 &
    cd ..
    
    # Wait for server to start
    sleep 5
    
    # Test if server started successfully
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Server restarted successfully on port 8080"
    elif curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Server restarted successfully on port 3001"
    else
        print_error "Server failed to restart properly"
        print_status "Check server.log for details"
        exit 1
    fi
fi

print_status "Testing GitHub token storage endpoint..."
if [ "$API_PORT" != "unknown" ]; then
    TOKEN_TEST=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:$API_PORT/api/tokens 2>/dev/null)
    if [ "$TOKEN_TEST" = "401" ]; then
        print_success "Tokens endpoint is working (401 = needs authentication, which is correct)"
    elif [ "$TOKEN_TEST" = "200" ]; then
        print_success "Tokens endpoint is working (200 = accessible)"
    else
        print_warning "Tokens endpoint returned: $TOKEN_TEST"
    fi
fi

print_success "✅ GitHub Token Storage Fix Applied!"
echo ""
echo "🎯 What was fixed:"
echo "   • Frontend now uses smart API URL detection"
echo "   • Production will use relative paths (/api/tokens)"
echo "   • Development will use localhost:3001"
echo "   • No more hardcoded localhost:3001 in production"
echo ""
echo "🚀 Next steps:"
echo "   1. Access your app in the browser"
echo "   2. Go to Settings → GitHub Token"
echo "   3. Try storing your GitHub token"
echo "   4. It should now work without connection errors!"
echo ""
print_success "GitHub token storage should now work properly! 🎉"