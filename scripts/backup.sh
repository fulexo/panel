#!/bin/bash

# Backup Script
# Usage: ./scripts/backup.sh [--full] [--database-only] [--code-only]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BACKUP_TYPE=${1:-full}
BACKUP_DIR="/var/backups/fulexo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="fulexo_backup_${TIMESTAMP}"

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting backup process - Type: $BACKUP_TYPE"

# Full backup
if [ "$BACKUP_TYPE" = "--full" ] || [ "$BACKUP_TYPE" = "full" ]; then
    log "Creating full backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup code
    log "Backing up code..."
    tar -czf "$BACKUP_DIR/$BACKUP_NAME/code.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=dist \
        --exclude=.git \
        --exclude=*.log \
        .
    success "Code backed up"
    
    # Backup database
    log "Backing up database..."
    docker exec fulexo-postgres pg_dump -U postgres -d fulexo > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
    success "Database backed up"
    
    # Backup Redis data
    log "Backing up Redis data..."
    docker exec fulexo-redis redis-cli --rdb /data/dump.rdb
    docker cp fulexo-redis:/data/dump.rdb "$BACKUP_DIR/$BACKUP_NAME/redis.rdb"
    success "Redis data backed up"
    
    # Backup environment files
    log "Backing up environment files..."
    cp .env "$BACKUP_DIR/$BACKUP_NAME/.env" 2>/dev/null || warning "No .env file found"
    cp docker-compose.prod.yml "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || warning "No docker-compose.prod.yml found"
    success "Environment files backed up"
    
    # Create backup info file
    cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
Backup Date: $(date)
Backup Type: Full
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
Git Branch: $(git branch --show-current 2>/dev/null || echo "Unknown")
Docker Images: $(docker images --format "table {{.Repository}}:{{.Tag}}" | grep fulexo)
EOF
    
    success "Full backup completed: $BACKUP_NAME"
fi

# Database only backup
if [ "$BACKUP_TYPE" = "--database-only" ]; then
    log "Creating database-only backup..."
    
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    docker exec fulexo-postgres pg_dump -U postgres -d fulexo > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
    success "Database backup completed: $BACKUP_NAME"
fi

# Code only backup
if [ "$BACKUP_TYPE" = "--code-only" ]; then
    log "Creating code-only backup..."
    
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    tar -czf "$BACKUP_DIR/$BACKUP_NAME/code.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=dist \
        --exclude=.git \
        --exclude=*.log \
        .
    success "Code backup completed: $BACKUP_NAME"
fi

# Clean up old backups (keep last 10)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -rf
success "Old backups cleaned up"

log "Backup process completed successfully!"
success "Backup location: $BACKUP_DIR/$BACKUP_NAME"