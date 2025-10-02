#!/bin/bash

# Lightweight monitoring helper for docker compose services

source "$(dirname "$0")/common.sh"

SCOPE=prod
INTERVAL=60
CONTINUOUS=false

ensure_command docker

usage() {
  cat <<USAGE
Kullanım: $0 [--dev|--prod] [--continuous] [--interval saniye]
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
    --continuous)
      CONTINUOUS=true
      shift
      ;;
    --interval)
      INTERVAL="$2"
      shift 2
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

monitor_once() {
  echo "==== $(date) ===="
  compose_cmd "$SCOPE" ps
  docker stats --no-stream 2>/dev/null | head -n 10
  echo
}

if [[ "$CONTINUOUS" == true ]]; then
  while true; do
    monitor_once
    sleep "$INTERVAL"
  done
else
  monitor_once
fi
