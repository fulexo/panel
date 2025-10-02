#!/bin/bash

# Updates the repository and restarts docker compose services

source "$(dirname "$0")/common.sh"

require_not_root

SCOPE=prod
RUN_MIGRATIONS=false

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--migrate]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      SCOPE=dev
      shift
      ;;
    --prod)
      SCOPE=prod
      shift
      ;;
    --migrate)
      RUN_MIGRATIONS=true
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

log info "Depo güncelleniyor"
git -C "$PROJECT_ROOT" pull --ff-only

log info "Ana bağımlılıklar kuruluyor"
npm install
for pkg in api web worker; do
  (cd "$PROJECT_ROOT/apps/$pkg" && npm install)
done

if [[ "$RUN_MIGRATIONS" == true ]]; then
  "$SCRIPT_DIR/migrate-database.sh"
fi

log info "Compose servisleri yeniden başlatılıyor"
compose_cmd "$SCOPE" down --remove-orphans
compose_cmd "$SCOPE" up -d

log success "Platform güncellendi"
