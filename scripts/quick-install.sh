#!/bin/bash

# Runs the standard installation flow: bootstrap host, deploy stack

source "$(dirname "$0")/common.sh"

require_root

usage() {
  cat <<USAGE
Kullanım: $0 [--user fulexo]

1. install-from-scratch.sh
2. setup-security.sh
3. deploy.sh --prod
USAGE
}

APP_USER=fulexo
while [[ $# -gt 0 ]]; do
  case "$1" in
    --user)
      APP_USER="$2"
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

"$SCRIPT_DIR/install-from-scratch.sh" --user "$APP_USER"
"$SCRIPT_DIR/setup-security.sh"
su - "$APP_USER" -c "$PROJECT_ROOT/scripts/deploy.sh --prod"

log success "Hızlı kurulum tamamlandı"
