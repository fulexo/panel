#!/bin/bash

# Fulexo Platform - DigitalOcean Deployment Script
# Bu script DigitalOcean droplet'inize Fulexo platformunu kurar

set -e  # Hata durumunda script'i durdur

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log fonksiyonu
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[HATA]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[UYARI]${NC} $1"
}

# Root kullanıcı kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root kullanıcı olarak çalıştırılmalıdır!"
fi

log "Fulexo Platform kurulumu başlıyor..."

# 1. Sistem güncellemeleri
log "Sistem paketleri güncelleniyor..."
apt-get update
apt-get upgrade -y

# 2. Gerekli paketleri yükle
log "Gerekli paketler yükleniyor..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    net-tools \
    vim \
    nano

# 3. Docker kurulumu
if ! command -v docker &> /dev/null; then
    log "Docker yükleniyor..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    log "Docker zaten yüklü"
fi

# 4. Node.js kurulumu (Development için)
if ! command -v node &> /dev/null; then
    log "Node.js 20 yükleniyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    log "Node.js zaten yüklü"
fi

# 5. Proje dizini oluştur
PROJECT_DIR="/opt/fulexo"
if [ ! -d "$PROJECT_DIR" ]; then
    log "Proje dizini oluşturuluyor..."
    mkdir -p $PROJECT_DIR
fi

# 6. Projeyi klonla veya güncelle
cd $PROJECT_DIR
if [ ! -d ".git" ]; then
    log "Proje repository'si klonlanıyor..."
    git clone https://github.com/yourusername/fulexo.git .
else
    log "Proje güncelleniyor..."
    git pull origin main
fi

# 7. Environment dosyasını ayarla
if [ ! -f "compose/.env" ]; then
    log "Environment dosyası oluşturuluyor..."
    cp compose/.env.example compose/.env
    warning ".env dosyasını düzenlemeniz gerekiyor!"
    warning "nano $PROJECT_DIR/compose/.env"
fi

# 8. Firewall ayarları
log "Firewall yapılandırılıyor..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # API (development)
ufw allow 3001/tcp  # Web UI (development)
ufw allow 3002/tcp  # Grafana
ufw allow 3003/tcp  # Uptime Kuma
ufw allow 9001/tcp  # MinIO Console

# 9. Swap dosyası oluştur (4GB RAM'den az ise)
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ $TOTAL_MEM -lt 4096 ]; then
    log "Swap dosyası oluşturuluyor..."
    if [ ! -f /swapfile ]; then
        fallocate -l 4G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    fi
fi

# 10. Docker Compose limitleri
log "Docker limitleri ayarlanıyor..."
cat > /etc/sysctl.d/99-docker.conf <<EOF
vm.max_map_count=262144
fs.file-max=65536
EOF
sysctl -p /etc/sysctl.d/99-docker.conf

# 11. Fail2ban yapılandırması
log "Fail2ban yapılandırılıyor..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF
systemctl restart fail2ban

# 12. Otomatik güncelleme ayarları
log "Otomatik güvenlik güncellemeleri ayarlanıyor..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 13. Docker kullanıcı grubu
if [ ! -z "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
fi

# 14. Sistemd servisleri oluştur
log "Systemd servisi oluşturuluyor..."
cat > /etc/systemd/system/fulexo.service <<EOF
[Unit]
Description=Fulexo Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR/compose
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fulexo.service

# 15. Log rotation ayarları
log "Log rotation ayarlanıyor..."
cat > /etc/logrotate.d/fulexo <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

# 16. Monitoring dizinleri
log "Monitoring dizinleri oluşturuluyor..."
mkdir -p $PROJECT_DIR/data/{prometheus,grafana,loki}
chown -R 65534:65534 $PROJECT_DIR/data/prometheus
chown -R 472:472 $PROJECT_DIR/data/grafana

# Özet bilgi
echo ""
echo "============================================="
echo -e "${GREEN}Kurulum tamamlandı!${NC}"
echo "============================================="
echo ""
echo "Yapılması gerekenler:"
echo "1. Environment dosyasını düzenleyin:"
echo "   nano $PROJECT_DIR/compose/.env"
echo ""
echo "2. Database migration'ları çalıştırın:"
echo "   cd $PROJECT_DIR/apps/api"
echo "   npm install"
echo "   npm run prisma:generate"
echo "   npm run prisma:migrate"
echo "   npm run prisma:seed"
echo ""
echo "3. Servisleri başlatın:"
echo "   cd $PROJECT_DIR/compose"
echo "   docker compose up -d"
echo ""
echo "4. SSL sertifikası kurun (domain'inizi ayarladıktan sonra):"
echo "   ./setup-ssl.sh"
echo ""
echo "Servis durumunu kontrol etmek için:"
echo "   systemctl status fulexo"
echo "   docker compose -f $PROJECT_DIR/compose/docker-compose.yml ps"
echo ""
echo "============================================="