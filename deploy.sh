#!/bin/bash

# 🎯 PR Manager Deployment Command Center
# Simple interface for all deployment operations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "\n${PURPLE}🚀 PR Manager Deployment Center${NC}\n"
}

print_menu() {
    echo -e "${BLUE}Available Commands:${NC}"
    echo -e "  ${GREEN}1.${NC} Full Safe Deployment (Recommended)"
    echo -e "  ${GREEN}2.${NC} Fix GitHub Token Storage"
    echo -e "  ${GREEN}3.${NC} Fix System Health Dashboard"
    echo -e "  ${GREEN}4.${NC} Monitor Production Status"
    echo -e "  ${GREEN}5.${NC} Emergency Rollback"
    echo -e "  ${GREEN}6.${NC} View Deployment Guide"
    echo -e "  ${GREEN}7.${NC} Check System Health"
    echo -e "  ${GREEN}8.${NC} View Recent Logs"
    echo -e "  ${RED}q.${NC} Quit"
    echo ""
}

check_system_status() {
    echo -e "${BLUE}Current System Status:${NC}"
    
    # Check if server is running
    if pgrep -f "node.*server" > /dev/null; then
        echo -e "  ✅ Server: ${GREEN}Running${NC}"
    else
        echo -e "  ❌ Server: ${RED}Not Running${NC}"
    fi
    
    # Check API endpoints
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "  ✅ API (8080): ${GREEN}Responding${NC}"
    elif curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "  ✅ API (3001): ${GREEN}Responding${NC}"
    else
        echo -e "  ❌ API: ${RED}Not Responding${NC}"
    fi
    
    # Check builds
    if [ -d "web/dist" ] && [ -f "web/dist/index.html" ]; then
        echo -e "  ✅ Frontend Build: ${GREEN}Ready${NC}"
    else
        echo -e "  ⚠️  Frontend Build: ${YELLOW}Missing${NC}"
    fi
    
    if [ -d "server/dist" ] && [ -f "server/dist/index.js" ]; then
        echo -e "  ✅ Server Build: ${GREEN}Ready${NC}"
    else
        echo -e "  ⚠️  Server Build: ${YELLOW}Missing${NC}"
    fi
    
    echo ""
}

run_full_deployment() {
    echo -e "${GREEN}Running Full Safe Deployment...${NC}"
    ./scripts/ultimate-safe-deploy.sh
}

fix_github_tokens() {
    echo -e "${GREEN}Fixing GitHub Token Storage...${NC}"
    ./scripts/fix-github-token-storage.sh
}

fix_system_health() {
    echo -e "${GREEN}Fixing System Health Dashboard...${NC}"
    ./scripts/final-system-health-fix.sh
}

monitor_production() {
    echo -e "${GREEN}Monitoring Production Status...${NC}"
    if [ -f "scripts/monitor-production.sh" ]; then
        ./scripts/monitor-production.sh
    else
        echo -e "${YELLOW}Monitor script not found. Showing basic status:${NC}"
        check_system_status
    fi
}

emergency_rollback() {
    echo -e "${RED}⚠️  EMERGENCY ROLLBACK${NC}"
    echo -e "${YELLOW}This will restore the system to the last known good state.${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${GREEN}Initiating rollback...${NC}"
        ./scripts/rollback-production.sh
    else
        echo -e "${BLUE}Rollback cancelled.${NC}"
    fi
}

view_deployment_guide() {
    echo -e "${GREEN}Opening Deployment Guide...${NC}"
    if command -v less > /dev/null; then
        less DEPLOYMENT_GUIDE.md
    elif command -v more > /dev/null; then
        more DEPLOYMENT_GUIDE.md
    else
        cat DEPLOYMENT_GUIDE.md
    fi
}

view_recent_logs() {
    echo -e "${GREEN}Recent Deployment Logs:${NC}"
    
    # Find recent deployment logs
    recent_log=$(find /tmp -name "deployment-*.log" -type f -mtime -1 2>/dev/null | sort | tail -1)
    
    if [ -n "$recent_log" ]; then
        echo -e "${BLUE}Latest deployment log: $recent_log${NC}"
        echo ""
        tail -20 "$recent_log"
    else
        echo -e "${YELLOW}No recent deployment logs found.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Server logs:${NC}"
    if [ -f "server.log" ]; then
        echo -e "${GREEN}server.log (last 10 lines):${NC}"
        tail -10 server.log
    else
        echo -e "${YELLOW}No server.log found${NC}"
    fi
}

main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "web" ] || [ ! -d "server" ]; then
        echo -e "${RED}Error: Please run this script from the project root directory${NC}"
        exit 1
    fi
    
    # Make sure scripts are executable
    chmod +x scripts/*.sh 2>/dev/null || true
    
    while true; do
        check_system_status
        print_menu
        
        read -p "Choose an option (1-8, q): " choice
        
        case $choice in
            1)
                run_full_deployment
                ;;
            2)
                fix_github_tokens
                ;;
            3)
                fix_system_health
                ;;
            4)
                monitor_production
                ;;
            5)
                emergency_rollback
                ;;
            6)
                view_deployment_guide
                ;;
            7)
                echo -e "${GREEN}Detailed System Health Check:${NC}"
                check_system_status
                ;;
            8)
                view_recent_logs
                ;;
            q|Q)
                echo -e "${GREEN}Goodbye! 👋${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please choose 1-8 or q.${NC}"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Handle command line arguments
if [ $# -gt 0 ]; then
    case $1 in
        "deploy"|"full")
            run_full_deployment
            ;;
        "tokens"|"github")
            fix_github_tokens
            ;;
        "health"|"dashboard")
            fix_system_health
            ;;
        "monitor"|"status")
            monitor_production
            ;;
        "rollback"|"emergency")
            emergency_rollback
            ;;
        "guide"|"help")
            view_deployment_guide
            ;;
        "logs")
            view_recent_logs
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo -e "${BLUE}Available commands: deploy, tokens, health, monitor, rollback, guide, logs${NC}"
            exit 1
            ;;
    esac
else
    main
fi