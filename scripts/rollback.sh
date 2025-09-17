#!/bin/bash

# Rollback Script
# Usage: ./scripts/rollback.sh [backup_name] [--force]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="/var/backups/fulexo"
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

# List available backups
list_backups() {
    log "Available backups:"
    ls -la "$BACKUP_DIR" | grep "fulexo_backup_" | awk '{print $9}' | sort -r
}

# If no backup name provided, list available backups
if [ -z "$1" ]; then
    list_backups
    exit 0
fi

BACKUP_NAME="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Check if backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    error "Backup '$BACKUP_NAME' not found"
fi

log "Starting rollback to backup: $BACKUP_NAME"

# Confirm rollback unless force flag is used
if [ "$FORCE" != "--force" ]; then
    read -p "Are you sure you want to rollback to '$BACKUP_NAME'? This will overwrite current data. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Rollback cancelled"
        exit 0
    fi
fi

# Stop services
log "Stopping services..."
docker-compose -f docker-compose.prod.yml down

# Restore code
if [ -f "$BACKUP_PATH/code.tar.gz" ]; then
    log "Restoring code..."
    tar -xzf "$BACKUP_PATH/code.tar.gz" -C /
    success "Code restored"
fi

# Restore database
if [ -f "$BACKUP_PATH/database.sql" ]; then
    log "Restoring database..."
    docker-compose -f docker-compose.prod.yml up -d postgres
    sleep 10
    docker exec -i fulexo-postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS fulexo;"
    docker exec -i fulexo-postgres psql -U postgres -d postgres -c "CREATE DATABASE fulexo;"
    docker exec -i fulexo-postgres psql -U postgres -d fulexo < "$BACKUP_PATH/database.sql"
    success "Database restored"
fi

# Restore Redis data
if [ -f "$BACKUP_PATH/redis.rdb" ]; then
    log "Restoring Redis data..."
    docker-compose -f docker-compose.prod.yml up -d redis
    sleep 5
    docker cp "$BACKUP_PATH/redis.rdb" fulexo-redis:/data/dump.rdb
    docker restart fulexo-redis
    success "Redis data restored"
fi

# Restore environment files
if [ -f "$BACKUP_PATH/.env" ]; then
    log "Restoring environment files..."
    cp "$BACKUP_PATH/.env" .
    success "Environment files restored"
fi

# Rebuild and start services
log "Rebuilding and starting services..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Health check
log "Performing health check..."
./scripts/health-check.sh

if [ $? -eq 0 ]; then
    success "Rollback completed successfully!"
    log "Services are running and healthy"
else
    error "Health check failed after rollback"
fi