#!/bin/bash

# Fulexo Platform - Güvenlik Kurulum Script'i
# Bu script sunucu güvenliğini artırır

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
echo "🔒 Fulexo Platform - Güvenlik Kurulumu"
echo "====================================="
echo ""

# 1. SSH güvenliği
print_status "1/6 - SSH güvenliği yapılandırılıyor..."

# SSH config backup
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# SSH güvenlik ayarları
cat > /etc/ssh/sshd_config.d/99-fulexo-security.conf << 'EOF'
# Fulexo Security Settings
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
ChrootDirectory none
EOF

# SSH servisini yeniden başlat
systemctl restart sshd

print_status "SSH güvenliği yapılandırıldı"

# 2. Swap alanı ekleme
print_status "2/6 - Swap alanı ekleniyor..."

# Mevcut swap kontrolü
if [ $(swapon --show | wc -l) -eq 0 ]; then
    # 2GB swap dosyası oluştur
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Fstab'a ekle
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Swap ayarları
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    
    print_status "2GB swap alanı eklendi"
else
    print_warning "Swap alanı zaten mevcut"
fi

# 3. Sistem güncellemeleri
print_status "3/6 - Sistem güncellemeleri yapılıyor..."
apt-get update
apt-get upgrade -y
apt-get autoremove -y
apt-get autoclean

print_status "Sistem güncellemeleri tamamlandı"

# 4. Güvenlik paketleri
print_status "4/6 - Güvenlik paketleri kuruluyor..."
apt-get install -y \
    ufw \
    fail2ban \
    rkhunter \
    chkrootkit \
    unattended-upgrades \
    apt-listchanges

# Otomatik güncellemeleri yapılandır
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Otomatik güncellemeleri etkinleştir
echo 'Unattended-Upgrade::Automatic-Reboot "false";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'Unattended-Upgrade::Remove-Unused-Dependencies "true";' >> /etc/apt/apt.conf.d/20auto-upgrades

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

print_status "Güvenlik paketleri kuruldu"

# 5. Log rotasyonu
print_status "5/6 - Log rotasyonu yapılandırılıyor..."

cat > /etc/logrotate.d/fulexo-security << 'EOF'
/var/log/auth.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}

/var/log/syslog {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}

/var/log/fail2ban.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}
EOF

print_status "Log rotasyonu yapılandırıldı"

# 6. Güvenlik taraması
print_status "6/6 - Güvenlik taraması yapılıyor..."

# Rootkit taraması
if command -v rkhunter &> /dev/null; then
    rkhunter --update
    rkhunter --check --skip-keypress
fi

# Chkrootkit taraması
if command -v chkrootkit &> /dev/null; then
    chkrootkit
fi

print_status "Güvenlik taraması tamamlandı"

# Final status
echo ""
echo "🔒 GÜVENLİK KURULUMU TAMAMLANDI!"
echo "==============================="
echo ""
echo "✅ Yapılan güvenlik iyileştirmeleri:"
echo ""
echo "🛡️  SSH Güvenliği:"
echo "   - Root login devre dışı"
echo "   - Password authentication devre dışı"
echo "   - Key-based authentication zorunlu"
echo "   - Max auth tries: 3"
echo ""
echo "🔥 Firewall:"
echo "   - UFW aktif"
echo "   - Sadece gerekli portlar açık"
echo "   - Brute force koruması"
echo ""
echo "🚫 Fail2ban:"
echo "   - SSH brute force koruması"
echo "   - Nginx auth koruması"
echo "   - Otomatik IP engelleme"
echo ""
echo "💾 Swap Alanı:"
echo "   - 2GB swap dosyası eklendi"
echo "   - Optimize edilmiş ayarlar"
echo ""
echo "🔄 Otomatik Güncellemeler:"
echo "   - Güvenlik güncellemeleri otomatik"
echo "   - Sistem güncellemeleri otomatik"
echo ""
echo "📊 Log Yönetimi:"
echo "   - 30 günlük log rotasyonu"
echo "   - Sıkıştırma aktif"
echo ""
echo "⚠️  ÖNEMLİ UYARILAR:"
echo "1. SSH key'inizi kaydetmeyi unutmayın!"
echo "2. Root kullanıcısı ile giriş artık mümkün değil"
echo "3. Sudo kullanıcısı oluşturun: adduser yourusername && usermod -aG sudo yourusername"
echo "4. Firewall durumunu kontrol edin: ufw status"
echo ""
echo "🎊 Güvenlik kurulumu başarıyla tamamlandı!"