#!/bin/bash

# Fulexo Platform - SSL Sertifika Kurulum Script'i
# Let's Encrypt ile ücretsiz SSL sertifikası kurulumu

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log fonksiyonları
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

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root kullanıcı olarak çalıştırılmalıdır!"
fi

# Domain bilgilerini al
read -p "API domain'inizi girin (örn: api.example.com): " API_DOMAIN
read -p "Web UI domain'inizi girin (örn: app.example.com): " APP_DOMAIN
read -p "Email adresinizi girin (Let's Encrypt bildirimleri için): " EMAIL

# Domain'leri kontrol et
if [ -z "$API_DOMAIN" ] || [ -z "$APP_DOMAIN" ] || [ -z "$EMAIL" ]; then
    error "Tüm bilgiler doldurulmalıdır!"
fi

log "SSL sertifikası kurulumu başlıyor..."

# 1. Certbot kurulumu
if ! command -v certbot &> /dev/null; then
    log "Certbot yükleniyor..."
    apt-get update
    apt-get install -y snapd
    snap install core; snap refresh core
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
else
    log "Certbot zaten yüklü"
fi

# 2. Nginx geçici olarak durdur (port 80 için)
log "Nginx servisi kontrol ediliyor..."
if systemctl is-active --quiet nginx; then
    systemctl stop nginx
    NGINX_WAS_RUNNING=true
fi

# Docker compose servislerini durdur
cd /opt/fulexo/compose
docker compose stop nginx 2>/dev/null || true

# 3. SSL sertifikalarını al
log "SSL sertifikaları alınıyor..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    -d $API_DOMAIN \
    -d $APP_DOMAIN

# 4. Nginx SSL yapılandırması
log "Nginx SSL yapılandırması oluşturuluyor..."

# API SSL yapılandırması
cat > /opt/fulexo/compose/nginx/conf.d/api-ssl.conf <<EOF
# HTTP -> HTTPS yönlendirme
server {
    listen 80;
    server_name $API_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS yapılandırması
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    # SSL sertifikaları
    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;

    # SSL yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Güvenlik başlıkları
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API için proxy
    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Let's Encrypt doğrulama
    location ~ /.well-known/acme-challenge {
        allow all;
        root /var/www/certbot;
    }
}
EOF

# Web UI SSL yapılandırması
cat > /opt/fulexo/compose/nginx/conf.d/web-ssl.conf <<EOF
# HTTP -> HTTPS yönlendirme
server {
    listen 80;
    server_name $APP_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS yapılandırması
server {
    listen 443 ssl http2;
    server_name $APP_DOMAIN;

    # SSL sertifikaları
    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;

    # SSL yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Güvenlik başlıkları
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:;" always;

    # Web UI için proxy
    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Let's Encrypt doğrulama
    location ~ /.well-known/acme-challenge {
        allow all;
        root /var/www/certbot;
    }
}
EOF

# 5. Otomatik yenileme için cron job
log "Otomatik SSL yenileme ayarlanıyor..."
cat > /etc/cron.d/certbot-renew <<EOF
# SSL sertifikalarını otomatik yenile
0 3 * * * root certbot renew --quiet --post-hook "docker compose -f /opt/fulexo/compose/docker-compose.yml restart nginx"
EOF

# 6. .env dosyasını güncelle
log ".env dosyası güncelleniyor..."
sed -i "s/DOMAIN_API=.*/DOMAIN_API=$API_DOMAIN/" /opt/fulexo/compose/.env
sed -i "s/DOMAIN_APP=.*/DOMAIN_APP=$APP_DOMAIN/" /opt/fulexo/compose/.env

# 7. Servisleri yeniden başlat
log "Servisler yeniden başlatılıyor..."
cd /opt/fulexo/compose
docker compose up -d

# Özet
echo ""
echo "============================================="
echo -e "${GREEN}SSL kurulumu tamamlandı!${NC}"
echo "============================================="
echo ""
echo "SSL sertifikaları şu domain'ler için kuruldu:"
echo "- API: https://$API_DOMAIN"
echo "- Web UI: https://$APP_DOMAIN"
echo ""
echo "Sertifika bilgileri:"
echo "- Konum: /etc/letsencrypt/live/$API_DOMAIN/"
echo "- Otomatik yenileme: Aktif (her gün saat 03:00)"
echo ""
echo "Sertifika durumunu kontrol etmek için:"
echo "  certbot certificates"
echo ""
echo "Manuel yenileme için:"
echo "  certbot renew"
echo ""
echo "============================================="