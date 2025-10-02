#!/bin/bash

# Rollback helper using backups directory

source "$(dirname "$0")/common.sh"

SCOPE=prod
TARGET="latest"

usage() {
  cat <<USAGE
Kullanım: $0 [yedek_klasörü|latest] [--dev|--prod]

Varsayılan davranış en güncel yedeği production ortamına geri yüklemektir.
USAGE
}

if [[ $# -gt 0 ]]; then
  case "$1" in
    --dev|--prod)
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      TARGET="$1"
      shift
      ;;
  esac
fi

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

BACKUP_ROOT="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

if [[ "$TARGET" == "latest" || "$TARGET" == "newest" ]]; then
  TARGET="$(ls -1dt "$BACKUP_ROOT"/* 2>/dev/null | head -n 1)"
  if [[ -z "$TARGET" ]]; then
    log error "Hiç yedek bulunamadı"
    exit 1
  fi
elif [[ ! -d "$TARGET" ]]; then
  if [[ -d "$BACKUP_ROOT/$TARGET" ]]; then
    TARGET="$BACKUP_ROOT/$TARGET"
  else
    log error "Yedek klasörü bulunamadı: $TARGET"
    exit 1
  fi
fi

log warn "Rollback başlatılıyor -> $TARGET (scope: $SCOPE)"
compose_cmd "$SCOPE" down --remove-orphans
"$SCRIPT_DIR/backup-restore.sh" restore "$TARGET" --$SCOPE
compose_cmd "$SCOPE" up -d
log success "Rollback tamamlandı"
