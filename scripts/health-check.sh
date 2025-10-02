#!/bin/bash

# Health check utility

source "$(dirname "$0")/common.sh"

SCOPE=prod
VERBOSE=true
TIMEOUT=${HEALTHCHECK_TIMEOUT:-10}

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--quiet]

Başlıca servisler için docker compose üzerinden sağlık kontrolleri yapar.
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
    --quiet)
      VERBOSE=false
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

print_status() {
  local status="$1"
  local message="$2"
  if [[ "$VERBOSE" == true ]]; then
    if [[ "$status" == ok ]]; then
      log success "$message"
    else
      log error "$message"
    fi
  fi
}

check_http() {
  local url="$1"
  if curl -fsS --max-time "$TIMEOUT" "$url" >/dev/null; then
    print_status ok "$url erişilebilir"
    return 0
  else
    print_status fail "$url erişilemiyor"
    return 1
  fi
}

STATUS=0

if ! compose_cmd "$SCOPE" ps >/dev/null; then
  log error "Docker compose servisleri listelenemedi"
  exit 1
fi

if [[ "$VERBOSE" == true ]]; then
  compose_cmd "$SCOPE" ps
fi

SERVICES="$(compose_cmd "$SCOPE" ps --services 2>/dev/null || true)"

# API health
if echo "$SERVICES" | grep -qx 'api'; then
  if ! check_http "http://localhost:3000/health"; then
    STATUS=1
  fi
fi

# Web health
if echo "$SERVICES" | grep -qx 'web'; then
  if ! check_http "http://localhost:3001"; then
    STATUS=1
  fi
fi

# Worker queue reachability
if echo "$SERVICES" | grep -qx 'worker'; then
  if compose_cmd "$SCOPE" exec worker curl -fsS --max-time "$TIMEOUT" http://api:3000/health >/dev/null; then
    print_status ok "Worker API'ye ulaşabiliyor"
  else
    print_status fail "Worker API'ye ulaşamıyor"
    STATUS=1
  fi
fi

# Karrio services
if echo "$SERVICES" | grep -qx 'karrio-server'; then
  if ! check_http "http://localhost:5002/health"; then
    STATUS=1
  fi
fi

if [[ "$STATUS" -eq 0 ]]; then
  if [[ "$VERBOSE" == true ]]; then
    log success "Tüm kontroller geçti"
  fi
else
  log warn "Bazı sağlık kontrolleri başarısız"
fi

exit "$STATUS"
