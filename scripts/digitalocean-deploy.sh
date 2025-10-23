#!/bin/bash

# Fulexo Platform - DigitalOcean Quick Deploy Script
# Bu script DigitalOcean droplet'te platform deployment'ını otomatikleştirir

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FULEXO_DIR="/opt/fulexo"
COMPOSE_DIR="$FULEXO_DIR/compose"
LOG_FILE="/var/log/fulexo-deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $LOG_FILE
}

# Header
clear
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Fulexo Platform - DigitalOcean Deploy${NC}"
echo -e "${GREEN}   Version: 1.0.0${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "Bu script root olarak çalıştırılmalıdır!"
fi

# Get deployment information
info "Deployment bilgileri alınıyor..."
read -p "API Domain (örn: api.fulexo.com): " API_DOMAIN
read -p "Panel Domain (örn: panel.fulexo.com): " PANEL_DOMAIN
read -p "Droplet IP adresi: " DROPLET_IP

echo
warning "Deployment başlatılıyor..."
warning "API: https://${API_DOMAIN}"
warning "Panel: https://${PANEL_DOMAIN}"
warning "IP: ${DROPLET_IP}"
echo

read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Deployment iptal edildi."
    exit 0
fi

# Step 1: System Update
log "Sistem güncelleniyor..."
apt-get update -y >> $LOG_FILE 2>&1
apt-get upgrade -y >> $LOG_FILE 2>&1

# Step 2: Install Docker
if ! command -v docker &> /dev/null; then
    log "Docker kuruluyor..."
    curl -fsSL https://get.docker.com -o get-docker.sh >> $LOG_FILE 2>&1
    sh get-docker.sh >> $LOG_FILE 2>&1
    rm get-docker.sh
    apt-get install docker-compose-plugin -y >> $LOG_FILE 2>&1
else
    info "Docker zaten kurulu"
fi

# Step 3: Install required packages
log "Gerekli paketler kuruluyor..."
apt-get install -y git certbot curl wget nano ufw fail2ban >> $LOG_FILE 2>&1

# Step 4: Create swap file
if ! swapon --show | grep -q '/swapfile'; then
    log "Swap dosyası oluşturuluyor (2GB)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >> $LOG_FILE 2>&1
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
    info "Swap dosyası zaten mevcut"
fi

# Step 5: Configure firewall
log "Firewall yapılandırılıyor..."
ufw allow OpenSSH >> $LOG_FILE 2>&1
ufw allow 80 >> $LOG_FILE 2>&1
ufw allow 443 >> $LOG_FILE 2>&1
ufw allow 3003 >> $LOG_FILE 2>&1  # Grafana
ufw allow 3004 >> $LOG_FILE 2>&1  # Uptime Kuma
ufw --force enable >> $LOG_FILE 2>&1

# Step 6: Configure fail2ban
log "Fail2ban yapılandırılıyor..."
cat > /etc/fail2ban/jail.d/fulexo.conf << 'EOF'
[sshd]
enabled = true
bantime = 1h
maxretry = 5
findtime = 15m

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
EOF
systemctl restart fail2ban >> $LOG_FILE 2>&1

# Step 7: Clone or update repository
if [ -d "$FULEXO_DIR" ]; then
    warning "Fulexo dizini mevcut, güncelleniyor..."
    cd $FULEXO_DIR
    git pull origin main >> $LOG_FILE 2>&1 || true
else
    log "Repository klonlanıyor..."
    git clone https://github.com/your-repo/fulexo-panel.git $FULEXO_DIR >> $LOG_FILE 2>&1
fi

# Step 8: Generate production environment
log "Production environment oluşturuluyor..."
cd $FULEXO_DIR
if [ -f "scripts/generate-production-env.sh" ]; then
    chmod +x scripts/generate-production-env.sh
    echo -e "${API_DOMAIN}\n${PANEL_DOMAIN}" | ./scripts/generate-production-env.sh >> $LOG_FILE 2>&1
    cp compose/.env.production compose/.env
else
    error "generate-production-env.sh bulunamadı!"
fi

# Step 9: Get SSL certificates
log "SSL sertifikaları alınıyor..."

# Stop any service using port 80/443
docker-compose -f $COMPOSE_DIR/docker-compose.yml down >> $LOG_FILE 2>&1 || true

# Get certificates
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@${API_DOMAIN} \
    -d ${API_DOMAIN} >> $LOG_FILE 2>&1

certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@${PANEL_DOMAIN} \
    -d ${PANEL_DOMAIN} >> $LOG_FILE 2>&1

# Setup auto-renewal
echo "0 0,12 * * * root certbot renew --quiet" >> /etc/crontab

# Step 10: Build and start services
log "Docker images build ediliyor..."
cd $COMPOSE_DIR
docker-compose build --no-cache >> $LOG_FILE 2>&1

log "Servisler başlatılıyor..."
docker-compose up -d >> $LOG_FILE 2>&1

# Step 11: Wait for services to be ready
log "Servislerin hazır olması bekleniyor (60 saniye)..."
sleep 60

# Step 12: Run database migrations
log "Database migration'ları çalıştırılıyor..."
docker-compose exec -T api npx prisma migrate deploy >> $LOG_FILE 2>&1

# Step 13: Create admin user (optional)
log "Admin kullanıcı oluşturuluyor..."
docker-compose exec -T api npm run seed >> $LOG_FILE 2>&1 || true

# Step 14: Health checks
log "Health check'ler yapılıyor..."
echo

# API Health Check
if curl -f -k https://${API_DOMAIN}/health > /dev/null 2>&1; then
    info "✅ API Health: OK"
else
    error "❌ API Health: FAILED"
fi

# Web Health Check
if curl -f -k https://${PANEL_DOMAIN} > /dev/null 2>&1; then
    info "✅ Web Health: OK"
else
    error "❌ Web Health: FAILED"
fi

# Docker services check
info "Docker servisleri:"
docker-compose ps

# Step 15: Setup backup cron job
log "Backup cron job ayarlanıyor..."
cat > /opt/fulexo/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fulexo/backups"
mkdir -p $BACKUP_DIR

# Database backup
cd /opt/fulexo/compose
docker-compose exec -T postgres pg_dump -U fulexo_user fulexo > $BACKUP_DIR/db_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/fulexo/backup.sh
echo "0 2 * * * /opt/fulexo/backup.sh" | crontab -l 2>/dev/null | { cat; echo "0 2 * * * /opt/fulexo/backup.sh"; } | crontab -

# Step 16: Display summary
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT TAMAMLANDI!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${BLUE}Platform URL'leri:${NC}"
echo "  Panel: https://${PANEL_DOMAIN}"
echo "  API: https://${API_DOMAIN}"
echo "  API Docs: https://${API_DOMAIN}/docs"
echo
echo -e "${BLUE}Monitoring:${NC}"
echo "  Grafana: https://${PANEL_DOMAIN}:3003"
echo "  Uptime Kuma: https://${PANEL_DOMAIN}:3004"
echo
echo -e "${BLUE}Default Credentials:${NC}"
echo "  Email: admin@fulexo.com"
echo "  Password: demo123"
echo
echo -e "${YELLOW}⚠️  İlk yapılması gerekenler:${NC}"
echo "1. Panel'e giriş yapın ve admin şifresini değiştirin"
echo "2. Settings → Email'den SMTP ayarlarını yapın"
echo "3. İlk WooCommerce mağazanızı ekleyin"
echo
echo -e "${GREEN}Log dosyası: $LOG_FILE${NC}"
echo
echo -e "${GREEN}Başarılar! 🚀${NC}"

# Save deployment info
cat > /opt/fulexo/deployment-info.txt << EOF
Deployment Date: $(date)
API Domain: https://${API_DOMAIN}
Panel Domain: https://${PANEL_DOMAIN}
Droplet IP: ${DROPLET_IP}
Fulexo Directory: ${FULEXO_DIR}
Backup Script: /opt/fulexo/backup.sh
Log File: ${LOG_FILE}
EOF

log "Deployment bilgileri /opt/fulexo/deployment-info.txt dosyasına kaydedildi"