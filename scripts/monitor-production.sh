#!/bin/bash

# =============================================================================
# PR Manager Production Monitoring Script
# =============================================================================
# This script provides real-time monitoring and health checks for the
# production deployment.
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

header() {
    echo -e "${CYAN}$1${NC}"
}

# Function to check service health
check_health() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        success "$description: $status"
        return 0
    else
        error "$description: $status (expected $expected_status)"
        return 1
    fi
}

# Function to get PM2 info
get_pm2_info() {
    if command -v jq >/dev/null 2>&1; then
        pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="pr-manager") | "\(.pm2_env.status)|\(.monit.memory)|\(.monit.cpu)|\(.pm2_env.restart_time)"' 2>/dev/null || echo "unknown|0|0|0"
    else
        echo "unknown|0|0|0"
    fi
}

# Function to format bytes
format_bytes() {
    local bytes=$1
    if [ "$bytes" -gt 1073741824 ]; then
        echo "$(echo $bytes | awk '{print int($1/1024/1024/1024)"GB"}')"
    elif [ "$bytes" -gt 1048576 ]; then
        echo "$(echo $bytes | awk '{print int($1/1024/1024)"MB"}')"
    elif [ "$bytes" -gt 1024 ]; then
        echo "$(echo $bytes | awk '{print int($1/1024)"KB"}')"
    else
        echo "${bytes}B"
    fi
}

# Main monitoring function
monitor() {
    clear
    
    header "🔍 PR Manager Production Monitor"
    header "================================"
    echo ""
    
    # System Information
    header "📊 System Information"
    echo "--------------------"
    echo "🕐 Current Time: $(date)"
    echo "🖥️  Hostname: $(hostname)"
    echo "👤 User: $(whoami)"
    echo "📁 Working Directory: $(pwd)"
    echo ""
    
    # PM2 Service Status
    header "🚀 PM2 Service Status"
    echo "---------------------"
    
    if command -v pm2 >/dev/null 2>&1; then
        local pm2_info=$(get_pm2_info)
        IFS='|' read -r status memory cpu restarts <<< "$pm2_info"
        
        if [ "$status" = "online" ]; then
            success "Service Status: $status"
        elif [ "$status" = "stopped" ]; then
            error "Service Status: $status"
        else
            warning "Service Status: $status"
        fi
        
        echo "💾 Memory Usage: $(format_bytes $memory)"
        echo "🔥 CPU Usage: ${cpu}%"
        echo "🔄 Restarts: $restarts"
        
        # Show recent logs
        echo ""
        header "📝 Recent Logs (last 5 lines)"
        echo "-----------------------------"
        pm2 logs pr-manager --lines 5 --nostream 2>/dev/null || echo "No logs available"
    else
        error "PM2 not found"
    fi
    
    echo ""
    
    # Health Checks
    header "🏥 Health Checks"
    echo "----------------"
    
    local health_passed=0
    local total_checks=4
    
    # Basic health check
    if check_health "http://localhost:8080/health" "200" "Health Endpoint"; then
        ((health_passed++))
    fi
    
    # API endpoint check
    if check_health "http://localhost:8080/api/analyze" "400" "Analyze Endpoint" || check_health "http://localhost:8080/api/analyze" "405" "Analyze Endpoint"; then
        ((health_passed++))
    fi
    
    # Enhanced usage endpoint (should require auth)
    if check_health "http://localhost:8080/api/enhanced-usage" "401" "Enhanced Usage Endpoint"; then
        ((health_passed++))
    fi
    
    # Referral info endpoint (should require auth)
    if check_health "http://localhost:8080/api/referral-info" "401" "Referral Info Endpoint"; then
        ((health_passed++))
    fi
    
    echo ""
    if [ "$health_passed" -eq "$total_checks" ]; then
        success "All health checks passed ($health_passed/$total_checks)"
    else
        warning "Health checks: $health_passed/$total_checks passed"
    fi
    
    echo ""
    
    # Database Connection
    header "🗄️  Database Status"
    echo "------------------"
    
    if [ -f ".env" ] && grep -q "DATABASE_URL" ".env"; then
        info "Database URL configured"
        
        # Try a simple database query
        if command -v node >/dev/null 2>&1; then
            local db_status=$(node -e "
                const { Pool } = require('pg');
                require('dotenv').config();
                const pool = new Pool({ 
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false
                });
                pool.connect()
                    .then(client => {
                        client.query('SELECT NOW()')
                            .then(() => {
                                console.log('connected');
                                client.release();
                                pool.end();
                            })
                            .catch(() => {
                                console.log('query_failed');
                                client.release();
                                pool.end();
                            });
                    })
                    .catch(() => {
                        console.log('connection_failed');
                        pool.end();
                    });
            " 2>/dev/null || echo "test_failed")
            
            case "$db_status" in
                "connected")
                    success "Database connection successful"
                    ;;
                "connection_failed")
                    error "Database connection failed"
                    ;;
                "query_failed")
                    warning "Database connected but query failed"
                    ;;
                *)
                    warning "Database test inconclusive"
                    ;;
            esac
        else
            warning "Node.js not available for database test"
        fi
    else
        error "Database URL not configured"
    fi
    
    echo ""
    
    # Disk Usage
    header "💾 Disk Usage"
    echo "-------------"
    df -h / | tail -1 | awk '{print "🗂️  Root: " $3 " used, " $4 " available (" $5 " full)"}'
    
    if [ -d "/home/ec2-user/prmanager" ]; then
        du -sh /home/ec2-user/prmanager 2>/dev/null | awk '{print "📁 Project: " $1}'
    fi
    
    if [ -d "/home/ec2-user/backups" ]; then
        du -sh /home/ec2-user/backups 2>/dev/null | awk '{print "💾 Backups: " $1}' || echo "💾 Backups: Not found"
    fi
    
    echo ""
    
    # Memory Usage
    header "🧠 Memory Usage"
    echo "---------------"
    free -h | grep "Mem:" | awk '{print "🧠 Memory: " $3 " used, " $7 " available"}'
    
    echo ""
    
    # Load Average
    header "⚡ System Load"
    echo "-------------"
    uptime | awk -F'load average:' '{print "📈 Load Average:" $2}'
    
    echo ""
    
    # Quick Actions
    header "🎛️  Quick Actions"
    echo "----------------"
    echo "r) Restart service"
    echo "l) View logs"
    echo "s) PM2 status"
    echo "m) PM2 monitor"
    echo "b) List backups"
    echo "h) Health check only"
    echo "q) Quit"
    echo ""
    echo -n "Choose an action (or press Enter to refresh): "
}

# Function to handle user input
handle_input() {
    local choice
    read -t 1 choice 2>/dev/null || choice=""
    
    case "$choice" in
        "r"|"R")
            echo ""
            info "Restarting service..."
            pm2 restart pr-manager
            sleep 2
            ;;
        "l"|"L")
            echo ""
            info "Showing logs (press Ctrl+C to return)..."
            pm2 logs pr-manager
            ;;
        "s"|"S")
            echo ""
            pm2 status
            echo ""
            echo "Press Enter to continue..."
            read
            ;;
        "m"|"M")
            echo ""
            info "Opening PM2 monitor (press 'q' to return)..."
            pm2 monit
            ;;
        "b"|"B")
            echo ""
            if [ -d "/home/ec2-user/backups" ]; then
                ls -la /home/ec2-user/backups/ | grep "prmanager_backup_"
            else
                echo "No backups directory found"
            fi
            echo ""
            echo "Press Enter to continue..."
            read
            ;;
        "h"|"H")
            echo ""
            header "🏥 Running Health Checks..."
            check_health "http://localhost:8080/health" "200" "Health Endpoint"
            check_health "http://localhost:8080/api/analyze" "400" "Analyze Endpoint"
            check_health "http://localhost:8080/api/enhanced-usage" "401" "Enhanced Usage Endpoint"
            check_health "http://localhost:8080/api/referral-info" "401" "Referral Info Endpoint"
            echo ""
            echo "Press Enter to continue..."
            read
            ;;
        "q"|"Q")
            echo ""
            info "Exiting monitor..."
            exit 0
            ;;
        "")
            # Just refresh (do nothing)
            ;;
        *)
            echo ""
            warning "Invalid option: $choice"
            sleep 1
            ;;
    esac
}

# Main loop
main() {
    if [ "$1" = "--once" ]; then
        monitor
        echo ""
        exit 0
    fi
    
    while true; do
        monitor
        handle_input
        sleep 1
    done
}

# Show usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --once     Run monitoring once and exit"
    echo "  --help     Show this help message"
    echo ""
    echo "Interactive Commands:"
    echo "  r) Restart service"
    echo "  l) View logs"
    echo "  s) PM2 status"
    echo "  m) PM2 monitor"
    echo "  b) List backups"
    echo "  h) Health check only"
    echo "  q) Quit"
    echo ""
    exit 0
fi

# Run main function
main "$@"