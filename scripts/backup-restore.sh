#!/bin/bash

# Fulexo Platform backup/restore orchestrator

source "$(dirname "$0")/common.sh"

BACKUP_ROOT="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
mkdir -p "$BACKUP_ROOT"

usage() {
  cat <<USAGE
Kullanım: $0 <komut> [seçenekler]

Komutlar:
  backup [args]       Yedek almak için scripts/backup.sh komutunu çağırır
  restore <klasör>    Belirtilen yedekten veri tabanı, Redis ve MinIO içeriğini yükler
  list                Mevcut yedekleri listeler
  cleanup [--keep N]  En yeni N yedek haricindekileri siler (varsayılan 5)
  help                Bu mesajı gösterir

Ekstra seçenekler:
  --dev veya --prod   Restore işlemi için compose scope (varsayılan prod)
USAGE
}

COMMAND="${1:-}"; shift || true
SCOPE=prod

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
      break
      ;;
  esac
done

case "$COMMAND" in
  backup)
    "${SCRIPT_DIR}/backup.sh" "$@"
    ;;
  list)
    log info "Mevcut yedekler:"
    if ls -1dt "$BACKUP_ROOT"/* >/dev/null 2>&1; then
      ls -1dt "$BACKUP_ROOT"/*
    else
      log warn "Henüz yedek bulunamadı"
    fi
    ;;
  cleanup)
    KEEP=5
    if [[ "${1:-}" == "--keep" ]]; then
      KEEP="${2:-5}"
      shift 2 || true
    fi
    log info "Son $KEEP yedek tutulacak şekilde temizlik yapılıyor"
    ls -1dt "$BACKUP_ROOT"/* 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -rf
    log success "Temizlik tamamlandı"
    ;;
  restore)
    TARGET_DIR="${1:-}"
    if [[ -z "$TARGET_DIR" ]]; then
      log error "Restore için yedek klasörünü belirtmelisiniz"
      usage
      exit 1
    fi
    if [[ "$TARGET_DIR" == "latest" || "$TARGET_DIR" == "newest" ]]; then
      TARGET_DIR="$(ls -1dt "$BACKUP_ROOT"/* 2>/dev/null | head -n 1)"
      if [[ -z "$TARGET_DIR" ]]; then
        log error "Kullanılabilir yedek bulunamadı"
        exit 1
      fi
    elif [[ ! -d "$TARGET_DIR" ]]; then
      TARGET_DIR="$BACKUP_ROOT/$TARGET_DIR"
    fi
    if [[ ! -d "$TARGET_DIR" ]]; then
      log error "Yedek bulunamadı: $TARGET_DIR"
      exit 1
    fi

    log info "Yedek geri yükleniyor: $TARGET_DIR (scope: $SCOPE)"

    HAS_POSTGRES=false
    HAS_VALKEY=false
    HAS_MINIO=false
    if compose_has_service "$SCOPE" postgres; then HAS_POSTGRES=true; fi
    if compose_has_service "$SCOPE" valkey; then HAS_VALKEY=true; fi
    if compose_has_service "$SCOPE" minio; then HAS_MINIO=true; fi

    if [[ "$HAS_POSTGRES" == true && -f "$TARGET_DIR/database.sql.gz" ]]; then
      log info "PostgreSQL geri yükleniyor"
      compose_cmd "$SCOPE" exec postgres sh -c 'psql "$POSTGRES_DB" -U "$POSTGRES_USER"' < <(gunzip -c "$TARGET_DIR/database.sql.gz")
      log success "Veritabanı geri yüklendi"
    elif [[ "$HAS_POSTGRES" == true && -f "$TARGET_DIR/database.sql" ]]; then
      log info "PostgreSQL geri yükleniyor"
      compose_cmd "$SCOPE" exec postgres sh -c 'psql "$POSTGRES_DB" -U "$POSTGRES_USER"' < "$TARGET_DIR/database.sql"
      log success "Veritabanı geri yüklendi"
    else
      log warn "Veritabanı yedeği bulunamadı"
    fi

    if [[ "$HAS_VALKEY" == true && -f "$TARGET_DIR/valkey.rdb" ]]; then
      log info "Redis dump geri yükleniyor"
      compose_cmd "$SCOPE" stop valkey >/dev/null
      compose_cmd "$SCOPE" cp "$TARGET_DIR/valkey.rdb" valkey:/data/dump.rdb
      compose_cmd "$SCOPE" start valkey >/dev/null
      log success "Redis geri yüklendi"
    else
      log warn "Redis yedeği bulunamadı"
    fi

    if [[ "$HAS_MINIO" == true && -f "$TARGET_DIR/minio.tar.gz" ]]; then
      if ! compose_cmd "$SCOPE" exec minio sh -c 'command -v mc >/dev/null'; then
        log warn "MinIO container'ında 'mc' aracı bulunamadı; yedek atlandı"
      else
        log info "MinIO içeriği geri yükleniyor"
        TMPDIR="$(mktemp -d)"
        tar -xzf "$TARGET_DIR/minio.tar.gz" -C "$TMPDIR"
        compose_cmd "$SCOPE" exec minio sh -c 'mkdir -p /tmp/minio-restore'
        compose_cmd "$SCOPE" cp "$TMPDIR/minio/." minio:/tmp/minio-restore
        compose_cmd "$SCOPE" exec minio sh -c 'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc mirror --overwrite /tmp/minio-restore local/data && rm -rf /tmp/minio-restore'
        rm -rf "$TMPDIR"
        log success "MinIO geri yüklendi"
      fi
    else
      log warn "MinIO yedeği bulunamadı"
    fi

    log success "Yedek geri yükleme tamamlandı"
    ;;
  help|"")
    usage
    ;;
  *)
    log error "Bilinmeyen komut: $COMMAND"
    usage
    exit 1
    ;;
esac
