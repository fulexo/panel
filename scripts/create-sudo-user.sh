#!/bin/bash

# Fulexo Platform - Sudo Kullanıcı Oluşturma Script'i
# Bu script root yerine sudo yetkili kullanıcı oluşturur

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
echo "👤 Fulexo Platform - Sudo Kullanıcı Oluşturma"
echo "============================================="
echo ""

# Kullanıcı adı al
read -p "Kullanıcı adını girin: " USERNAME

# Kullanıcı adı kontrolü
if [[ ! "$USERNAME" =~ ^[a-z][a-z0-9_-]*$ ]]; then
    print_error "Geçersiz kullanıcı adı! Sadece küçük harf, rakam, _ ve - kullanın"
    exit 1
fi

# Kullanıcı zaten var mı kontrol et
if id -u "$USERNAME" &>/dev/null; then
    print_warning "Kullanıcı '$USERNAME' zaten mevcut"
    read -p "Mevcut kullanıcıyı güncellemek ister misiniz? (y/n): " UPDATE_USER
    if [[ ! "$UPDATE_USER" =~ ^[Yy]$ ]]; then
        print_info "İşlem iptal edildi"
        exit 0
    fi
fi

# Kullanıcı oluştur/güncelle
if id -u "$USERNAME" &>/dev/null; then
    print_status "Kullanıcı '$USERNAME' güncelleniyor..."
    usermod -aG sudo "$USERNAME"
    usermod -aG docker "$USERNAME" 2>/dev/null || true
else
    print_status "Kullanıcı '$USERNAME' oluşturuluyor..."
    useradd -m -s /bin/bash "$USERNAME"
    usermod -aG sudo "$USERNAME"
    usermod -aG docker "$USERNAME" 2>/dev/null || true
fi

# SSH dizini oluştur
mkdir -p "/home/$USERNAME/.ssh"
chmod 700 "/home/$USERNAME/.ssh"
chown "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"

# SSH key oluştur
print_status "SSH key oluşturuluyor..."
if [ ! -f "/home/$USERNAME/.ssh/id_rsa" ]; then
    sudo -u "$USERNAME" ssh-keygen -t rsa -b 4096 -f "/home/$USERNAME/.ssh/id_rsa" -N ""
    print_status "SSH key oluşturuldu"
else
    print_warning "SSH key zaten mevcut"
fi

# Public key'i authorized_keys'e ekle
if [ ! -f "/home/$USERNAME/.ssh/authorized_keys" ]; then
    cp "/home/$USERNAME/.ssh/id_rsa.pub" "/home/$USERNAME/.ssh/authorized_keys"
    chmod 600 "/home/$USERNAME/.ssh/authorized_keys"
    chown "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh/authorized_keys"
    print_status "Public key authorized_keys'e eklendi"
fi

# Sudoers ayarları
print_status "Sudo ayarları yapılandırılıyor..."
cat > "/etc/sudoers.d/$USERNAME" << EOF
# $USERNAME sudo ayarları
$USERNAME ALL=(ALL) NOPASSWD:ALL
EOF

chmod 440 "/etc/sudoers.d/$USERNAME"

# Kullanıcı bilgilerini göster
print_info "Kullanıcı bilgileri:"
echo "   - Kullanıcı adı: $USERNAME"
echo "   - Ana dizin: /home/$USERNAME"
echo "   - Shell: /bin/bash"
echo "   - Gruplar: $(groups $USERNAME)"
echo ""

# SSH key bilgilerini göster
print_info "SSH Key bilgileri:"
echo "   - Private key: /home/$USERNAME/.ssh/id_rsa"
echo "   - Public key: /home/$USERNAME/.ssh/id_rsa.pub"
echo ""

# Public key'i göster
print_info "Public key (SSH ile bağlanmak için):"
echo "=========================================="
cat "/home/$USERNAME/.ssh/id_rsa.pub"
echo "=========================================="
echo ""

# Test bağlantısı için bilgi
print_info "Test bağlantısı:"
echo "   ssh $USERNAME@$(hostname -I | awk '{print $1}')"
echo ""

# Final status
echo ""
echo "👤 SUDO KULLANICI OLUŞTURMA TAMAMLANDI!"
echo "======================================"
echo ""
echo "✅ Kullanıcı '$USERNAME' başarıyla oluşturuldu:"
echo ""
echo "🔑 SSH Key:"
echo "   - Private: /home/$USERNAME/.ssh/id_rsa"
echo "   - Public: /home/$USERNAME/.ssh/id_rsa.pub"
echo ""
echo "🔐 Sudo Yetkileri:"
echo "   - Tam sudo yetkisi"
echo "   - Docker grubu üyesi"
echo "   - Password gerektirmez"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Public key'i kaydedin (yukarıda gösterilen)"
echo "2. SSH ile bağlanın: ssh $USERNAME@$(hostname -I | awk '{print $1}')"
echo "3. Root kullanıcısını devre dışı bırakın (güvenlik için)"
echo "4. Fulexo kurulumunu sudo kullanıcısı ile yapın"
echo ""
echo "⚠️  GÜVENLİK UYARISI:"
echo "   - Root kullanıcısını devre dışı bırakın"
echo "   - SSH key'inizi güvenli yerde saklayın"
echo "   - Password authentication'ı kapatın"
echo ""
echo "🎊 Sudo kullanıcı oluşturma başarıyla tamamlandı!"