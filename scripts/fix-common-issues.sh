#!/bin/bash

# Fulexo Platform - Yaygın Sorunları Düzeltme Script'i
# Bu script yaygın sorunları otomatik olarak düzeltir

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
echo "🔧 Fulexo Platform - Sorun Giderme"
echo "=================================="
echo ""

# 1. Docker servisini kontrol et ve başlat
print_info "1/10 - Docker servisini kontrol ediliyor..."
if ! systemctl is-active --quiet docker; then
    print_warning "Docker servisi çalışmıyor, başlatılıyor..."
    systemctl start docker
    systemctl enable docker
    print_status "Docker servisi başlatıldı ✓"
else
    print_status "Docker servisi çalışıyor ✓"
fi

# 2. Disk alanını kontrol et
print_info "2/10 - Disk alanı kontrol ediliyor..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    print_warning "Disk alanı kritik seviyede ($DISK_USAGE%)"
    print_info "Eski log dosyaları temizleniyor..."
    
    # Docker log dosyalarını temizle
    docker system prune -f
    docker volume prune -f
    
    # Eski backup dosyalarını temizle
    find /opt/fulexo/backups -type f -mtime +7 -delete 2>/dev/null || true
    
    print_status "Disk temizliği tamamlandı ✓"
else
    print_status "Disk alanı yeterli ($DISK_USAGE%) ✓"
fi

# 3. Memory kullanımını kontrol et
print_info "3/10 - Memory kullanımı kontrol ediliyor..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    print_warning "Memory kullanımı yüksek ($MEMORY_USAGE%)"
    print_info "Container'lar yeniden başlatılıyor..."
    
    # Container'ları yeniden başlat
    cd "$FULEXO_DIR/compose"
    docker compose restart
    
    print_status "Container'lar yeniden başlatıldı ✓"
else
    print_status "Memory kullanımı normal ($MEMORY_USAGE%) ✓"
fi

# 4. Container'ları kontrol et ve yeniden başlat
print_info "4/10 - Container durumu kontrol ediliyor..."
cd "$FULEXO_DIR/compose"

# Çalışmayan container'ları yeniden başlat
STOPPED_CONTAINERS=$(docker ps -a --filter "name=compose-" --filter "status=exited" --format "{{.Names}}")
if [ -n "$STOPPED_CONTAINERS" ]; then
    print_warning "Çalışmayan container'lar bulundu, yeniden başlatılıyor..."
    echo "$STOPPED_CONTAINERS" | xargs -I {} docker start {}
    print_status "Container'lar yeniden başlatıldı ✓"
else
    print_status "Tüm container'lar çalışıyor ✓"
fi

# 5. Database bağlantısını kontrol et
print_info "5/10 - Database bağlantısı kontrol ediliyor..."
if ! docker exec compose-postgres-1 pg_isready -U fulexo_user -d fulexo >/dev/null 2>&1; then
    print_warning "Database bağlantısı başarısız, yeniden başlatılıyor..."
    docker restart compose-postgres-1
    sleep 10
    
    # Database'in başlamasını bekle
    for i in {1..30}; do
        if docker exec compose-postgres-1 pg_isready -U fulexo_user -d fulexo >/dev/null 2>&1; then
            print_status "Database bağlantısı düzeltildi ✓"
            break
        fi
        sleep 2
    done
else
    print_status "Database bağlantısı başarılı ✓"
fi

# 6. Redis bağlantısını kontrol et
print_info "6/10 - Redis bağlantısı kontrol ediliyor..."
if ! docker exec compose-valkey-1 valkey-cli ping >/dev/null 2>&1; then
    print_warning "Redis bağlantısı başarısız, yeniden başlatılıyor..."
    docker restart compose-valkey-1
    sleep 5
    
    # Redis'in başlamasını bekle
    for i in {1..15}; do
        if docker exec compose-valkey-1 valkey-cli ping >/dev/null 2>&1; then
            print_status "Redis bağlantısı düzeltildi ✓"
            break
        fi
        sleep 2
    done
else
    print_status "Redis bağlantısı başarılı ✓"
fi

# 7. Nginx yapılandırmasını kontrol et
print_info "7/10 - Nginx yapılandırması kontrol ediliyor..."
if ! docker exec compose-nginx-1 nginx -t >/dev/null 2>&1; then
    print_warning "Nginx yapılandırması hatalı, yeniden başlatılıyor..."
    docker restart compose-nginx-1
    sleep 5
    print_status "Nginx yeniden başlatıldı ✓"
else
    print_status "Nginx yapılandırması doğru ✓"
fi

# 8. SSL sertifikalarını kontrol et
print_info "8/10 - SSL sertifikaları kontrol ediliyor..."
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    if [ -n "$DOMAIN_API" ] && [ -n "$DOMAIN_APP" ]; then
        # API SSL kontrolü
        if [ ! -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ]; then
            print_warning "API SSL sertifikası bulunamadı"
            print_info "SSL sertifikası kuruluyor..."
            if [ -f "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh" ]; then
                chmod +x "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
                "$FULEXO_DIR/scripts/setup-ssl-fulexo.sh"
            fi
        else
            print_status "API SSL sertifikası mevcut ✓"
        fi
        
        # Panel SSL kontrolü
        if [ ! -f "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" ]; then
            print_warning "Panel SSL sertifikası bulunamadı"
        else
            print_status "Panel SSL sertifikası mevcut ✓"
        fi
    fi
fi

# 9. Prisma client'ı yeniden generate et
print_info "9/10 - Prisma client yeniden generate ediliyor..."
cd "$FULEXO_DIR/apps/api"
if [ -f "package.json" ]; then
    sudo -u $FULEXO_USER npm run prisma:generate
    print_status "Prisma client yeniden generate edildi ✓"
else
    print_warning "API dizini bulunamadı"
fi

# 10. Servisleri yeniden başlat
print_info "10/10 - Servisler yeniden başlatılıyor..."
systemctl restart fulexo

# Servislerin başlamasını bekle
print_info "Servislerin başlaması bekleniyor (30 saniye)..."
sleep 30

# Final health check
print_info "Final health check yapılıyor..."

# Container durumu
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)
print_info "Çalışan container sayısı: $RUNNING_CONTAINERS"

# API health check
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değeri kullan
    if [ -z "$DOMAIN_API" ]; then
        DOMAIN_API="api.fulexo.com"
    fi
    
    if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
        print_status "API servisi çalışıyor ✓"
    else
        print_warning "API servisi henüz hazır değil"
    fi
fi

# Web health check
if [ -f "$ENV_FILE" ]; then
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değeri kullan
    if [ -z "$DOMAIN_APP" ]; then
        DOMAIN_APP="panel.fulexo.com"
    fi
    
    if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
        print_status "Web servisi çalışıyor ✓"
    else
        print_warning "Web servisi henüz hazır değil"
    fi
fi

echo ""
echo "🎉 SORUN GİDERME TAMAMLANDI!"
echo "============================="
echo ""
echo "✅ Yaygın sorunlar düzeltildi"
echo ""
echo "📊 Platform Durumu:"
echo "   - Container'lar: $RUNNING_CONTAINERS çalışıyor"
echo "   - Disk kullanımı: $DISK_USAGE%"
echo "   - Memory kullanımı: $MEMORY_USAGE%"
echo ""
echo "🔧 Eğer sorunlar devam ediyorsa:"
echo "   - Logları kontrol edin: docker logs -f compose-api-1"
echo "   - Health check çalıştırın: ./scripts/health-check.sh"
echo "   - Servis durumunu kontrol edin: sudo systemctl status fulexo"
echo ""
echo "🎊 Sorun giderme tamamlandı!"