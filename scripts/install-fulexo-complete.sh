#!/bin/bash

# Fulexo Platform - Tam Otomatik Kurulum Script'i
# Bu script tüm kurulumu otomatik yapar

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

echo ""
echo "🚀 Fulexo Platform - Tam Otomatik Kurulum"
echo "========================================="
echo "Domain'ler: panel.fulexo.com, api.fulexo.com"
echo "SSL Email: fulexo@fulexo.com"
echo "Admin: fulexo@fulexo.com / Adem_123*"
echo ""

# 1. Proje klonlama
print_status "1/8 - Projeyi klonluyor..."
if [ ! -d "/opt/fulexo" ]; then
    git clone https://github.com/fulexo/panel.git /opt/fulexo
    print_status "Proje klonlandı"
else
    print_warning "Proje zaten mevcut, güncelleniyor..."
    cd /opt/fulexo
    git pull
fi

cd /opt/fulexo

# 2. Sistem kurulumu
print_status "2/8 - Sistem kurulumu yapılıyor..."
chmod +x scripts/setup-droplet.sh
./scripts/setup-droplet.sh

# 3. Domain yapılandırması (otomatik)
print_status "3/8 - Domain'ler yapılandırıldı (api.fulexo.com, panel.fulexo.com)"

# 4. SSL kurulumu
print_status "4/8 - SSL sertifikaları kuruluyor..."
chmod +x scripts/setup-ssl-fulexo.sh
./scripts/setup-ssl-fulexo.sh

# 5. Servisleri başlat
print_status "5/8 - Docker servisleri başlatılıyor..."
systemctl start fulexo
sleep 20  # Servislerin başlaması için bekle

# 6. Veritabanı kurulumu
print_status "6/8 - Veritabanı kuruluyor..."
cd /opt/fulexo/apps/api
sudo -u fulexo npm install
sudo -u fulexo npm run prisma:migrate:deploy
sudo -u fulexo npm run prisma:seed

# 7. Admin kullanıcısını özelleştir
print_status "7/8 - Admin kullanıcısı yapılandırılıyor..."
chmod +x /opt/fulexo/scripts/create-admin-user.js
cd /opt/fulexo/apps/api
sudo -u fulexo node /opt/fulexo/scripts/create-admin-user.js

# 8. Son kontroller
print_status "8/8 - Kurulum doğrulanıyor..."
sleep 10

# Health check
if curl -s -k https://api.fulexo.com/health | grep -q "ok"; then
    print_status "API servisi çalışıyor"
else
    print_warning "API servisi henüz hazır değil, birkaç dakika bekleyin"
fi

if curl -s -k https://panel.fulexo.com | grep -q "html\|<!DOCTYPE"; then
    print_status "Web servisi çalışıyor"
else
    print_warning "Web servisi henüz hazır değil, birkaç dakika bekleyin"
fi

# Final status
echo ""
echo "🎉 KURULUM TAMAMLANDI!"
echo "====================="
echo ""
echo "✅ Fulexo Platform başarıyla kuruldu:"
echo ""
echo "🌐 Web Panel: https://panel.fulexo.com"
echo "🔗 API: https://api.fulexo.com"
echo "📚 API Docs: https://api.fulexo.com/docs"
echo ""
echo "👤 Admin Giriş Bilgileri:"
echo "   Email: fulexo@fulexo.com"
echo "   Şifre: Adem_123*"
echo ""
echo "🔧 Monitoring (SSH tüneli gerekli):"
echo "   Grafana: http://localhost:3002"
echo "   MinIO: http://localhost:9001"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. https://panel.fulexo.com adresine gidin"
echo "2. fulexo@fulexo.com / Adem_123* ile giriş yapın"
echo "3. Settings → Email → SMTP ayarlarınızı yapın"
echo "4. WooCommerce mağazalarınızı Admin panelinden ekleyin"
echo ""
echo "🎊 Kurulum başarıyla tamamlandı!"
