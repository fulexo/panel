#!/bin/bash

# Removes build artefacts and optionally prunes Docker caches

source "$(dirname "$0")/common.sh"

PRUNE_DOCKER=false
usage() {
  cat <<USAGE
Kullanım: $0 [--with-docker]

Build kalıntılarını ve test raporlarını siler. --with-docker ile Docker cache temizliği de yapılır.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-docker)
      PRUNE_DOCKER=true
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

log info "Build kalıntıları temizleniyor"
rm -rf \
  "$PROJECT_ROOT/apps/api/dist" \
  "$PROJECT_ROOT/apps/web/.next" \
  "$PROJECT_ROOT/apps/worker/dist" \
  "$PROJECT_ROOT/apps/api/coverage" \
  "$PROJECT_ROOT/apps/web/coverage" \
  "$PROJECT_ROOT/apps/worker/coverage" \
  "$PROJECT_ROOT/coverage" \
  "$PROJECT_ROOT/playwright-report" \
  "$PROJECT_ROOT/test-results"

find "$PROJECT_ROOT" -name "*.tsbuildinfo" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*.log" -type f -size +10M -delete 2>/dev/null || true

if [[ "$PRUNE_DOCKER" == true ]]; then
  log info "Docker cache temizleniyor"
  docker system prune -f >/dev/null
  docker volume prune -f >/dev/null
  log success "Docker kaynakları temizlendi"
fi

log success "Temizlik tamamlandı"
