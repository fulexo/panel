#!/bin/bash

# Fulexo Platform - Güvenlik Yapılandırma Script'i
# DigitalOcean droplet için gelişmiş güvenlik ayarları

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log fonksiyonları
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[HATA]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[UYARI]${NC} $1"
}

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root kullanıcı olarak çalıştırılmalıdır!"
fi

log "Güvenlik yapılandırması başlıyor..."

# 1. SSH güvenlik ayarları
log "SSH güvenliği yapılandırılıyor..."

# SSH config yedekle
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# SSH güvenlik ayarları
cat >> /etc/ssh/sshd_config <<EOF

# Fulexo Security Settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
ClientAliveInterval 120
ClientAliveCountMax 3
MaxAuthTries 3
MaxSessions 3
Protocol 2
EOF

# SSH servisi yeniden başlat
systemctl restart sshd

# 2. Kernel güvenlik parametreleri
log "Kernel güvenlik parametreleri ayarlanıyor..."

cat > /etc/sysctl.d/99-security.conf <<EOF
# IP Spoofing koruması
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# ICMP yönlendirmelerini kapat
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Kaynak yönlendirmeli paketleri kabul etme
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# ICMP yönlendirmelerini gönderme
net.ipv4.conf.all.send_redirects = 0

# SYN flood saldırılarına karşı koruma
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# ICMP ping'leri yoksay
net.ipv4.icmp_echo_ignore_all = 0

# TCP Timestamps
net.ipv4.tcp_timestamps = 0

# IP Forward'ı devre dışı bırak
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Çekirdek bellek ayarları
kernel.randomize_va_space = 2
kernel.kptr_restrict = 1
kernel.yama.ptrace_scope = 1
EOF

# Ayarları uygula
sysctl -p /etc/sysctl.d/99-security.conf

# 3. Dosya sistemi güvenliği
log "Dosya sistemi güvenliği ayarlanıyor..."

# /tmp dizini için güvenlik
echo "tmpfs /tmp tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=2G 0 0" >> /etc/fstab
mount -o remount /tmp

# Önemli dosyaların izinleri
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 600 /etc/shadow
chmod 600 /etc/gshadow

# 4. Audit daemon kurulumu
log "Auditd kurulumu yapılıyor..."
apt-get install -y auditd audispd-plugins

# Audit kuralları
cat > /etc/audit/rules.d/fulexo.rules <<EOF
# Sistem çağrılarını izle
-a always,exit -F arch=b64 -S execve -k exec
-a always,exit -F arch=b32 -S execve -k exec

# Dosya değişikliklerini izle
-w /etc/passwd -p wa -k passwd_changes
-w /etc/group -p wa -k group_changes
-w /etc/shadow -p wa -k shadow_changes
-w /etc/sudoers -p wa -k sudoers_changes

# SSH anahtarlarını izle
-w /home/ -p wa -k ssh_keys

# Docker'ı izle
-w /usr/bin/docker -p x -k docker
-w /var/lib/docker -p wa -k docker_lib

# Fulexo dizinini izle
-w /opt/fulexo -p wa -k fulexo_changes
EOF

# Audit servisini başlat
systemctl enable auditd
systemctl restart auditd

# 5. Rootkit tarayıcısı
log "Rootkit tarayıcısı (rkhunter) kuruluyor..."
apt-get install -y rkhunter
rkhunter --update
rkhunter --propupd

# 6. Malware tarayıcısı
log "ClamAV antivirus kuruluyor..."
apt-get install -y clamav clamav-daemon
systemctl stop clamav-freshclam
freshclam
systemctl start clamav-freshclam
systemctl enable clamav-daemon

# 7. İzinsiz giriş tespit sistemi (IDS)
log "AIDE kurulumu yapılıyor..."
apt-get install -y aide
aideinit
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# 8. Log analizi
log "Logwatch kurulumu yapılıyor..."
apt-get install -y logwatch
mkdir -p /var/cache/logwatch

# 9. Güvenlik duvarı gelişmiş kuralları
log "Gelişmiş firewall kuralları ekleniyor..."

# DDoS koruması
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL FIN,PSH,URG -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP

# Rate limiting
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Kuralları kaydet
apt-get install -y iptables-persistent
netfilter-persistent save

# 10. Otomatik güvenlik güncellemeleri
log "Otomatik güvenlik güncellemeleri yapılandırılıyor..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF

# 11. Güvenlik kontrol script'i
log "Güvenlik kontrol script'i oluşturuluyor..."
cat > /usr/local/bin/security-check.sh <<'EOF'
#!/bin/bash

echo "=== Fulexo Güvenlik Kontrolü ==="
echo "Tarih: $(date)"
echo ""

# Başarısız giriş denemeleri
echo "Son başarısız giriş denemeleri:"
lastb | head -10

# Aktif bağlantılar
echo -e "\nAktif ağ bağlantıları:"
ss -tuln | grep LISTEN

# Docker container durumları
echo -e "\nDocker container durumları:"
docker ps -a

# Disk kullanımı
echo -e "\nDisk kullanımı:"
df -h

# Bellek kullanımı
echo -e "\nBellek kullanımı:"
free -h

# Son güncellemeler
echo -e "\nSon güvenlik güncellemeleri:"
grep -i security /var/log/apt/history.log | tail -5

# Rootkit taraması özeti
echo -e "\nRootkit tarama sonucu:"
rkhunter --check --skip-keypress --report-warnings-only

echo -e "\n=== Kontrol tamamlandı ==="
EOF

chmod +x /usr/local/bin/security-check.sh

# 12. Cron job'ları
log "Güvenlik cron job'ları ekleniyor..."
cat > /etc/cron.d/fulexo-security <<EOF
# Günlük güvenlik taraması
0 2 * * * root /usr/local/bin/security-check.sh >> /var/log/fulexo-security.log 2>&1

# Haftalık rootkit taraması
0 3 * * 0 root rkhunter --check --skip-keypress --report-warnings-only

# Haftalık malware taraması
0 4 * * 0 root clamscan -r /opt/fulexo --log=/var/log/fulexo-clamscan.log

# AIDE veritabanı kontrolü
0 5 * * * root aide --check
EOF

# Özet
echo ""
echo "============================================="
echo -e "${GREEN}Güvenlik yapılandırması tamamlandı!${NC}"
echo "============================================="
echo ""
echo "Uygulanan güvenlik önlemleri:"
echo "✓ SSH güvenlik ayarları (root login devre dışı, sadece key auth)"
echo "✓ Kernel güvenlik parametreleri"
echo "✓ Dosya sistemi güvenliği"
echo "✓ Audit daemon (auditd) kurulumu"
echo "✓ Rootkit tarayıcısı (rkhunter)"
echo "✓ Antivirus (ClamAV)"
echo "✓ İzinsiz giriş tespit sistemi (AIDE)"
echo "✓ Log analizi (logwatch)"
echo "✓ DDoS koruması ve rate limiting"
echo "✓ Otomatik güvenlik güncellemeleri"
echo ""
echo "Önemli notlar:"
echo "! SSH artık sadece key authentication kabul ediyor"
echo "! Root login devre dışı"
echo "! Güvenlik logları: /var/log/fulexo-security.log"
echo ""
echo "Güvenlik kontrolü için:"
echo "  /usr/local/bin/security-check.sh"
echo ""
echo "============================================="