#!/bin/bash

# Creates helpful production folders and a systemd service to manage docker compose

source "$(dirname "$0")/common.sh"

require_root

SERVICE_NAME="${SERVICE_NAME:-fulexo-panel}"
APP_USER="${APP_USER:-fulexo}"
COMPOSE_PATH="${COMPOSE_PATH:-$PROJECT_ROOT/docker-compose.prod.yml}"

usage() {
  cat <<USAGE
Kullanım: $0 [--service-name ad] [--user kullanıcı] [--compose path]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --user)
      APP_USER="$2"
      shift 2
      ;;
    --compose)
      COMPOSE_PATH="$2"
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

if [[ ! -f "$COMPOSE_PATH" ]]; then
  log error "Compose dosyası bulunamadı: $COMPOSE_PATH"
  exit 1
fi

mkdir -p /var/log/fulexo
chown "$APP_USER":"$APP_USER" /var/log/fulexo

cat <<UNIT > "/etc/systemd/system/${SERVICE_NAME}.service"
[Unit]
Description=Fulexo Panel Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$APP_USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/bin/docker compose -f $COMPOSE_PATH up -d
ExecStop=/usr/bin/docker compose -f $COMPOSE_PATH down
StandardOutput=append:/var/log/fulexo/${SERVICE_NAME}.log
StandardError=append:/var/log/fulexo/${SERVICE_NAME}.log

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

log success "Systemd servisi oluşturuldu: $SERVICE_NAME"
log info "Servisi başlatmak için: systemctl start $SERVICE_NAME"
