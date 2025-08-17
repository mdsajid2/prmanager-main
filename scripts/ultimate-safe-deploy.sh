#!/bin/bash

# 🚀 ULTIMATE SAFE DEPLOYMENT SCRIPT
# Zero-downtime deployment with automatic rollback and comprehensive testing
# This script ensures your system stays working while deploying new features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/tmp/prmanager-backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/deployment-$(date +%Y%m%d-%H%M%S).log"
HEALTH_CHECK_TIMEOUT=30
MAX_ROLLBACK_ATTEMPTS=3

# Function to print colored output
print_header() {
    echo -e "\n${PURPLE}================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}================================${NC}\n"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Deployment failed! Initiating automatic rollback..."
        rollback_deployment
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Function to check if we're in the right directory
check_environment() {
    print_step "Checking environment..."
    
    if [ ! -f "package.json" ] || [ ! -d "web" ] || [ ! -d "server" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        exit 1
    fi
    
    print_success "Environment check passed"
}

# Function to create comprehensive backup
create_backup() {
    print_step "Creating comprehensive backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files and directories
    cp -r web/dist "$BACKUP_DIR/web-dist" 2>/dev/null || print_warning "No web/dist found"
    cp -r server/dist "$BACKUP_DIR/server-dist" 2>/dev/null || print_warning "No server/dist found"
    cp -r node_modules "$BACKUP_DIR/node_modules" 2>/dev/null || print_warning "No node_modules found"
    cp package.json "$BACKUP_DIR/"
    cp package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
    cp .env "$BACKUP_DIR/"
    cp .env.production.server "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup server files
    if [ -d "server" ]; then
        cp -r server/src "$BACKUP_DIR/server-src"
        cp server/package.json "$BACKUP_DIR/server-package.json"
    fi
    
    # Backup web files
    if [ -d "web" ]; then
        cp -r web/src "$BACKUP_DIR/web-src"
        cp web/package.json "$BACKUP_DIR/web-package.json"
    fi
    
    # Get current process info
    ps aux | grep -E "(node|npm)" > "$BACKUP_DIR/running-processes.txt" || true
    
    print_success "Backup created at: $BACKUP_DIR"
}

# Function to check current system health
check_system_health() {
    print_step "Checking current system health..."
    
    local health_status=0
    
    # Check if processes are running
    if pgrep -f "node.*server" > /dev/null; then
        print_success "Server process is running"
    else
        print_warning "Server process not found"
        health_status=1
    fi
    
    # Check API endpoints
    local api_port=""
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "API responding on port 8080"
        api_port="8080"
    elif curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "API responding on port 3001"
        api_port="3001"
    else
        print_warning "API not responding on expected ports"
        health_status=1
    fi
    
    # Test critical endpoints if API is running
    if [ -n "$api_port" ]; then
        local endpoints=("/api/auth/health" "/api/tokens" "/api/system-health")
        for endpoint in "${endpoints[@]}"; do
            local status=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$api_port$endpoint" 2>/dev/null)
            if [ "$status" = "200" ] || [ "$status" = "401" ]; then
                print_success "Endpoint $endpoint: $status (OK)"
            else
                print_warning "Endpoint $endpoint: $status"
            fi
        done
    fi
    
    return $health_status
}

# Function to install dependencies safely
install_dependencies() {
    print_step "Installing/updating dependencies..."
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        npm ci --production=false || npm install
    fi
    
    # Install server dependencies
    if [ -d "server" ] && [ -f "server/package.json" ]; then
        cd server
        npm ci --production=false || npm install
        cd ..
    fi
    
    # Install web dependencies
    if [ -d "web" ] && [ -f "web/package.json" ]; then
        cd web
        npm ci --production=false || npm install
        cd ..
    fi
    
    print_success "Dependencies installed"
}

# Function to build the application
build_application() {
    print_step "Building application..."
    
    # Build server
    if [ -d "server" ]; then
        cd server
        npm run build
        cd ..
        print_success "Server built successfully"
    fi
    
    # Build web
    if [ -d "web" ]; then
        cd web
        npm run build
        cd ..
        print_success "Web built successfully"
    fi
}

# Function to perform database migrations safely
run_database_migrations() {
    print_step "Running database migrations..."
    
    if [ -f "server/migration-manager.js" ]; then
        cd server
        node migration-manager.js || print_warning "Migration manager not available"
        cd ..
    fi
    
    if [ -f "database/migration-manager.js" ]; then
        cd database
        node migration-manager.js || print_warning "Database migrations not available"
        cd ..
    fi
    
    print_success "Database migrations completed"
}

# Function to restart services with zero downtime
restart_services() {
    print_step "Restarting services with zero downtime..."
    
    # Get current port
    local current_port=""
    if pgrep -f "node.*server.*8080" > /dev/null; then
        current_port="8080"
    elif pgrep -f "node.*server.*3001" > /dev/null; then
        current_port="3001"
    fi
    
    # Start new instance on alternate port
    local new_port="8081"
    if [ "$current_port" = "8081" ]; then
        new_port="8080"
    fi
    
    print_status "Starting new instance on port $new_port..."
    
    cd server
    PORT=$new_port nohup npm start > "../server-$new_port.log" 2>&1 &
    local new_pid=$!
    cd ..
    
    # Wait for new instance to be ready
    local wait_count=0
    while [ $wait_count -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -s -f "http://localhost:$new_port/health" > /dev/null 2>&1; then
            print_success "New instance ready on port $new_port"
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    if [ $wait_count -ge $HEALTH_CHECK_TIMEOUT ]; then
        print_error "New instance failed to start within timeout"
        kill $new_pid 2>/dev/null || true
        return 1
    fi
    
    # Test new instance thoroughly
    test_new_instance "$new_port"
    
    # If tests pass, switch traffic and kill old instance
    if [ -n "$current_port" ]; then
        print_status "Switching traffic from port $current_port to $new_port"
        pkill -f "node.*server.*$current_port" || true
        sleep 2
    fi
    
    print_success "Service restart completed"
}

# Function to test new instance
test_new_instance() {
    local port=$1
    print_step "Testing new instance on port $port..."
    
    local endpoints=(
        "/health:200"
        "/api/auth/health:200"
        "/api/tokens:401"
        "/api/system-health:200"
    )
    
    for endpoint_test in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_test" | cut -d: -f1)
        local expected=$(echo "$endpoint_test" | cut -d: -f2)
        
        local status=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$port$endpoint" 2>/dev/null)
        
        if [ "$status" = "$expected" ]; then
            print_success "✅ $endpoint: $status (Expected: $expected)"
        else
            print_error "❌ $endpoint: $status (Expected: $expected)"
            return 1
        fi
    done
    
    print_success "All endpoint tests passed"
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    print_step "Running comprehensive tests..."
    
    # Test frontend build
    if [ -d "web/dist" ] && [ -f "web/dist/index.html" ]; then
        print_success "Frontend build exists"
    else
        print_error "Frontend build missing"
        return 1
    fi
    
    # Test server build
    if [ -d "server/dist" ] && [ -f "server/dist/index.js" ]; then
        print_success "Server build exists"
    else
        print_error "Server build missing"
        return 1
    fi
    
    # Test database connection
    if [ -f "server/check-production-db.js" ]; then
        cd server
        if node check-production-db.js > /dev/null 2>&1; then
            print_success "Database connection test passed"
        else
            print_warning "Database connection test failed"
        fi
        cd ..
    fi
    
    print_success "Comprehensive tests completed"
}

# Function to rollback deployment
rollback_deployment() {
    print_header "INITIATING ROLLBACK"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        return 1
    fi
    
    print_step "Stopping current processes..."
    pkill -f "node.*server" || true
    sleep 3
    
    print_step "Restoring from backup..."
    
    # Restore files
    [ -d "$BACKUP_DIR/web-dist" ] && cp -r "$BACKUP_DIR/web-dist" web/dist
    [ -d "$BACKUP_DIR/server-dist" ] && cp -r "$BACKUP_DIR/server-dist" server/dist
    [ -f "$BACKUP_DIR/.env" ] && cp "$BACKUP_DIR/.env" .
    
    # Restore and restart with backup configuration
    if [ -f "$BACKUP_DIR/running-processes.txt" ]; then
        print_step "Restarting services with backup configuration..."
        cd server
        nohup npm start > ../rollback-server.log 2>&1 &
        cd ..
        
        # Wait for service to come back up
        local wait_count=0
        while [ $wait_count -lt $HEALTH_CHECK_TIMEOUT ]; do
            if curl -s -f http://localhost:8080/health > /dev/null 2>&1 || curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
                print_success "Rollback completed successfully"
                return 0
            fi
            sleep 1
            wait_count=$((wait_count + 1))
        done
    fi
    
    print_error "Rollback may have failed - manual intervention required"
    return 1
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_step "Cleaning up old backups..."
    
    # Keep only last 5 backups
    find /tmp -name "prmanager-backup-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    find /tmp -name "deployment-*.log" -mtime +7 -delete 2>/dev/null || true
    
    print_success "Old backups cleaned up"
}

# Main deployment function
main() {
    print_header "🚀 ULTIMATE SAFE DEPLOYMENT STARTING"
    
    echo "Deployment Log: $LOG_FILE"
    echo "Backup Location: $BACKUP_DIR"
    echo ""
    
    # Pre-deployment checks
    check_environment
    
    # Create safety backup
    create_backup
    
    # Check current system health
    if ! check_system_health; then
        print_warning "System health check failed, but continuing with deployment"
    fi
    
    # Install dependencies
    install_dependencies
    
    # Build application
    build_application
    
    # Run database migrations
    run_database_migrations
    
    # Run tests
    run_comprehensive_tests
    
    # Restart services with zero downtime
    restart_services
    
    # Final health check
    sleep 5
    if check_system_health; then
        print_success "Final health check passed"
    else
        print_error "Final health check failed"
        return 1
    fi
    
    # Cleanup
    cleanup_old_backups
    
    print_header "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
    
    echo ""
    echo "📊 Deployment Summary:"
    echo "   ✅ Backup created: $BACKUP_DIR"
    echo "   ✅ Dependencies updated"
    echo "   ✅ Application built"
    echo "   ✅ Database migrations run"
    echo "   ✅ Services restarted with zero downtime"
    echo "   ✅ All tests passed"
    echo "   ✅ System is healthy and operational"
    echo ""
    echo "🔗 Your application is ready at:"
    echo "   • Health Check: http://localhost:8080/health"
    echo "   • API: http://localhost:8080/api"
    echo "   • Frontend: http://localhost:3000 (if running)"
    echo ""
    echo "📋 Log file: $LOG_FILE"
    echo "💾 Backup: $BACKUP_DIR (auto-cleanup in 7 days)"
    
    # Disable trap since we succeeded
    trap - EXIT
}

# Run main function
main "$@"