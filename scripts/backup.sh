#!/bin/bash

# Fulexo Platform backup helper

source "$(dirname "$0")/common.sh"

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--code-only|--database-only|--full]

Varsayılan olarak üretim compose dosyasını kullanır ve tam yedek alır.
USAGE
}

SCOPE=prod
MODE=full

for arg in "$@"; do
  case "$arg" in
    --dev)
      SCOPE=dev
      ;;
    --prod)
      SCOPE=prod
      ;;
    --code-only)
      MODE=code
      ;;
    --database-only)
      MODE=db
      ;;
    --full)
      MODE=full
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log warn "Bilinmeyen argüman: $arg"
      usage
      exit 1
      ;;
  esac
done

BACKUP_ROOT="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
mkdir -p "$BACKUP_ROOT"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEST_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$DEST_DIR"

log info "Yedekleme başlatılıyor (mod: $MODE, scope: $SCOPE)"

if [[ "$MODE" == "full" || "$MODE" == "code" ]]; then
  ARCHIVE_PATH="$DEST_DIR/code.tar.gz"
  log info "Kod yedeği oluşturuluyor -> $ARCHIVE_PATH"
  tar -czf "$ARCHIVE_PATH" \
    --exclude="*/node_modules" \
    --exclude="*/.next" \
    --exclude="*/dist" \
    --exclude="*/coverage" \
    --exclude="*/playwright-report" \
    --exclude="*/cypress" \
    --exclude=".git" \
    -C "$PROJECT_ROOT" .
  log success "Kod yedeği tamamlandı"
fi

if [[ "$MODE" == "full" || "$MODE" == "db" ]]; then
  log info "PostgreSQL yedeği alınıyor"
  DB_DUMP="$DEST_DIR/database.sql"
  compose_cmd "$SCOPE" exec postgres sh -c 'pg_dump "$POSTGRES_DB" -U "$POSTGRES_USER"' > "$DB_DUMP"
  gzip "$DB_DUMP"
  log success "Veritabanı yedeği: ${DB_DUMP}.gz"

  log info "Redis snapshot çıkartılıyor"
  compose_cmd "$SCOPE" exec valkey sh -c 'redis-cli --rdb /data/dump.rdb'
  compose_cmd "$SCOPE" cp valkey:/data/dump.rdb "$DEST_DIR/valkey.rdb"
  log success "Redis yedeği alındı"

  if compose_has_service "$SCOPE" minio; then
    if compose_cmd "$SCOPE" exec minio sh -c 'command -v mc >/dev/null'; then
      log info "MinIO veri yedeği alınıyor"
      compose_cmd "$SCOPE" exec minio sh -c 'mkdir -p /tmp/minio-backup && mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc mirror --overwrite local /data /tmp/minio-backup'
      if compose_cmd "$SCOPE" cp minio:/tmp/minio-backup "$DEST_DIR/minio"; then
        compose_cmd "$SCOPE" exec minio rm -rf /tmp/minio-backup >/dev/null 2>&1 || true
        tar -czf "$DEST_DIR/minio.tar.gz" -C "$DEST_DIR" minio
        rm -rf "$DEST_DIR/minio"
        log success "MinIO yedeği alındı"
      else
        log warn "MinIO yedeği alınamadı (veri kopyalanamadı)"
      fi
    else
      log warn "MinIO container'ında 'mc' aracı bulunamadı; yedek atlandı"
    fi
  fi
fi

log info "Yedek meta bilgisi yazılıyor"
{
  echo "{";
  echo "  \"createdAt\": \"$(date --iso-8601=seconds)\",";
  echo "  \"mode\": \"$MODE\",";
  echo "  \"scope\": \"$SCOPE\",";
  echo "  \"gitCommit\": \"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)\",";
  echo "  \"artifacts\": [";
  first=true
  for file in "$DEST_DIR"/*; do
    name="$(basename "$file")"
    if [[ "$first" == true ]]; then
      first=false
    else
      echo ","
    fi
    echo "    \"$name\""
  done
  echo "  ]";
  echo "}";
} > "$DEST_DIR/manifest.json"

log success "Yedekleme tamamlandı: $DEST_DIR"

log info "Eski yedekler temizleniyor (yalnızca son 10 tutulur)"
ls -1dt "$BACKUP_ROOT"/* 2>/dev/null | tail -n +11 | xargs -r rm -rf
log success "Temizlik tamamlandı"
