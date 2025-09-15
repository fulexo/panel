#!/bin/bash

# Fulexo Platform - Health Check Script'i
# Bu script platform sağlığını kontrol eder

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
echo "🏥 Fulexo Platform - Health Check"
echo "================================="
echo ""

# 1. Systemd servis durumu
print_info "1/8 - Systemd servis durumu kontrol ediliyor..."
if systemctl is-active --quiet fulexo; then
    print_status "Fulexo servisi çalışıyor ✓"
else
    print_error "Fulexo servisi çalışmıyor ✗"
fi

# 2. Docker container durumu
print_info "2/8 - Docker container durumu kontrol ediliyor..."
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)
EXPECTED_CONTAINERS=12

if [ $RUNNING_CONTAINERS -eq $EXPECTED_CONTAINERS ]; then
    print_status "Tüm container'lar çalışıyor ($RUNNING_CONTAINERS/$EXPECTED_CONTAINERS) ✓"
else
    print_warning "Bazı container'lar çalışmıyor ($RUNNING_CONTAINERS/$EXPECTED_CONTAINERS) ⚠"
fi

# Container listesi
print_info "Çalışan container'lar:"
docker ps --filter "name=compose-" --format "  {{.Names}} - {{.Status}}"

# 3. Database bağlantısı
print_info "3/8 - Database bağlantısı kontrol ediliyor..."
if docker exec compose-postgres-1 pg_isready -U fulexo_user -d fulexo >/dev/null 2>&1; then
    print_status "Database bağlantısı başarılı ✓"
else
    print_error "Database bağlantısı başarısız ✗"
fi

# 4. Redis bağlantısı
print_info "4/8 - Redis bağlantısı kontrol ediliyor..."
if docker exec compose-valkey-1 valkey-cli ping >/dev/null 2>&1; then
    print_status "Redis bağlantısı başarılı ✓"
else
    print_error "Redis bağlantısı başarısız ✗"
fi

# 5. MinIO bağlantısı
print_info "5/8 - MinIO bağlantısı kontrol ediliyor..."
if docker exec compose-minio-1 mc admin info >/dev/null 2>&1; then
    print_status "MinIO bağlantısı başarılı ✓"
else
    print_error "MinIO bağlantısı başarısız ✗"
fi

# 6. API health check
print_info "6/8 - API health check yapılıyor..."
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değeri kullan
    if [ -z "$DOMAIN_API" ]; then
        DOMAIN_API="api.fulexo.com"
    fi
    
    if curl -s -k "https://$DOMAIN_API/health" | grep -q "ok"; then
        print_status "API health check başarılı ✓"
    else
        print_error "API health check başarısız ✗"
    fi
else
    print_warning "Environment dosyası bulunamadı, API test atlanıyor"
fi

# 7. Web servis kontrolü
print_info "7/8 - Web servis kontrol ediliyor..."
if [ -f "$ENV_FILE" ]; then
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değeri kullan
    if [ -z "$DOMAIN_APP" ]; then
        DOMAIN_APP="panel.fulexo.com"
    fi
    
    if curl -s -k "https://$DOMAIN_APP" | grep -q "html\|<!DOCTYPE"; then
        print_status "Web servis çalışıyor ✓"
    else
        print_error "Web servis çalışmıyor ✗"
    fi
else
    print_warning "Environment dosyası bulunamadı, Web test atlanıyor"
fi

# 8. Disk kullanımı
print_info "8/8 - Disk kullanımı kontrol ediliyor..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    print_status "Disk kullanımı normal ($DISK_USAGE%) ✓"
else
    print_warning "Disk kullanımı yüksek ($DISK_USAGE%) ⚠"
fi

# Memory kullanımı
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -lt 80 ]; then
    print_status "Memory kullanımı normal ($MEMORY_USAGE%) ✓"
else
    print_warning "Memory kullanımı yüksek ($MEMORY_USAGE%) ⚠"
fi

# SSL sertifika kontrolü
print_info "SSL sertifika kontrol ediliyor..."
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değerleri kullan
    if [ -z "$DOMAIN_API" ]; then
        DOMAIN_API="api.fulexo.com"
    fi
    
    if [ -z "$DOMAIN_APP" ]; then
        DOMAIN_APP="panel.fulexo.com"
    fi
    
    # API SSL kontrolü
    if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ]; then
        API_DAYS=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
        API_DAYS_LEFT=$(( (API_DAYS - $(date +%s)) / 86400 ))
        
        if [ $API_DAYS_LEFT -gt 30 ]; then
            print_status "API SSL sertifikası geçerli ($API_DAYS_LEFT gün kaldı) ✓"
        else
            print_warning "API SSL sertifikası yakında sona erecek ($API_DAYS_LEFT gün kaldı) ⚠"
        fi
    else
        print_error "API SSL sertifikası bulunamadı ✗"
    fi
    
    # Panel SSL kontrolü
    if [ -f "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" ]; then
        APP_DAYS=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
        APP_DAYS_LEFT=$(( (APP_DAYS - $(date +%s)) / 86400 ))
        
        if [ $APP_DAYS_LEFT -gt 30 ]; then
            print_status "Panel SSL sertifikası geçerli ($APP_DAYS_LEFT gün kaldı) ✓"
        else
            print_warning "Panel SSL sertifikası yakında sona erecek ($APP_DAYS_LEFT gün kaldı) ⚠"
        fi
    else
        print_error "Panel SSL sertifikası bulunamadı ✗"
    fi
fi

# Sonuç özeti
echo ""
echo "📊 HEALTH CHECK SONUCU"
echo "======================"
echo ""

# Başarılı testler
SUCCESS_COUNT=0
TOTAL_TESTS=8

# Test sonuçlarını say
if systemctl is-active --quiet fulexo; then ((SUCCESS_COUNT++)); fi
if [ $RUNNING_CONTAINERS -eq $EXPECTED_CONTAINERS ]; then ((SUCCESS_COUNT++)); fi
if docker exec compose-postgres-1 pg_isready -U fulexo_user -d fulexo >/dev/null 2>&1; then ((SUCCESS_COUNT++)); fi
if docker exec compose-valkey-1 valkey-cli ping >/dev/null 2>&1; then ((SUCCESS_COUNT++)); fi
if docker exec compose-minio-1 mc admin info >/dev/null 2>&1; then ((SUCCESS_COUNT++)); fi

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    print_status "Tüm testler başarılı ($SUCCESS_COUNT/$TOTAL_TESTS) ✓"
    echo ""
    echo "🎉 Platform sağlıklı çalışıyor!"
else
    print_warning "Bazı testler başarısız ($SUCCESS_COUNT/$TOTAL_TESTS) ⚠"
    echo ""
    echo "🔧 Sorun giderme için:"
    echo "   - Logları kontrol edin: docker logs -f compose-api-1"
    echo "   - Servis durumunu kontrol edin: sudo systemctl status fulexo"
    echo "   - Container'ları yeniden başlatın: sudo systemctl restart fulexo"
fi

echo ""
echo "📋 Platform Bilgileri:"
if [ -f "$ENV_FILE" ]; then
    DOMAIN_API=$(grep "^DOMAIN_API=" "$ENV_FILE" | cut -d'=' -f2)
    DOMAIN_APP=$(grep "^DOMAIN_APP=" "$ENV_FILE" | cut -d'=' -f2)
    
    # Eğer environment dosyasında yoksa varsayılan değerleri kullan
    if [ -z "$DOMAIN_API" ]; then
        DOMAIN_API="api.fulexo.com"
    fi
    
    if [ -z "$DOMAIN_APP" ]; then
        DOMAIN_APP="panel.fulexo.com"
    fi
    
    echo "   - Panel: https://$DOMAIN_APP"
    echo "   - API: https://$DOMAIN_API"
    echo "   - API Docs: https://$DOMAIN_API/docs"
fi

echo "   - Admin: fulexo@fulexo.com / Adem_123*"
echo ""