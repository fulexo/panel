#!/bin/bash

# Generates self-signed TLS certificates for the nginx reverse proxy

source "$(dirname "$0")/common.sh"

require_root

usage() {
  cat <<USAGE
Kullanım: $0 --domain panel.example.com [--api-domain api.example.com]

Sertifikalar compose/nginx/certs dizinine yazılır.
USAGE
}

PANEL_DOMAIN=""
API_DOMAIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      PANEL_DOMAIN="$2"
      shift 2
      ;;
    --api-domain)
      API_DOMAIN="$2"
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

if [[ -z "$PANEL_DOMAIN" ]]; then
  log error "Panel domaini gereklidir"
  usage
  exit 1
fi

CERT_DIR="$PROJECT_ROOT/compose/nginx/certs"
mkdir -p "$CERT_DIR"

create_cert() {
  local domain="$1"
  local prefix="$CERT_DIR/$domain"
  log info "$domain için sertifika oluşturuluyor"
  openssl req -x509 -nodes -newkey rsa:4096 -days 365 \
    -subj "/CN=$domain" \
    -keyout "${prefix}.key" \
    -out "${prefix}.crt"
}

create_cert "$PANEL_DOMAIN"

if [[ -n "$API_DOMAIN" && "$API_DOMAIN" != "$PANEL_DOMAIN" ]]; then
  create_cert "$API_DOMAIN"
fi

log success "Sertifikalar oluşturuldu. nginx template'inde ilgili yolları güncelleyin."
