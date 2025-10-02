#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_DEV_COMPOSE="${PROJECT_ROOT}/compose/docker-compose.yml"
DEFAULT_PROD_COMPOSE="${PROJECT_ROOT}/docker-compose.prod.yml"
DEFAULT_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-fulexo}"

log() {
  local level="$1"; shift
  local message="$*"
  local timestamp
  timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
  case "$level" in
    info) printf '\033[0;34m[%s]\033[0m %s\n' "$timestamp" "$message" ;;
    warn) printf '\033[1;33m[%s]\033[0m %s\n' "$timestamp" "$message" ;;
    error) printf '\033[0;31m[%s]\033[0m %s\n' "$timestamp" "$message" ;;
    success) printf '\033[0;32m[%s]\033[0m %s\n' "$timestamp" "$message" ;;
    *) printf '[%s] %s\n' "$timestamp" "$message" ;;
  esac
}

require_root() {
  if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    log error "Bu script root veya sudo ile çalıştırılmalıdır."
    exit 1
  fi
}

require_not_root() {
  if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
    log error "Bu script güvenlik nedeniyle root olarak çalıştırılamaz."
    exit 1
  fi
}

compose_cmd() {
  local scope="$1"; shift
  local compose_file
  local project_name
  if [[ "$scope" == prod ]]; then
    compose_file="${COMPOSE_FILE:-$DEFAULT_PROD_COMPOSE}"
    project_name="${COMPOSE_PROJECT_NAME:-$DEFAULT_PROJECT_NAME}"
  else
    compose_file="${COMPOSE_FILE:-$DEFAULT_DEV_COMPOSE}"
    project_name="${COMPOSE_PROJECT_NAME:-$DEFAULT_PROJECT_NAME}"
  fi

  if [[ ! -f "$compose_file" ]]; then
    log error "Compose dosyası bulunamadı: $compose_file"
    exit 1
  fi

  docker compose -p "$project_name" -f "$compose_file" "$@"
}

ensure_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log error "Gerekli komut bulunamadı: $cmd"
    exit 1
  fi
}


compose_has_service() {
  local scope="$1"
  local service="$2"
  if compose_cmd "$scope" ps --services 2>/dev/null | grep -qx "$service"; then
    return 0
  fi
  return 1
}
