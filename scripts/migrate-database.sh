#!/bin/bash

# Runs Prisma migrations inside the API package

source "$(dirname "$0")/common.sh"

usage() {
  cat <<USAGE
Kullanım: $0 [--generate-only]

API paketindeki Prisma client'ını derler ve migrations uygular.
USAGE
}

GENERATE_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --generate-only)
      GENERATE_ONLY=true
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

cd "$PROJECT_ROOT/apps/api"

log info "Prisma client oluşturuluyor"
npm run prisma:generate

if [[ "$GENERATE_ONLY" == false ]]; then
  log info "Migrations uygulanıyor"
  npm run prisma:migrate
fi

log success "Veritabanı migrasyonları tamamlandı"
