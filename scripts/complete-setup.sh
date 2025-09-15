#!/bin/bash

# Fulexo Platform - Tam Kurulum Script'i
# Bu script SSL kurulumu, veritabanı setup'ı ve admin kullanıcısı oluşturmayı yapar

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

FULEXO_DIR="/opt/fulexo"
ENV_FILE="/etc/fulexo/fulexo.env"
FULEXO_USER="fulexo"

echo ""
echo "🔧 Fulexo Platform - Tam Kurulum"
echo "================================"
echo "Bu script SSL, veritabanı ve admin kullanıcısını kurar"
echo ""

# Environment dosyasını kontrol et
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment dosyası bulunamadı: $ENV_FILE"
    print_error "Önce install-from-scratch.sh script'ini çalıştırın"
    exit 1
fi

# Domain bilgilerini environment dosyasından al
DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)

if [ -z "$DOMAIN_API" ] || [ -z "$DOMAIN_APP" ]; then
    print_error "Domain bilgileri environment dosyasında bulunamadı"
    exit 1
fi

print_info "API Domain: $DOMAIN_API"
print_info "Panel Domain: $DOMAIN_APP"
echo ""

# 1. SSL sertifikalarını kur
print_status "1/4 - SSL sertifikaları kuruluyor..."
if [ -f "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh" ]; then
    chmod +x "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
    "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
else
    print_error "SSL kurulum script'i bulunamadı"
    exit 1
fi

# 2. Servisleri başlat
print_status "2/4 - Servisler başlatılıyor..."
systemctl start fulexo

# Servislerin başlamasını bekle
print_info "Servislerin başlaması bekleniyor (30 saniye)..."
sleep 30

# Servis durumunu kontrol et
if ! systemctl is-active --quiet fulexo; then
    print_warning "Fulexo servisi başlatılamadı, tekrar deneniyor..."
    systemctl restart fulexo
    sleep 20
fi

# 3. Veritabanı kurulumu
print_status "3/4 - Veritabanı kuruluyor..."
cd "$FULEXO_DIR/apps/api"

# Prisma client'ı generate et
sudo -u $FULEXO_USER npm run prisma:generate

# Migration'ları çalıştır
print_info "Database migration'ları çalıştırılıyor..."
sudo -u $FULEXO_USER npm run prisma:migrate:deploy

# Seed data'yı yükle
print_info "Seed data yükleniyor..."
sudo -u $FULEXO_USER npm run prisma:seed

# 4. Admin kullanıcısını oluştur
print_status "4/4 - Admin kullanıcısı oluşturuluyor..."
if [ -f "$FULEXO_DIR/scripts/create-admin-user.js" ]; then
    chmod +x "$FULEXO_DIR/scripts/create-admin-user.js"
    cd "$FULEXO_DIR/apps/api"
    sudo -u $FULEXO_USER node "$FULEXO_DIR/scripts/create-admin-user.js"
else
    print_error "Admin kullanıcı script'i bulunamadı"
    exit 1
fi

# 5. Health check
print_status "Health check yapılıyor..."

# API health check
print_info "API servisi kontrol ediliyor..."
if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
    print_status "API servisi çalışıyor ✓"
else
    print_warning "API servisi henüz hazır değil, birkaç dakika bekleyin"
fi

# Web health check
print_info "Web servisi kontrol ediliyor..."
if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
    print_status "Web servisi çalışıyor ✓"
else
    print_warning "Web servisi henüz hazır değil, birkaç dakika bekleyin"
fi

# Container durumunu kontrol et
print_info "Container durumu kontrol ediliyor..."
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)
print_info "Çalışan container sayısı: $RUNNING_CONTAINERS"

# Final status
echo ""
echo "🎉 KURULUM TAMAMLANDI!"
echo "====================="
echo ""
echo "✅ Fulexo Platform başarıyla kuruldu:"
echo ""
echo "🌐 Erişim URL'leri:"
echo "   - Panel: https://$DOMAIN_APP"
echo "   - API: https://$DOMAIN_API"
echo "   - API Docs: https://$DOMAIN_API/docs"
echo ""
echo "👤 Admin Giriş Bilgileri:"
echo "   - Email: fulexo@fulexo.com"
echo "   - Şifre: Adem_123*"
echo ""
echo "📊 Monitoring (SSH tüneli gerekli):"
echo "   - Grafana: http://localhost:3002"
echo "   - MinIO: http://localhost:9001"
echo "   - Uptime Kuma: http://localhost:3001"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Servis durumu: sudo systemctl status fulexo"
echo "   - Servis başlat: sudo systemctl start fulexo"
echo "   - Servis durdur: sudo systemctl stop fulexo"
echo "   - Servis yeniden başlat: sudo systemctl restart fulexo"
echo "   - Logları görüntüle: docker logs -f compose-api-1"
echo "   - Tüm loglar: docker compose -f $FULEXO_DIR/compose/docker-compose.yml logs"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. https://$DOMAIN_APP adresine gidin"
echo "2. fulexo@fulexo.com / Adem_123* ile giriş yapın"
echo "3. Settings → Email → SMTP ayarlarınızı yapın"
echo "4. WooCommerce mağazalarınızı Admin panelinden ekleyin"
echo ""
echo "🎊 Kurulum başarıyla tamamlandı!"