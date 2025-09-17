#!/bin/bash

# Hot Reload Script for Production
# Usage: ./scripts/hot-reload.sh [--api] [--web] [--worker] [--all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RELOAD_API=false
RELOAD_WEB=false
RELOAD_WORKER=false
RELOAD_ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            RELOAD_API=true
            shift
            ;;
        --web)
            RELOAD_WEB=true
            shift
            ;;
        --worker)
            RELOAD_WORKER=true
            shift
            ;;
        --all)
            RELOAD_ALL=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# If no specific option, reload all
if [ "$RELOAD_ALL" = false ] && [ "$RELOAD_API" = false ] && [ "$RELOAD_WEB" = false ] && [ "$RELOAD_WORKER" = false ]; then
    RELOAD_ALL=true
fi

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

# Hot reload API
reload_api() {
    log "Hot reloading API service..."
    
    # Pull latest code
    git pull origin main
    
    # Rebuild only API
    docker-compose -f docker-compose.prod.yml build --no-cache api
    
    # Restart API container
    docker-compose -f docker-compose.prod.yml up -d api
    
    # Wait for API to be ready
    sleep 10
    
    # Health check
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "API hot reload completed successfully"
    else
        error "API health check failed after reload"
    fi
}

# Hot reload Web
reload_web() {
    log "Hot reloading Web service..."
    
    # Pull latest code
    git pull origin main
    
    # Rebuild only Web
    docker-compose -f docker-compose.prod.yml build --no-cache web
    
    # Restart Web container
    docker-compose -f docker-compose.prod.yml up -d web
    
    # Wait for Web to be ready
    sleep 15
    
    # Health check
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        success "Web hot reload completed successfully"
    else
        error "Web health check failed after reload"
    fi
}

# Hot reload Worker
reload_worker() {
    log "Hot reloading Worker service..."
    
    # Pull latest code
    git pull origin main
    
    # Rebuild only Worker
    docker-compose -f docker-compose.prod.yml build --no-cache worker
    
    # Restart Worker container
    docker-compose -f docker-compose.prod.yml up -d worker
    
    # Wait for Worker to be ready
    sleep 10
    
    # Health check
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
        success "Worker hot reload completed successfully"
    else
        error "Worker health check failed after reload"
    fi
}

# Main execution
log "Starting hot reload process..."

if [ "$RELOAD_ALL" = true ] || [ "$RELOAD_API" = true ]; then
    reload_api
fi

if [ "$RELOAD_ALL" = true ] || [ "$RELOAD_WEB" = true ]; then
    reload_web
fi

if [ "$RELOAD_ALL" = true ] || [ "$RELOAD_WORKER" = true ]; then
    reload_worker
fi

success "Hot reload process completed!"
log "All specified services have been reloaded"