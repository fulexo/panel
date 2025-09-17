#!/bin/bash

# Master Update Script - Complete production update with all optimizations
# Usage: ./scripts/master-update.sh [--no-backup] [--force] [--maintenance]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NO_BACKUP=${1:-false}
FORCE=${2:-false}
MAINTENANCE=${3:-false}

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Maintenance mode functions
enable_maintenance() {
    log "Enabling maintenance mode..."
    # Create maintenance page
    cat > /var/www/html/maintenance.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Maintenance - Fulexo</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚧 Maintenance in Progress</h1>
        <p>We're currently updating our system. Please check back in a few minutes.</p>
        <p>Thank you for your patience!</p>
    </div>
</body>
</html>
EOF
    success "Maintenance mode enabled"
}

disable_maintenance() {
    log "Disabling maintenance mode..."
    rm -f /var/www/html/maintenance.html
    success "Maintenance mode disabled"
}

# Main execution
log "Starting master update process..."

# Enable maintenance mode if requested
if [ "$MAINTENANCE" = "--maintenance" ]; then
    enable_maintenance
fi

# Create full backup unless disabled
if [ "$NO_BACKUP" != "--no-backup" ]; then
    log "Creating full backup..."
    ./scripts/backup.sh --full
    if [ $? -ne 0 ]; then
        error "Backup failed. Aborting update."
    fi
    success "Full backup created"
fi

# Pull latest code
log "Pulling latest code..."
git pull origin main
if [ $? -ne 0 ]; then
    error "Failed to pull latest code"
fi
success "Code updated successfully"

# Clear all caches
log "Clearing all caches..."
./scripts/clear-cache.sh --all

# Stop services gracefully
log "Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Clean up Docker
log "Cleaning up Docker..."
docker system prune -f
docker volume prune -f

# Rebuild everything with no cache
log "Rebuilding all services..."
docker-compose -f docker-compose.prod.yml build --no-cache --parallel

if [ $? -ne 0 ]; then
    error "Build failed"
fi

# Start services
log "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    error "Failed to start services"
fi

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Comprehensive health check
log "Performing comprehensive health check..."
./scripts/health-check.sh

if [ $? -eq 0 ]; then
    success "Master update completed successfully!"
    
    # Disable maintenance mode
    if [ "$MAINTENANCE" = "--maintenance" ]; then
        disable_maintenance
    fi
    
    # Show service status
    docker-compose -f docker-compose.prod.yml ps
    
    # Clean up old images
    log "Cleaning up old images..."
    docker image prune -f
    
    success "Master update completed and cleaned up"
else
    error "Health check failed. Rolling back..."
    ./scripts/rollback.sh
fi