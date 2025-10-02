#!/bin/bash

# Seeds monitoring configuration for the docker compose stack

source "$(dirname "$0")/common.sh"

require_root

DEST="${MONITORING_DIR:-/opt/fulexo/monitoring}"

log info "Monitoring konfigürasyonları $DEST dizinine kopyalanıyor"
mkdir -p "$DEST"
rm -rf "$DEST/prometheus" "$DEST/alertmanager" "$DEST/loki" "$DEST/promtail"
cp -a "$PROJECT_ROOT/compose/prometheus" "$DEST/"
cp -a "$PROJECT_ROOT/compose/alertmanager" "$DEST/"
cp -a "$PROJECT_ROOT/compose/loki" "$DEST/"
cp -a "$PROJECT_ROOT/compose/promtail" "$DEST/"

log success "Monitoring konfigürasyonu hazır. docker compose override dosyanızda volume olarak bağlayın."
