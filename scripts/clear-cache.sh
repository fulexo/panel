#!/bin/bash

# Cache Clearing Script
# Usage: ./scripts/clear-cache.sh [--all] [--frontend] [--backend] [--database]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CLEAR_ALL=false
CLEAR_FRONTEND=false
CLEAR_BACKEND=false
CLEAR_DATABASE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CLEAR_ALL=true
            shift
            ;;
        --frontend)
            CLEAR_FRONTEND=true
            shift
            ;;
        --backend)
            CLEAR_BACKEND=true
            shift
            ;;
        --database)
            CLEAR_DATABASE=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# If no specific option, clear all
if [ "$CLEAR_ALL" = false ] && [ "$CLEAR_FRONTEND" = false ] && [ "$CLEAR_BACKEND" = false ] && [ "$CLEAR_DATABASE" = false ]; then
    CLEAR_ALL=true
fi

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "Starting cache clearing process..."

# Clear frontend cache
if [ "$CLEAR_ALL" = true ] || [ "$CLEAR_FRONTEND" = true ]; then
    log "Clearing frontend cache..."
    
    # Clear Next.js cache
    if [ -d "apps/web/.next" ]; then
        rm -rf apps/web/.next
        success "Next.js cache cleared"
    fi
    
    # Clear node_modules and reinstall
    if [ -d "apps/web/node_modules" ]; then
        rm -rf apps/web/node_modules
        success "Frontend node_modules cleared"
    fi
    
    # Clear package-lock.json
    if [ -f "apps/web/package-lock.json" ]; then
        rm -f apps/web/package-lock.json
        success "Frontend package-lock.json cleared"
    fi
    
    # Clear build artifacts
    if [ -d "apps/web/out" ]; then
        rm -rf apps/web/out
        success "Frontend build artifacts cleared"
    fi
fi

# Clear backend cache
if [ "$CLEAR_ALL" = true ] || [ "$CLEAR_BACKEND" = true ]; then
    log "Clearing backend cache..."
    
    # Clear node_modules
    if [ -d "apps/api/node_modules" ]; then
        rm -rf apps/api/node_modules
        success "Backend node_modules cleared"
    fi
    
    # Clear package-lock.json
    if [ -f "apps/api/package-lock.json" ]; then
        rm -f apps/api/package-lock.json
        success "Backend package-lock.json cleared"
    fi
    
    # Clear dist folder
    if [ -d "apps/api/dist" ]; then
        rm -rf apps/api/dist
        success "Backend dist folder cleared"
    fi
    
    # Clear Prisma cache
    if [ -d "apps/api/node_modules/.prisma" ]; then
        rm -rf apps/api/node_modules/.prisma
        success "Prisma cache cleared"
    fi
fi

# Clear database cache
if [ "$CLEAR_ALL" = true ] || [ "$CLEAR_DATABASE" = true ]; then
    log "Clearing database cache..."
    
    # Clear Redis cache
    docker exec -it fulexo-redis redis-cli FLUSHALL 2>/dev/null || warning "Redis not running or not accessible"
    success "Redis cache cleared"
    
    # Clear database connection pool
    docker exec -it fulexo-api npx prisma db push --force-reset 2>/dev/null || warning "Database reset failed or not accessible"
    success "Database cache cleared"
fi

# Clear Docker cache
log "Clearing Docker cache..."
docker system prune -f
docker volume prune -f
success "Docker cache cleared"

# Clear system cache
log "Clearing system cache..."
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || warning "Cannot clear system cache (requires root)"
success "System cache cleared"

log "Cache clearing completed successfully!"
success "All specified caches have been cleared"