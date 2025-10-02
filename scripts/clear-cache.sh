#!/bin/bash

# Clears cached build artefacts

source "$(dirname "$0")/common.sh"

usage() {
  cat <<USAGE
Kullanım: $0 [--all|--frontend|--backend|--worker]

Varsayılan olarak tüm paketlerin cache'lerini temizler.
USAGE
}

TARGETS=(frontend backend worker)

if [[ $# -gt 0 ]]; then
  case "$1" in
    --frontend)
      TARGETS=(frontend)
      ;;
    --backend)
      TARGETS=(backend)
      ;;
    --worker)
      TARGETS=(worker)
      ;;
    --all)
      TARGETS=(frontend backend worker)
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
fi

for target in "${TARGETS[@]}"; do
  case "$target" in
    frontend)
      log info "Next.js cache temizleniyor"
      rm -rf "$PROJECT_ROOT/apps/web/.next" "$PROJECT_ROOT/apps/web/node_modules"
      ;;
    backend)
      log info "API cache temizleniyor"
      rm -rf "$PROJECT_ROOT/apps/api/dist" "$PROJECT_ROOT/apps/api/node_modules"
      ;;
    worker)
      log info "Worker cache temizleniyor"
      rm -rf "$PROJECT_ROOT/apps/worker/dist" "$PROJECT_ROOT/apps/worker/node_modules"
      ;;
  esac
done

log success "Cache temizliği tamamlandı"
