#!/bin/bash

# Database Migration Deployment Script
# This script ensures both development and production databases are in sync

echo "🚀 Starting database migration deployment..."

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

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js to run migrations."
    exit 1
fi

# Navigate to the database directory
cd "$(dirname "$0")"

print_status "Current directory: $(pwd)"

# Check if migration manager exists
if [ ! -f "migration-manager.js" ]; then
    print_error "Migration manager not found. Please ensure migration-manager.js exists."
    exit 1
fi

# Run migration status check
print_status "Checking current database status..."
node migration-manager.js status

# Ask for confirmation before proceeding
echo ""
read -p "Do you want to proceed with database synchronization? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Migration cancelled by user."
    exit 0
fi

# Run the migration synchronization
print_status "Synchronizing databases..."
node migration-manager.js sync

# Check the result
if [ $? -eq 0 ]; then
    print_success "Database migration completed successfully!"
    
    # Run status check again to verify
    print_status "Verifying migration results..."
    node migration-manager.js status
    
    print_success "All databases are now synchronized!"
    
    echo ""
    echo "📋 Next steps:"
    echo "1. Test your application with both databases"
    echo "2. Verify all features are working correctly"
    echo "3. Monitor the application logs for any issues"
    
else
    print_error "Database migration failed. Please check the logs above."
    exit 1
fi

echo ""
print_success "Migration deployment completed! 🎉"