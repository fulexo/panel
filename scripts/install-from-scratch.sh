#!/bin/bash

# Fulexo Platform - Sıfırdan Kurulum Script'i
# Bu script sunucuyu sıfırdan kurar ve Fulexo Platform'u yükler

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Bu script root olarak çalıştırılmalıdır"
   exit 1
fi

echo ""
echo "🚀 Fulexo Platform - Sıfırdan Kurulum"
echo "====================================="
echo "Bu script sunucunuzu sıfırdan kurar ve Fulexo Platform'u yükler"
echo ""

# Konfigürasyon değişkenleri
FULEXO_USER="fulexo"
FULEXO_DIR="/opt/fulexo"
ENV_DIR="/etc/fulexo"
ENV_FILE="$ENV_DIR/fulexo.env"
GIT_REPO="https://github.com/fulexo/panel.git"

# Domain ayarları (kullanıcıdan alınacak)
DOMAIN_API=""
DOMAIN_APP=""
ADMIN_EMAIL=""

# Kullanıcıdan domain bilgilerini al
echo "📋 Kurulum için gerekli bilgiler:"
echo ""

read -p "API Domain (örn: api.yourdomain.com): " DOMAIN_API
read -p "Panel Domain (örn: panel.yourdomain.com): " DOMAIN_APP
read -p "Admin Email (Let's Encrypt için): " ADMIN_EMAIL

# Domain validation
if [[ ! "$DOMAIN_API" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Geçersiz API domain formatı!"
    exit 1
fi

if [[ ! "$DOMAIN_APP" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Geçersiz Panel domain formatı!"
    exit 1
fi

if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Geçersiz email formatı!"
    exit 1
fi

echo ""
print_info "Kurulum başlatılıyor..."
print_info "API Domain: $DOMAIN_API"
print_info "Panel Domain: $DOMAIN_APP"
print_info "Admin Email: $ADMIN_EMAIL"
echo ""

# 1. Sistem güncellemesi
print_status "1/12 - Sistem güncelleniyor..."
apt-get update
apt-get upgrade -y

# 2. Gerekli paketlerin kurulumu
print_status "2/12 - Gerekli paketler kuruluyor..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    git \
    htop \
    vim \
    wget \
    build-essential \
    software-properties-common \
    snapd

# 3. Docker kurulumu
print_status "3/12 - Docker kuruluyor..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
else
    print_warning "Docker zaten kurulu"
fi

# 4. Node.js kurulumu
print_status "4/12 - Node.js 20 kuruluyor..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    print_warning "Node.js 20+ zaten kurulu"
fi

# 5. Firewall yapılandırması
print_status "5/12 - Firewall yapılandırılıyor..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9000:9001/tcp  # MinIO ports
ufw allow 3001/tcp       # Uptime Kuma
ufw allow 3002/tcp       # Grafana
ufw allow 9093/tcp       # Alertmanager
ufw allow 16686/tcp      # Jaeger
ufw --force enable

# 6. Fail2ban yapılandırması
print_status "6/12 - Fail2ban yapılandırılıyor..."
systemctl enable fail2ban
systemctl start fail2ban

# 7. Uygulama kullanıcısı oluşturma
print_status "7/12 - Uygulama kullanıcısı oluşturuluyor..."
if ! id -u $FULEXO_USER &>/dev/null; then
    useradd -m -s /bin/bash $FULEXO_USER
    usermod -aG docker $FULEXO_USER
else
    print_warning "Kullanıcı '$FULEXO_USER' zaten mevcut"
fi

# 8. Uygulama dizinleri oluşturma
print_status "8/12 - Uygulama dizinleri oluşturuluyor..."
mkdir -p $FULEXO_DIR
mkdir -p $ENV_DIR
chown $FULEXO_USER:$FULEXO_USER $FULEXO_DIR

# 9. Repository klonlama
print_status "9/12 - Repository klonlanıyor..."
cd $FULEXO_DIR
if [ ! -d ".git" ]; then
    sudo -u $FULEXO_USER git clone $GIT_REPO .
else
    print_warning "Repository zaten mevcut, güncelleniyor..."
    sudo -u $FULEXO_USER git pull
fi

# 10. Environment dosyası oluşturma
print_status "10/12 - Environment yapılandırması oluşturuluyor..."

# Güvenli şifreler oluştur
POSTGRES_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
MINIO_ACCESS=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)
MINIO_SECRET=$(openssl rand -base64 40 | tr -d "=+/" | cut -c1-40)
GRAFANA_PASS=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)
SHARE_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Environment dosyasını oluştur
cat > $ENV_FILE << EOF
# Fulexo Platform Environment Configuration
# Generated on $(date)

# Domain Configuration
DOMAIN_API=$DOMAIN_API
DOMAIN_APP=$DOMAIN_APP
NODE_ENV=production
PUBLIC_API_BASE=https://$DOMAIN_API

# Database Configuration
POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=$POSTGRES_PASS

# Cache & Queue Configuration
REDIS_URL=redis://valkey:6379/0

# Security Configuration
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Object Storage (MinIO) Configuration
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=$MINIO_ACCESS
S3_SECRET_KEY=$MINIO_SECRET
S3_BUCKET=fulexo-cache

# Monitoring Configuration
GF_SECURITY_ADMIN_PASSWORD=$GRAFANA_PASS

# Additional Configuration
SHARE_TOKEN_SECRET=$SHARE_SECRET
NEXT_PUBLIC_APP_URL=https://$DOMAIN_APP
PORT=3000
ENV_FILE=$ENV_FILE
EOF

# Symlink oluştur
ln -sf $ENV_FILE $FULEXO_DIR/compose/.env

print_warning "ÖNEMLİ: Bu bilgileri güvenli bir yerde saklayın!"
echo "================================================"
echo "PostgreSQL Password: $POSTGRES_PASS"
echo "MinIO Access Key: $MINIO_ACCESS"
echo "MinIO Secret Key: $MINIO_SECRET"
echo "Grafana Admin Password: $GRAFANA_PASS"
echo "================================================"

# 11. Systemd servisi oluşturma
print_status "11/12 - Systemd servisi oluşturuluyor..."
cat > /etc/systemd/system/fulexo.service << EOF
[Unit]
Description=Fulexo Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$FULEXO_USER
WorkingDirectory=$FULEXO_DIR/compose
Environment=ENV_FILE=$ENV_FILE
ExecStart=/usr/bin/docker compose --env-file $ENV_FILE -f $FULEXO_DIR/compose/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose --env-file $ENV_FILE -f $FULEXO_DIR/compose/docker-compose.yml down
ExecReload=/usr/bin/docker compose --env-file $ENV_FILE -f $FULEXO_DIR/compose/docker-compose.yml restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fulexo.service

# 12. Veritabanı bağımlılıkları kurulumu
print_status "12/12 - Veritabanı bağımlılıkları kuruluyor..."
cd $FULEXO_DIR/apps/api
sudo -u $FULEXO_USER npm install
sudo -u $FULEXO_USER npm run prisma:generate

# Backup script oluştur
print_status "Backup script oluşturuluyor..."
mkdir -p $FULEXO_DIR/scripts
cat > $FULEXO_DIR/scripts/backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/fulexo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Load environment
ENV_FILE="/etc/fulexo/fulexo.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

PG_USER="${POSTGRES_USER:-fulexo_user}"
PG_DB="${POSTGRES_DB:-fulexo}"

# Backup database
docker exec compose-postgres-1 pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Backup volumes
docker run --rm -v compose_pgdata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/pgdata_${DATE}.tar.gz" -C /data .
docker run --rm -v compose_miniodata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/miniodata_${DATE}.tar.gz" -C /data .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -type f -mtime +7 -delete
EOF

chmod +x $FULEXO_DIR/scripts/backup.sh
chown -R $FULEXO_USER:$FULEXO_USER $FULEXO_DIR/scripts

# Cron job oluştur
echo "0 2 * * * $FULEXO_USER $FULEXO_DIR/scripts/backup.sh" | crontab -u $FULEXO_USER -

print_status "Kurulum tamamlandı!"
echo ""
echo "🎉 FULEXO PLATFORM KURULUMU TAMAMLANDI!"
echo "========================================"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. DNS kayıtlarınızı yapılandırın:"
echo "   - $DOMAIN_API -> $(curl -s ifconfig.me)"
echo "   - $DOMAIN_APP -> $(curl -s ifconfig.me)"
echo ""
echo "2. SSL sertifikalarını kurun:"
echo "   sudo $FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
echo ""
echo "3. Servisleri başlatın:"
echo "   sudo systemctl start fulexo"
echo ""
echo "4. Veritabanını başlatın:"
echo "   cd $FULEXO_DIR/apps/api"
echo "   sudo -u $FULEXO_USER npm run prisma:migrate:deploy"
echo "   sudo -u $FULEXO_USER npm run prisma:seed"
echo ""
echo "5. Admin kullanıcısını oluşturun:"
echo "   sudo -u $FULEXO_USER node $FULEXO_DIR/scripts/create-admin-user.js"
echo ""
echo "🌐 Erişim URL'leri:"
echo "   - Panel: https://$DOMAIN_APP"
echo "   - API: https://$DOMAIN_API"
echo "   - API Docs: https://$DOMAIN_API/docs"
echo ""
echo "👤 Varsayılan Admin:"
echo "   - Email: fulexo@fulexo.com"
echo "   - Şifre: Adem_123*"
echo ""
echo "📊 Monitoring (SSH tüneli gerekli):"
echo "   - Grafana: http://localhost:3002"
echo "   - MinIO: http://localhost:9001"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Servis durumu: sudo systemctl status fulexo"
echo "   - Servis başlat: sudo systemctl start fulexo"
echo "   - Servis durdur: sudo systemctl stop fulexo"
echo "   - Logları görüntüle: docker logs -f compose-api-1"
echo ""
echo "🎊 Kurulum başarıyla tamamlandı!"