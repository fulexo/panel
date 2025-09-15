#!/bin/bash

# Fulexo Platform - Güncelleme Script'i
# Bu script platformu günceller

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
FULEXO_USER="fulexo"
ENV_FILE="/etc/fulexo/fulexo.env"

echo ""
echo "🔄 Fulexo Platform - Güncelleme"
echo "==============================="
echo ""

# Backup oluştur
print_status "1/6 - Backup oluşturuluyor..."
if [ -f "$FULEXO_DIR/scripts/backup.sh" ]; then
    sudo -u $FULEXO_USER "$FULEXO_DIR/scripts/backup.sh"
    print_status "Backup oluşturuldu ✓"
else
    print_warning "Backup script'i bulunamadı, devam ediliyor..."
fi

# Servisleri durdur
print_status "2/6 - Servisler durduruluyor..."
systemctl stop fulexo
print_status "Servisler durduruldu ✓"

# Repository'yi güncelle
print_status "3/6 - Repository güncelleniyor..."
cd "$FULEXO_DIR"
sudo -u $FULEXO_USER git fetch origin
sudo -u $FULEXO_USER git pull origin main
print_status "Repository güncellendi ✓"

# Dependencies güncelle
print_status "4/6 - Dependencies güncelleniyor..."
cd "$FULEXO_DIR/apps/api"
sudo -u $FULEXO_USER npm install
sudo -u $FULEXO_USER npm run prisma:generate
print_status "Dependencies güncellendi ✓"

# Database migration
print_status "5/6 - Database migration çalıştırılıyor..."
sudo -u $FULEXO_USER npm run prisma:migrate:deploy
print_status "Database migration tamamlandı ✓"

# Servisleri başlat
print_status "6/6 - Servisler başlatılıyor..."
systemctl start fulexo

# Servislerin başlamasını bekle
print_info "Servislerin başlaması bekleniyor (30 saniye)..."
sleep 30

# Health check
print_info "Health check yapılıyor..."

# Environment dosyasından domain bilgilerini al
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    if [ -n "$DOMAIN_API" ] && [ -n "$DOMAIN_APP" ]; then
        # API test
        if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
            print_status "API servisi çalışıyor ✓"
        else
            print_warning "API servisi henüz hazır değil"
        fi
        
        # Web test
        if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
            print_status "Web servisi çalışıyor ✓"
        else
            print_warning "Web servisi henüz hazır değil"
        fi
    fi
fi

# Container durumunu kontrol et
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)
print_info "Çalışan container sayısı: $RUNNING_CONTAINERS"

echo ""
echo "🎉 GÜNCELLEME TAMAMLANDI!"
echo "========================="
echo ""
echo "✅ Fulexo Platform başarıyla güncellendi"
echo ""
echo "🔧 Yönetim Komutları:"
echo "   - Servis durumu: sudo systemctl status fulexo"
echo "   - Logları görüntüle: docker logs -f compose-api-1"
echo "   - Tüm loglar: docker compose -f $FULEXO_DIR/compose/docker-compose.yml logs"
echo ""
echo "🎊 Güncelleme başarıyla tamamlandı!"