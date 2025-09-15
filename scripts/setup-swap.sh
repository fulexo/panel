#!/bin/bash

# Fulexo Platform - Swap Kurulum Script'i
# Bu script sunucuya swap alanı ekler

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
echo "💾 Fulexo Platform - Swap Kurulumu"
echo "================================="
echo ""

# Mevcut swap kontrolü
print_info "Mevcut swap durumu kontrol ediliyor..."
if [ $(swapon --show | wc -l) -gt 0 ]; then
    print_warning "Swap alanı zaten mevcut:"
    swapon --show
    echo ""
    read -p "Mevcut swap'i silip yeni oluşturmak ister misiniz? (y/n): " RECREATE_SWAP
    if [[ ! "$RECREATE_SWAP" =~ ^[Yy]$ ]]; then
        print_info "Swap kurulumu iptal edildi"
        exit 0
    fi
    
    # Mevcut swap'i kapat
    print_status "Mevcut swap kapatılıyor..."
    swapoff -a
    sed -i '/swap/d' /etc/fstab
fi

# RAM miktarını kontrol et
RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
print_info "Sistem RAM'i: ${RAM_GB}GB"

# Swap boyutunu belirle (RAM'in 2 katı, max 8GB)
if [ $RAM_GB -le 2 ]; then
    SWAP_SIZE="4G"
elif [ $RAM_GB -le 4 ]; then
    SWAP_SIZE="8G"
else
    SWAP_SIZE="8G"
fi

print_info "Önerilen swap boyutu: ${SWAP_SIZE}"

# Kullanıcıdan onay al
read -p "Swap boyutunu onaylıyor musunuz? (${SWAP_SIZE}) (y/n): " CONFIRM_SIZE
if [[ ! "$CONFIRM_SIZE" =~ ^[Yy]$ ]]; then
    read -p "Swap boyutunu girin (örn: 2G, 4G, 8G): " CUSTOM_SIZE
    SWAP_SIZE="$CUSTOM_SIZE"
fi

# Swap dosyası oluştur
print_status "Swap dosyası oluşturuluyor (${SWAP_SIZE})..."

# Swap dosyasını oluştur
fallocate -l "$SWAP_SIZE" /swapfile

# Güvenlik izinleri
chmod 600 /swapfile

# Swap formatı
mkswap /swapfile

# Swap'i aktifleştir
swapon /swapfile

print_status "Swap dosyası oluşturuldu ve aktifleştirildi"

# Fstab'a ekle
print_status "Fstab'a ekleniyor..."
echo "/swapfile none swap sw 0 0" >> /etc/fstab

# Swap ayarlarını optimize et
print_status "Swap ayarları optimize ediliyor..."

# Swappiness ayarı (10 = düşük, 60 = varsayılan)
echo "vm.swappiness=10" >> /etc/sysctl.conf

# VFS cache pressure ayarı
echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf

# Ayarları uygula
sysctl -p

print_status "Swap ayarları optimize edildi"

# Swap durumunu göster
print_info "Swap durumu:"
swapon --show
echo ""

print_info "Sistem bellek durumu:"
free -h
echo ""

# Final status
echo ""
echo "💾 SWAP KURULUMU TAMAMLANDI!"
echo "==========================="
echo ""
echo "✅ Swap bilgileri:"
echo "   - Boyut: ${SWAP_SIZE}"
echo "   - Dosya: /swapfile"
echo "   - Swappiness: 10 (düşük)"
echo "   - VFS Cache Pressure: 50"
echo ""
echo "📊 Mevcut bellek durumu:"
free -h
echo ""
echo "🔧 Swap yönetimi komutları:"
echo "   - Swap durumu: swapon --show"
echo "   - Swap kapat: swapoff /swapfile"
echo "   - Swap aç: swapon /swapfile"
echo "   - Sistem bellek: free -h"
echo ""
echo "⚠️  NOT: Swap ayarları sistem yeniden başlatıldıktan sonra kalıcı olacak"
echo ""
echo "🎊 Swap kurulumu başarıyla tamamlandı!"