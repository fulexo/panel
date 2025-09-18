#!/bin/bash

# Production Setup Script
# Usage: ./scripts/setup-production.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

log "Setting up production environment..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root for security reasons"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Create necessary directories
log "Creating necessary directories..."
mkdir -p /var/backups/fulexo
mkdir -p /var/log/fulexo
mkdir -p /var/www/html
mkdir -p logs
success "Directories created"

# Set up environment file
log "Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        warning "Please update .env file with your production values"
    else
        error ".env.production template not found"
    fi
else
    warning ".env file already exists, skipping creation"
fi

# Set up log rotation
log "Setting up log rotation..."
sudo tee /etc/logrotate.d/fulexo > /dev/null << 'EOF'
/var/log/fulexo/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
success "Log rotation configured"

# Set up systemd service (optional)
log "Setting up systemd service..."
sudo tee /etc/systemd/system/fulexo.service > /dev/null << 'EOF'
[Unit]
Description=Fulexo Production Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/your/fulexo
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
success "Systemd service configured (update WorkingDirectory path)"

# Set up cron jobs
log "Setting up cron jobs..."
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/your/fulexo/scripts/backup.sh --full") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 /path/to/your/fulexo/scripts/clear-cache.sh --all") | crontab -
success "Cron jobs configured (update paths)"

# Set up firewall rules (if ufw is available)
if command -v ufw &> /dev/null; then
    log "Setting up firewall rules..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw allow 3001/tcp
    sudo ufw --force enable
    success "Firewall rules configured"
fi

# Set up SSL certificates (Let's Encrypt)
log "Setting up SSL certificates..."
if command -v certbot &> /dev/null; then
    warning "Certbot is available. Run 'sudo certbot --nginx -d panel.fulexo.com -d api.fulexo.com' to set up SSL certificates"
else
    warning "Certbot not found. Install it to set up SSL certificates"
fi

# Create production README
log "Creating production README..."
cat > PRODUCTION.md << 'EOF'
# Fulexo Production Setup

## Quick Commands

### Update Production
```bash
# Quick update (recommended for small changes)
./scripts/quick-update.sh

# Full update with backup
./scripts/master-update.sh

# Hot reload specific service
./scripts/hot-reload.sh --api
./scripts/hot-reload.sh --web
./scripts/hot-reload.sh --worker
```

### Maintenance
```bash
# Clear all caches
./scripts/clear-cache.sh --all

# Create backup
./scripts/backup.sh --full

# Rollback to previous version
./scripts/rollback.sh

# Health check
./scripts/health-check.sh
```

### Service Management
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api
```

## Monitoring

- API Health: http://localhost:3000/api/health
- Web App: http://localhost:3001
- Worker Health: http://localhost:3002/health

## Important Notes

1. Always create a backup before major updates
2. Test changes in staging environment first
3. Monitor logs during and after updates
4. Keep environment variables secure
5. Regularly update dependencies

## Troubleshooting

1. Check service status: `docker-compose -f docker-compose.prod.yml ps`
2. View logs: `docker-compose -f docker-compose.prod.yml logs [service]`
3. Health check: `./scripts/health-check.sh`
4. Rollback if needed: `./scripts/rollback.sh`
EOF
success "Production README created"

log "Production setup completed successfully!"
success "Your Fulexo production environment is ready!"

warning "Please remember to:"
echo "1. Update .env file with your production values"
echo "2. Update paths in systemd service and cron jobs"
echo "3. Set up SSL certificates"
echo "4. Configure your domain name"
echo "5. Test all services before going live"