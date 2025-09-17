#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [--no-cache] [--force]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
NO_CACHE=${2:-false}
FORCE=${3:-false}
BACKUP_DIR="/var/backups/fulexo"
LOG_FILE="/var/log/fulexo/deploy.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root for security reasons"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
fi

log "Starting deployment for environment: $ENVIRONMENT"

# Create backup before deployment
if [ "$FORCE" != "--force" ]; then
    log "Creating backup before deployment..."
    ./scripts/backup.sh
    if [ $? -ne 0 ]; then
        error "Backup failed. Aborting deployment."
    fi
    success "Backup created successfully"
fi

# Stop services gracefully
log "Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Clean up old containers and images if no-cache flag is set
if [ "$NO_CACHE" = "--no-cache" ]; then
    log "Cleaning up old containers and images..."
    docker system prune -f
    docker volume prune -f
    success "Cleanup completed"
fi

# Pull latest code
log "Pulling latest code..."
git pull origin main
if [ $? -ne 0 ]; then
    error "Failed to pull latest code"
fi
success "Code updated successfully"

# Build and start services
log "Building and starting services..."

if [ "$NO_CACHE" = "--no-cache" ]; then
    docker-compose -f docker-compose.prod.yml build --no-cache --parallel
else
    docker-compose -f docker-compose.prod.yml build --parallel
fi

if [ $? -ne 0 ]; then
    error "Build failed"
fi

# Start services
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    error "Failed to start services"
fi

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Health check
log "Performing health check..."
./scripts/health-check.sh

if [ $? -eq 0 ]; then
    success "Deployment completed successfully!"
    log "Services are running and healthy"
    
    # Show service status
    docker-compose -f docker-compose.prod.yml ps
    
    # Clean up old images (keep last 3)
    log "Cleaning up old images..."
    docker image prune -f
    success "Deployment completed and cleaned up"
else
    error "Health check failed. Rolling back..."
    ./scripts/rollback.sh
fi