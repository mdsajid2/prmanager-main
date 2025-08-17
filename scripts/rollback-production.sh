#!/bin/bash

# =============================================================================
# PR Manager Production Rollback Script
# =============================================================================
# This script provides emergency rollback capability to restore the previous
# working version in case of deployment issues.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/ec2-user/prmanager"
BACKUP_DIR="/home/ec2-user/backups"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to list available backups
list_backups() {
    echo "📋 Available backups:"
    echo "===================="
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        error "No backup directory found at ${BACKUP_DIR}"
        exit 1
    fi
    
    cd "${BACKUP_DIR}"
    backups=($(ls -t | grep "prmanager_backup_" 2>/dev/null || true))
    
    if [ ${#backups[@]} -eq 0 ]; then
        error "No backups found!"
        exit 1
    fi
    
    for i in "${!backups[@]}"; do
        backup_date=$(echo "${backups[$i]}" | sed 's/prmanager_backup_//' | sed 's/_/ /')
        echo "$((i+1)). ${backups[$i]} (${backup_date})"
    done
    
    echo ""
}

# Function to rollback to a specific backup
rollback_to_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    if [ ! -d "${backup_path}" ]; then
        error "Backup not found: ${backup_path}"
        exit 1
    fi
    
    echo ""
    echo "🔄 ROLLING BACK TO: ${backup_name}"
    echo "=================================="
    echo ""
    
    cd "${PROJECT_DIR}"
    
    # Stop current service
    log "Stopping current service..."
    pm2 stop pr-manager || true
    
    # Restore .env file
    if [ -f "${backup_path}/.env" ]; then
        log "Restoring .env file..."
        cp "${backup_path}/.env" ".env"
        success ".env file restored"
    else
        warning ".env backup not found - keeping current .env"
    fi
    
    # Restore server build
    if [ -d "${backup_path}/server/dist" ]; then
        log "Restoring server build..."
        rm -rf "server/dist"
        cp -r "${backup_path}/server/dist" "server/"
        success "Server build restored"
    else
        warning "Server build backup not found"
    fi
    
    # Restore frontend build
    if [ -d "${backup_path}/web/dist" ]; then
        log "Restoring frontend build..."
        rm -rf "web/dist"
        cp -r "${backup_path}/web/dist" "web/"
        success "Frontend build restored"
    else
        warning "Frontend build backup not found"
    fi
    
    # Restore PM2 configuration
    if [ -f "${backup_path}/pm2_dump.pm2" ]; then
        log "Restoring PM2 configuration..."
        cp "${backup_path}/pm2_dump.pm2" ~/.pm2/dump.pm2
        success "PM2 configuration restored"
    fi
    
    # Start service
    log "Starting service..."
    pm2 start server/dist/index.js --name pr-manager --time || pm2 restart pr-manager
    pm2 save
    
    # Wait for service to be ready
    log "Waiting for service to be ready..."
    sleep 5
    
    # Test health
    log "Testing service health..."
    health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "000")
    
    if [ "$health_status" = "200" ]; then
        success "Service is healthy (200)"
    else
        error "Service health check failed (${health_status})"
        exit 1
    fi
    
    echo ""
    success "🎉 ROLLBACK COMPLETED SUCCESSFULLY!"
    echo ""
    echo "📊 Service Status:"
    pm2 status pr-manager
    echo ""
    echo "📋 Next Steps:"
    echo "   • Monitor logs: pm2 logs pr-manager"
    echo "   • Check application: http://localhost:8080/"
    echo "   • Investigate the issue that caused the rollback"
    echo ""
}

# Main function
main() {
    echo ""
    echo "🔄 PR Manager Production Rollback"
    echo "================================="
    echo ""
    
    if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
        list_backups
        exit 0
    fi
    
    if [ -n "$1" ]; then
        # Rollback to specific backup
        rollback_to_backup "$1"
    else
        # Interactive mode
        list_backups
        
        echo "Enter the number of the backup to rollback to (or 'q' to quit):"
        read -r choice
        
        if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
            log "Rollback cancelled"
            exit 0
        fi
        
        cd "${BACKUP_DIR}"
        backups=($(ls -t | grep "prmanager_backup_"))
        
        if [ "$choice" -ge 1 ] && [ "$choice" -le ${#backups[@]} ]; then
            selected_backup="${backups[$((choice-1))]}"
            
            echo ""
            warning "⚠️  WARNING: This will rollback to ${selected_backup}"
            echo "This will:"
            echo "  • Stop the current service"
            echo "  • Restore previous .env, server build, and frontend build"
            echo "  • Restart the service with the previous version"
            echo ""
            echo "Are you sure you want to continue? (yes/no):"
            read -r confirm
            
            if [ "$confirm" = "yes" ] || [ "$confirm" = "YES" ]; then
                rollback_to_backup "$selected_backup"
            else
                log "Rollback cancelled"
                exit 0
            fi
        else
            error "Invalid selection: $choice"
            exit 1
        fi
    fi
}

# Show usage if --help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS] [BACKUP_NAME]"
    echo ""
    echo "Options:"
    echo "  -l, --list     List available backups"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Interactive rollback"
    echo "  $0 --list                            # List available backups"
    echo "  $0 prmanager_backup_20241216_143022  # Rollback to specific backup"
    echo ""
    exit 0
fi

# Run main function
main "$@"