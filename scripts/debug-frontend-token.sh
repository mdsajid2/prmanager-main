#!/bin/bash

# Debug Frontend Token Issues
echo "🔍 DEBUGGING FRONTEND TOKEN ISSUES"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEBUG] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "1. CHECKING FRONTEND BUILD"
echo "=========================="

info "Checking if frontend was rebuilt with new admin panel..."
if [ -d "/home/ec2-user/prmanager/web/dist" ]; then
    log "✅ Frontend build exists"
    
    # Check if NewAdminPanel is in the build
    if grep -r "new-admin" /home/ec2-user/prmanager/web/dist/ >/dev/null 2>&1; then
        log "✅ New admin panel found in build"
    else
        warn "⚠️ New admin panel not found in build - need to rebuild frontend"
    fi
else
    error "❌ Frontend build not found"
fi

echo ""
echo "2. REBUILDING FRONTEND"
echo "======================"

info "Rebuilding frontend with new admin panel..."
cd /home/ec2-user/prmanager/web

# Build frontend
if npm run build; then
    log "✅ Frontend rebuilt successfully"
else
    error "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "3. TESTING FRONTEND ACCESS"
echo "=========================="

info "Testing if new admin route is accessible..."

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost')

# Test main page
MAIN_PAGE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/ 2>/dev/null)
echo "Main page response: $MAIN_PAGE"

if [ "$MAIN_PAGE" = "200" ]; then
    log "✅ Main page accessible"
else
    error "❌ Main page not accessible"
fi

echo ""
echo "4. CHECKING BROWSER CONSOLE ERRORS"
echo "=================================="

info "Common frontend token issues and solutions:"
echo ""
echo "🔧 FRONTEND TOKEN DEBUG STEPS:"
echo "1. Open browser dev tools (F12)"
echo "2. Go to Application/Storage tab"
echo "3. Check localStorage for 'auth_token'"
echo "4. Go to Console tab and look for errors"
echo "5. Go to Network tab and check API calls"
echo ""
echo "🎯 EXPECTED BEHAVIOR:"
echo "- auth_token should be in localStorage"
echo "- API calls should have 'Authorization: Bearer <token>' header"
echo "- Token should be the same as from our test: eyJhbGciOiJIUzI1NiIs..."
echo ""
echo "❌ COMMON ISSUES:"
echo "- Token not saved in localStorage"
echo "- Token not being sent in API requests"
echo "- Frontend using cached old version"
echo ""

echo ""
echo "5. MANUAL TEST INSTRUCTIONS"
echo "==========================="

echo ""
log "🌐 ACCESS INSTRUCTIONS:"
echo "1. Go to: http://$PUBLIC_IP:8080/"
echo "2. Login with: mdsajid8636@gmail.com"
echo "3. After login, go to: http://$PUBLIC_IP:8080/new-admin"
echo "4. Check browser console for any errors"
echo ""
echo "🔧 IF STILL GETTING 401 ERRORS:"
echo "1. Clear browser cache and localStorage"
echo "2. Login again"
echo "3. Check if token is saved in localStorage"
echo "4. Try the new admin panel again"
echo ""

echo ""
echo "6. CREATING SIMPLE TOKEN TEST PAGE"
echo "=================================="

info "Creating a simple test page to debug token issues..."

cat > /home/ec2-user/prmanager/web/dist/token-test.html << 'TOKEN_TEST'
<!DOCTYPE html>
<html>
<head>
    <title>Token Debug Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Token Debug Test</h1>
    
    <div class="result info">
        <h3>Current Status:</h3>
        <p id="status">Checking...</p>
    </div>
    
    <div class="result">
        <h3>Actions:</h3>
        <button onclick="checkToken()">Check Token</button>
        <button onclick="testLogin()">Test Login</button>
        <button onclick="testAdminAPI()">Test Admin API</button>
        <button onclick="clearStorage()">Clear Storage</button>
    </div>
    
    <div class="result">
        <h3>Results:</h3>
        <pre id="results">Click buttons above to run tests...</pre>
    </div>

    <script>
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
        
        function log(message) {
            const results = document.getElementById('results');
            results.textContent += new Date().toLocaleTimeString() + ': ' + message + '\n';
        }
        
        function updateStatus(message, isError = false) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = isError ? 'error' : 'success';
        }
        
        function checkToken() {
            log('=== CHECKING TOKEN ===');
            const token = localStorage.getItem('auth_token');
            if (token) {
                log('✅ Token found in localStorage');
                log('Token: ' + token.substring(0, 50) + '...');
                updateStatus('Token found in localStorage');
            } else {
                log('❌ No token found in localStorage');
                updateStatus('No token found - please login first', true);
            }
            
            // Check other storage
            const guestMode = localStorage.getItem('guest_mode');
            log('Guest mode: ' + guestMode);
        }
        
        async function testLogin() {
            log('=== TESTING LOGIN ===');
            try {
                const response = await fetch(API_BASE + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'mdsajid8636@gmail.com',
                        password: 'SahYan@2020'
                    })
                });
                
                log('Login response status: ' + response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    log('✅ Login successful');
                    log('Token received: ' + data.token.substring(0, 50) + '...');
                    localStorage.setItem('auth_token', data.token);
                    updateStatus('Login successful - token saved');
                } else {
                    const error = await response.text();
                    log('❌ Login failed: ' + error);
                    updateStatus('Login failed', true);
                }
            } catch (error) {
                log('❌ Login error: ' + error.message);
                updateStatus('Login error: ' + error.message, true);
            }
        }
        
        async function testAdminAPI() {
            log('=== TESTING ADMIN API ===');
            const token = localStorage.getItem('auth_token');
            
            if (!token) {
                log('❌ No token available - login first');
                updateStatus('No token - login first', true);
                return;
            }
            
            try {
                log('Testing new admin users endpoint...');
                const response = await fetch(API_BASE + '/api/new-admin/users', {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                log('Admin API response status: ' + response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    log('✅ Admin API successful');
                    log('Users found: ' + data.length);
                    updateStatus('Admin API working - ' + data.length + ' users found');
                } else {
                    const error = await response.text();
                    log('❌ Admin API failed: ' + error);
                    updateStatus('Admin API failed: ' + error, true);
                }
            } catch (error) {
                log('❌ Admin API error: ' + error.message);
                updateStatus('Admin API error: ' + error.message, true);
            }
        }
        
        function clearStorage() {
            log('=== CLEARING STORAGE ===');
            localStorage.clear();
            sessionStorage.clear();
            log('✅ Storage cleared');
            updateStatus('Storage cleared - please login again');
        }
        
        // Initial check
        window.onload = function() {
            checkToken();
        };
    </script>
</body>
</html>
TOKEN_TEST

log "✅ Token test page created"

echo ""
echo "7. FINAL INSTRUCTIONS"
echo "===================="

echo ""
log "🎯 NEXT STEPS:"
echo "1. Go to: http://$PUBLIC_IP:8080/token-test.html"
echo "2. Click 'Test Login' to get a fresh token"
echo "3. Click 'Test Admin API' to verify it works"
echo "4. If that works, try the new admin panel: http://$PUBLIC_IP:8080/new-admin"
echo ""
echo "🔧 IF TOKEN TEST WORKS BUT ADMIN PANEL DOESN'T:"
echo "- The issue is in the React component"
echo "- Clear browser cache completely"
echo "- Try incognito/private browsing mode"
echo ""

log "✅ Frontend debugging setup complete!"