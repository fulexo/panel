#!/bin/bash

# Fulexo Platform - Hızlı Kurulum Script'i
# Bu script tüm kurulumu tek seferde yapar

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
echo "🚀 Fulexo Platform - Hızlı Kurulum"
echo "=================================="
echo "Bu script tüm kurulumu otomatik olarak yapar"
echo ""

# Domain bilgilerini otomatik ayarla
DOMAIN_API="api.fulexo.com"
DOMAIN_APP="panel.fulexo.com"
ADMIN_EMAIL="fulexo@fulexo.com"

echo "📋 Kurulum bilgileri:"
echo "  API Domain: $DOMAIN_API"
echo "  Panel Domain: $DOMAIN_APP"
echo "  Admin Email: $ADMIN_EMAIL"
echo ""

echo ""
print_info "Kurulum başlatılıyor..."
print_info "API Domain: $DOMAIN_API"
print_info "Panel Domain: $DOMAIN_APP"
print_info "Admin Email: $ADMIN_EMAIL"
echo ""

# 1. Temel kurulum
print_status "1/5 - Temel kurulum yapılıyor..."
if [ -f "/opt/fulexo/scripts/install-from-scratch.sh" ]; then
    # Domain bilgilerini environment'a export et
    export DOMAIN_API="$DOMAIN_API"
    export DOMAIN_APP="$DOMAIN_APP"
    export ADMIN_EMAIL="$ADMIN_EMAIL"
    
    # install-from-scratch.sh'yi çalıştır
    /opt/fulexo/scripts/install-from-scratch.sh
else
    print_error "install-from-scratch.sh script'i bulunamadı"
    exit 1
fi

# 2. DNS kontrolü
print_status "2/5 - DNS kayıtları kontrol ediliyor..."
SERVER_IP=$(curl -s ifconfig.me)

print_info "Sunucu IP adresi: $SERVER_IP"
print_warning "DNS kayıtlarınızı yapılandırdığınızdan emin olun:"
echo "   - $DOMAIN_API -> $SERVER_IP"
echo "   - $DOMAIN_APP -> $SERVER_IP"
echo ""

read -p "DNS kayıtlarını yapılandırdınız mı? (y/n): " DNS_READY
if [[ ! "$DNS_READY" =~ ^[Yy]$ ]]; then
    print_warning "DNS kayıtlarını yapılandırın ve script'i tekrar çalıştırın"
    exit 0
fi

# DNS propagation kontrolü
print_info "DNS propagation kontrol ediliyor..."
for i in {1..12}; do
    if nslookup "$DOMAIN_API" >/dev/null 2>&1 && nslookup "$DOMAIN_APP" >/dev/null 2>&1; then
        print_status "DNS kayıtları aktif ✓"
        break
    else
        print_info "DNS propagation bekleniyor... ($i/12)"
        sleep 10
    fi
done

# 3. Veritabanı migration'ı
print_status "3/5 - Veritabanı migration'ı yapılıyor..."
if [ -f "/opt/fulexo/scripts/migrate-database.sh" ]; then
    /opt/fulexo/scripts/migrate-database.sh
else
    print_warning "Migration script'i bulunamadı, manuel migration gerekebilir"
fi

# 4. SSL kurulumu
print_status "4/5 - SSL sertifikaları kuruluyor..."
if [ -f "/opt/fulexo/scripts/setup-ssl-fulexo.sh" ]; then
    # Domain bilgilerini environment'a export et
    export DOMAIN_API="$DOMAIN_API"
    export DOMAIN_APP="$DOMAIN_APP"
    export ADMIN_EMAIL="$ADMIN_EMAIL"
    
    /opt/fulexo/scripts/setup-ssl-fulexo.sh
else
    print_error "SSL kurulum script'i bulunamadı"
    exit 1
fi

# 5. Tam kurulum
print_status "5/6 - Tam kurulum yapılıyor..."
if [ -f "/opt/fulexo/scripts/complete-setup.sh" ]; then
    /opt/fulexo/scripts/complete-setup.sh
else
    print_error "complete-setup.sh script'i bulunamadı"
    exit 1
fi

# 6. Final test
print_status "6/6 - Final test yapılıyor..."

# API test
print_info "API servisi test ediliyor..."
if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
    print_status "API servisi çalışıyor ✓"
else
    print_warning "API servisi henüz hazır değil"
fi

# Web test
print_info "Web servisi test ediliyor..."
if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
    print_status "Web servisi çalışıyor ✓"
else
    print_warning "Web servisi henüz hazır değil"
fi

# Container test
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
echo "   - Panel: https://panel.fulexo.com"
echo "   - API: https://api.fulexo.com"
echo "   - API Docs: https://api.fulexo.com/docs"
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
echo "   - Logları görüntüle: docker logs -f compose-api-1"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. https://panel.fulexo.com adresine gidin"
echo "2. fulexo@fulexo.com / Adem_123* ile giriş yapın"
echo "3. Settings → Email → SMTP ayarlarınızı yapın"
echo "4. WooCommerce mağazalarınızı Admin panelinden ekleyin"
echo ""
echo "🎊 Kurulum başarıyla tamamlandı!"