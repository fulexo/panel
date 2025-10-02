#!/bin/bash

# Applies baseline hardening for Ubuntu hosts running the Fulexo stack

source "$(dirname "$0")/common.sh"

require_root

usage() {
  cat <<USAGE
Kullanım: $0 [--skip-swap]
USAGE
}

SKIP_SWAP=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-swap)
      SKIP_SWAP=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log warn "Bilinmeyen argüman: $1"
      usage
      exit 1
      ;;
  esac
done

log info "Paket listeleri güncelleniyor"
apt-get update
apt-get upgrade -y

log info "Güvenlik paketleri kuruluyor"
apt-get install -y ufw fail2ban unattended-upgrades

if [[ "$SKIP_SWAP" == false ]]; then
  if ! swapon --show | grep -q '/swapfile'; then
    log info "2GB swap dosyası oluşturuluyor"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
  else
    log info "Swap dosyası zaten mevcut"
  fi
fi

log info "UFW yapılandırılıyor"
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

log info "Fail2ban yapılandırması"
cat >/etc/fail2ban/jail.d/fulexo.conf <<'JAIL'
[sshd]
enabled = true
bantime = 1h
maxretry = 5
findtime = 15m
JAIL
systemctl restart fail2ban

log info "Unattended upgrades yapılandırılıyor"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'AUTO'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
AUTO

log success "Güvenlik yapılandırması tamamlandı"
