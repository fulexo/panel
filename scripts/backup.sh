#!/bin/bash

# Fulexo Platform - Otomatik Backup Script'i
# Bu script günlük backup işlemlerini yapar

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

FULEXO_DIR="/opt/fulexo"
BACKUP_SCRIPT="$FULEXO_DIR/scripts/backup-restore.sh"
LOG_FILE="/var/log/fulexo-backup.log"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Main backup function
main() {
    log "Starting automatic backup process"
    
    # Check if backup script exists
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        print_error "Backup script not found: $BACKUP_SCRIPT"
        log "ERROR: Backup script not found"
        exit 1
    fi
    
    # Make backup script executable
    chmod +x "$BACKUP_SCRIPT"
    
    # Run backup
    print_info "Starting backup process..."
    log "Running backup script"
    
    if "$BACKUP_SCRIPT" backup; then
        print_status "Backup completed successfully"
        log "Backup completed successfully"
        
        # Send success notification
        send_notification "success" "Backup completed successfully"
        
    else
        print_error "Backup failed"
        log "ERROR: Backup failed"
        
        # Send failure notification
        send_notification "failure" "Backup failed - check logs"
        
        exit 1
    fi
    
    # Cleanup old logs (keep last 30 days)
    find /var/log -name "fulexo-backup.log*" -mtime +30 -delete 2>/dev/null || true
    
    log "Automatic backup process completed"
}

# Send notification function
send_notification() {
    local status="$1"
    local message="$2"
    
    # Log to system log
    logger -t fulexo-backup "$message"
    
    # Send email if configured
    local admin_email="admin@fulexo.com"
    if [ -f "/etc/fulexo/fulexo.env" ]; then
        admin_email=$(grep "^ADMIN_EMAIL=" "/etc/fulexo/fulexo.env" 2>/dev/null | cut -d'=' -f2 || echo "admin@fulexo.com")
    fi
    
    if command -v mail >/dev/null 2>&1; then
        local subject="Fulexo Backup $status - $(date '+%Y-%m-%d %H:%M:%S')"
        local body="Status: $status\nMessage: $message\nTime: $(date)\nHost: $(hostname)"
        
        echo -e "$body" | mail -s "$subject" "$admin_email" 2>/dev/null || true
    fi
    
    # Send to webhook if configured
    local webhook_url=$(grep "^BACKUP_WEBHOOK_URL=" "/etc/fulexo/fulexo.env" 2>/dev/null | cut -d'=' -f2 || echo "")
    if [ -n "$webhook_url" ] && command -v curl >/dev/null 2>&1; then
        local payload="{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"hostname\":\"$(hostname)\"}"
        curl -X POST -H "Content-Type: application/json" -d "$payload" "$webhook_url" 2>/dev/null || true
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Run main function
main "$@"