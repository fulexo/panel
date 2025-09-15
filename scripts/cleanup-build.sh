#!/bin/bash

# Fulexo Platform - Build Kalıntı Temizleme Script'i
# Bu script build süreçlerinde oluşan kalıntıları temizler

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
   print_error "Bu script root olarak çalıştırılmalıdır"
   exit 1
fi

echo ""
echo "🧹 Fulexo Platform - Build Kalıntı Temizleme"
echo "==========================================="
echo ""

# 1. Docker temizliği
print_status "1/8 - Docker kalıntıları temizleniyor..."

# Durdurulmuş container'ları sil
print_info "Durdurulmuş container'lar siliniyor..."
docker container prune -f

# Kullanılmayan image'ları sil
print_info "Kullanılmayan image'lar siliniyor..."
docker image prune -f

# Kullanılmayan volume'ları sil
print_info "Kullanılmayan volume'lar siliniyor..."
docker volume prune -f

# Kullanılmayan network'leri sil
print_info "Kullanılmayan network'ler siliniyor..."
docker network prune -f

# Build cache'i temizle
print_info "Build cache temizleniyor..."
docker builder prune -f

print_status "Docker kalıntıları temizlendi"

# 2. Node.js temizliği
print_status "2/8 - Node.js kalıntıları temizleniyor..."

# node_modules ve package-lock.json'ları sil
find /opt/fulexo -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find /opt/fulexo -name "package-lock.json" -type f -delete 2>/dev/null || true
find /opt/fulexo -name "yarn.lock" -type f -delete 2>/dev/null || true

# npm cache temizle
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null || true
fi

# yarn cache temizle
if command -v yarn &> /dev/null; then
    yarn cache clean 2>/dev/null || true
fi

print_status "Node.js kalıntıları temizlendi"

# 3. Build dosyaları temizliği
print_status "3/8 - Build dosyaları temizleniyor..."

# Next.js build dosyaları
find /opt/fulexo -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find /opt/fulexo -name "out" -type d -exec rm -rf {} + 2>/dev/null || true

# TypeScript build dosyaları
find /opt/fulexo -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find /opt/fulexo -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
find /opt/fulexo -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true

# Prisma build dosyaları
find /opt/fulexo -name "prisma" -type d -exec find {} -name "*.js" -delete \; 2>/dev/null || true

print_status "Build dosyaları temizlendi"

# 4. Log dosyaları temizliği
print_status "4/8 - Log dosyaları temizleniyor..."

# Eski log dosyalarını sil (7 günden eski)
find /var/log -name "*.log.*" -type f -mtime +7 -delete 2>/dev/null || true
find /var/log -name "*.gz" -type f -mtime +7 -delete 2>/dev/null || true

# Docker log dosyalarını temizle
find /var/lib/docker/containers -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

# Nginx log dosyalarını temizle
find /var/log/nginx -name "*.log.*" -type f -mtime +7 -delete 2>/dev/null || true

print_status "Log dosyaları temizlendi"

# 5. Geçici dosyalar temizliği
print_status "5/8 - Geçici dosyalar temizleniyor..."

# /tmp temizliği
find /tmp -type f -mtime +1 -delete 2>/dev/null || true
find /tmp -type d -empty -delete 2>/dev/null || true

# /var/tmp temizliği
find /var/tmp -type f -mtime +1 -delete 2>/dev/null || true
find /var/tmp -type d -empty -delete 2>/dev/null || true

# apt cache temizliği
apt-get clean
apt-get autoclean

print_status "Geçici dosyalar temizlendi"

# 6. Disk alanı kontrolü
print_status "6/8 - Disk alanı kontrol ediliyor..."

# Disk kullanımını göster
print_info "Disk kullanımı:"
df -h

# En büyük dosyaları bul
print_info "En büyük dosyalar (ilk 10):"
find /opt/fulexo -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -10 || true

print_status "Disk alanı kontrol edildi"

# 7. Sistem temizliği
print_status "7/8 - Sistem temizliği yapılıyor..."

# Kullanılmayan paketleri kaldır
apt-get autoremove -y

# Eski kernel'leri kaldır
apt-get autoremove --purge -y

# Eski konfigürasyon dosyalarını kaldır
apt-get purge -y $(dpkg -l | grep '^rc' | awk '{print $2}') 2>/dev/null || true

print_status "Sistem temizliği tamamlandı"

# 8. Fulexo özel temizliği
print_status "8/8 - Fulexo özel temizliği yapılıyor..."

# Backup dosyalarını temizle (7 günden eski)
find /opt/fulexo/backups -name "*.gz" -type f -mtime +7 -delete 2>/dev/null || true
find /opt/fulexo/backups -name "*.tar" -type f -mtime +7 -delete 2>/dev/null || true

# Eski log dosyalarını temizle
find /opt/fulexo -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

# Geçici dosyaları temizle
find /opt/fulexo -name "*.tmp" -type f -delete 2>/dev/null || true
find /opt/fulexo -name "*.temp" -type f -delete 2>/dev/null || true

print_status "Fulexo özel temizliği tamamlandı"

# Final durum
echo ""
echo "🧹 BUILD KALINTI TEMİZLEME TAMAMLANDI!"
echo "====================================="
echo ""

# Disk alanı durumu
print_info "Temizlik sonrası disk durumu:"
df -h

# Temizlenen alan hesaplama
print_info "Temizlenen alan tahmini:"
echo "   - Docker kalıntıları: ~500MB-2GB"
echo "   - Node.js cache: ~100-500MB"
echo "   - Build dosyaları: ~200-800MB"
echo "   - Log dosyaları: ~50-200MB"
echo "   - Geçici dosyalar: ~10-100MB"
echo ""

# Öneriler
print_info "Öneriler:"
echo "   - Bu script'i haftalık çalıştırın"
echo "   - Disk alanını düzenli kontrol edin"
echo "   - Backup dosyalarını farklı sunucuda saklayın"
echo ""

# Cron job önerisi
print_info "Otomatik temizlik için cron job:"
echo "   0 2 * * 0 /opt/fulexo/scripts/cleanup-build.sh"
echo ""

echo "🎊 Build kalıntı temizleme başarıyla tamamlandı!"