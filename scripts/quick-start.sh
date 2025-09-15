#!/bin/bash

# Fulexo Platform - Hızlı Başlangıç Script'i
# Bu script kurulum sonrası hızlı başlangıç yapar

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
ENV_FILE="/etc/fulexo/fulexo.env"

echo ""
echo "🚀 Fulexo Platform - Hızlı Başlangıç"
echo "===================================="
echo ""

# Environment dosyasını kontrol et
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment dosyası bulunamadı: $ENV_FILE"
    print_error "Önce kurulum script'lerini çalıştırın"
    exit 1
fi

# Domain bilgilerini al
DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)

# Eğer environment dosyasında yoksa varsayılan değerleri kullan
if [ -z "$DOMAIN_API" ]; then
    DOMAIN_API="api.fulexo.com"
fi

if [ -z "$DOMAIN_APP" ]; then
    DOMAIN_APP="panel.fulexo.com"
fi

print_info "Platform bilgileri:"
print_info "  API Domain: $DOMAIN_API"
print_info "  Panel Domain: $DOMAIN_APP"
echo ""

# 1. Servis durumunu kontrol et
print_info "1/6 - Servis durumu kontrol ediliyor..."
if systemctl is-active --quiet fulexo; then
    print_status "Fulexo servisi çalışıyor ✓"
else
    print_warning "Fulexo servisi çalışmıyor, başlatılıyor..."
    systemctl start fulexo
    sleep 10
fi

# 2. Container durumunu kontrol et
print_info "2/6 - Container durumu kontrol ediliyor..."
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)
EXPECTED_CONTAINERS=12

if [ $RUNNING_CONTAINERS -eq $EXPECTED_CONTAINERS ]; then
    print_status "Tüm container'lar çalışıyor ($RUNNING_CONTAINERS/$EXPECTED_CONTAINERS) ✓"
else
    print_warning "Bazı container'lar çalışmıyor ($RUNNING_CONTAINERS/$EXPECTED_CONTAINERS)"
    print_info "Container'lar yeniden başlatılıyor..."
    cd "$FULEXO_DIR/compose"
    docker compose restart
    sleep 20
fi

# 3. Database bağlantısını kontrol et
print_info "3/6 - Database bağlantısı kontrol ediliyor..."
if docker exec compose-postgres-1 pg_isready -U fulexo_user -d fulexo >/dev/null 2>&1; then
    print_status "Database bağlantısı başarılı ✓"
else
    print_warning "Database bağlantısı başarısız, yeniden başlatılıyor..."
    docker restart compose-postgres-1
    sleep 15
fi

# 4. API health check
print_info "4/6 - API health check yapılıyor..."
if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
    print_status "API servisi çalışıyor ✓"
else
    print_warning "API servisi henüz hazır değil, bekleniyor..."
    for i in {1..30}; do
        if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
            print_status "API servisi çalışıyor ✓"
            break
        fi
        sleep 10
    done
fi

# 5. Web servis kontrolü
print_info "5/6 - Web servis kontrol ediliyor..."
if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
    print_status "Web servisi çalışıyor ✓"
else
    print_warning "Web servisi henüz hazır değil, bekleniyor..."
    for i in {1..30}; do
        if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
            print_status "Web servisi çalışıyor ✓"
            break
        fi
        sleep 10
    done
fi

# 6. SSL sertifika kontrolü
print_info "6/6 - SSL sertifikaları kontrol ediliyor..."
if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" ]; then
    print_status "SSL sertifikaları mevcut ✓"
else
    print_warning "SSL sertifikaları bulunamadı"
    print_info "SSL kurulumu için: sudo $FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
fi

# Final status
echo ""
echo "🎉 HIZLI BAŞLANGIÇ TAMAMLANDI!"
echo "==============================="
echo ""
echo "✅ Platform durumu:"
echo "   - Servisler: $(systemctl is-active fulexo)"
echo "   - Container'lar: $RUNNING_CONTAINERS/$EXPECTED_CONTAINERS çalışıyor"
echo "   - API: $(curl -s -k "https://$DOMAIN_API/health" | grep -q "ok" && echo "Çalışıyor" || echo "Çalışmıyor")"
echo "   - Web: $(curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE" && echo "Çalışıyor" || echo "Çalışmıyor")"
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
echo "   - Health check: $FULEXO_DIR/scripts/health-check.sh"
echo "   - Sorun giderme: $FULEXO_DIR/scripts/fix-common-issues.sh"
echo "   - Backup: $FULEXO_DIR/scripts/backup-restore.sh backup"
echo "   - Güncelleme: $FULEXO_DIR/scripts/update-platform.sh"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. https://panel.fulexo.com adresine gidin"
echo "2. fulexo@fulexo.com / Adem_123* ile giriş yapın"
echo "3. Settings → Email → SMTP ayarlarınızı yapın"
echo "4. WooCommerce mağazalarınızı Admin panelinden ekleyin"
echo "5. Monitoring'i yapılandırın: sudo $FULEXO_DIR/scripts/setup-monitoring.sh"
echo ""
echo "🎊 Platform kullanıma hazır!"