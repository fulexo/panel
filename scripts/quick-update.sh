#!/bin/bash

# Quick Update Script - Fastest way to update production
# Usage: ./scripts/quick-update.sh [--no-backup] [--force]

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

log "Starting quick update process..."

# Create quick backup unless disabled
if [ "$NO_BACKUP" != "--no-backup" ]; then
    log "Creating quick backup..."
    ./scripts/backup.sh --code-only
    success "Quick backup created"
fi

# Pull latest code
log "Pulling latest code..."
git pull origin main
if [ $? -ne 0 ]; then
    error "Failed to pull latest code"
fi
success "Code updated successfully"

# Clear caches
log "Clearing caches..."
./scripts/clear-cache.sh --all

# Rebuild and restart services
log "Rebuilding and restarting services..."

# Build with no cache for clean build
docker-compose -f docker-compose.prod.yml build --no-cache --parallel

if [ $? -ne 0 ]; then
    error "Build failed"
fi

# Restart services
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    error "Failed to start services"
fi

# Wait for services
log "Waiting for services to be ready..."
sleep 20

# Quick health check
log "Performing quick health check..."

# Check API
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    success "API is healthy"
else
    error "API health check failed"
fi

# Check Web
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    success "Web is healthy"
else
    error "Web health check failed"
fi

# Check Worker
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    success "Worker is healthy"
else
    warning "Worker health check failed (non-critical)"
fi

success "Quick update completed successfully!"
log "All services are running and healthy"

# Show service status
docker-compose -f docker-compose.prod.yml ps