#!/bin/bash

# Bootstraps a fresh Ubuntu host for the Fulexo stack

source "$(dirname "$0")/common.sh"

require_root

usage() {
  cat <<USAGE
Kullanım: $0 [--user fulexo]

Yeni bir Ubuntu makinesinde gerekli paketleri kurar, docker'ı yükler ve proje dizinlerini oluşturur.
USAGE
}

APP_USER=fulexo

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user)
      APP_USER="$2"
      shift 2
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

log info "Sistem paketleri güncelleniyor"
apt-get update
apt-get upgrade -y

log info "Gerekli paketler yükleniyor"
apt-get install -y curl git ufw unzip ca-certificates gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  log info "Docker yükleniyor"
  bash "$PROJECT_ROOT/get-docker.sh"
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  log info "$APP_USER kullanıcısı oluşturuluyor"
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
fi

mkdir -p \
  "/opt/fulexo" \
  "/opt/fulexo/backups" \
  "/var/log/fulexo"
chown -R "$APP_USER":"$APP_USER" /opt/fulexo /var/log/fulexo

log info "SSH için temel güvenlik ayarları yapılandırılıyor"
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

log success "Kurulum tamamlandı. ${APP_USER} kullanıcısı ile projeyi /opt/fulexo altına klonlayın."
