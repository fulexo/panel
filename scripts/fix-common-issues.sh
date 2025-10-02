#!/bin/bash

# Performs quick recovery steps for frequent operational issues

source "$(dirname "$0")/common.sh"

SCOPE=prod
RUN_MIGRATIONS=false
RESTART_SERVICES=false

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--migrate] [--restart]

- --migrate   Prisma şemasını derler ve migrations uygular
- --restart   Compose servislerini yeniden başlatır
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
    --restart)
      RESTART_SERVICES=true
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

log info "Node modülleri kontrol ediliyor"
if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
  npm install
fi

for pkg in api web worker; do
  if [[ ! -d "$PROJECT_ROOT/apps/$pkg/node_modules" ]]; then
    log info "$pkg bağımlılıkları yükleniyor"
    (cd "$PROJECT_ROOT/apps/$pkg" && npm install)
  fi
done

if [[ "$RUN_MIGRATIONS" == true ]]; then
  log info "Prisma migrations uygulanıyor"
  (cd "$PROJECT_ROOT/apps/api" && npm run prisma:generate && npm run prisma:migrate)
fi

if [[ "$RESTART_SERVICES" == true ]]; then
  log info "Compose servisleri yeniden başlatılıyor"
  compose_cmd "$SCOPE" down --remove-orphans
  compose_cmd "$SCOPE" up -d
fi

log success "İyileştirme adımları tamamlandı"
