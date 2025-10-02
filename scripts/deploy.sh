#!/bin/bash

# Production deployment workflow

source "$(dirname "$0")/common.sh"

require_not_root
ensure_command docker
ensure_command git

SCOPE=prod
NO_CACHE=false
FORCE=false
SKIP_BACKUP=false

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--no-cache] [--force] [--skip-backup]

Varsayılan olarak production compose dosyasını kullanır.
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
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
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

log info "Dağıtım başlatılıyor (scope: $SCOPE)"

if [[ "$SKIP_BACKUP" == false ]]; then
  log info "Dağıtım öncesi yedek alınıyor"
  "$SCRIPT_DIR/backup.sh" --$SCOPE --full
fi

log info "Git deposu güncelleniyor"
if ! git -C "$PROJECT_ROOT" pull --ff-only; then
  if [[ "$FORCE" == true ]]; then
    log warn "Git pull başarısız oldu ancak --force verildiği için devam ediliyor"
  else
    log error "Git deposu güncellenemedi"
    exit 1
  fi
fi

log info "Hizmetler durduruluyor"
compose_cmd "$SCOPE" down --remove-orphans

log info "Container'lar inşa ediliyor"
if [[ "$NO_CACHE" == true ]]; then
  compose_cmd "$SCOPE" build --no-cache
else
  compose_cmd "$SCOPE" build
fi

log info "Hizmetler başlatılıyor"
compose_cmd "$SCOPE" up -d

if [[ "$SCOPE" == prod ]]; then
  log info "Karrio servisleri doğrulanıyor"
  compose_cmd "$SCOPE" up -d karrio-db karrio-redis karrio-server karrio-dashboard || true
fi

log info "Servislerin sağlığı kontrol ediliyor"
if "$SCRIPT_DIR/health-check.sh" --$SCOPE --quiet; then
  log success "Dağıtım tamamlandı"
else
  log warn "Sağlık kontrolü başarısız oldu, rollback çalıştırılıyor"
  "$SCRIPT_DIR/rollback.sh" latest --$SCOPE
  exit 1
fi

log info "Gereksiz imajlar temizleniyor"
docker image prune -f >/dev/null
log success "Dağıtım süreci tamamlandı"
