#!/bin/bash

# Fulexo Platform - Monitoring Kurulum Script'i
# Bu script monitoring servislerini yapılandırır

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Bu script root olarak çalıştırılmalıdır"
   exit 1
fi

FULEXO_DIR="/opt/fulexo"
ENV_FILE="/etc/fulexo/fulexo.env"

echo ""
echo "📊 Fulexo Platform - Monitoring Kurulumu"
echo "======================================="
echo ""

# 1. Grafana dashboard'larını oluştur
print_info "1/5 - Grafana dashboard'ları oluşturuluyor..."

# Grafana provisioning dizinini oluştur
mkdir -p "$FULEXO_DIR/compose/grafana/provisioning/dashboards"
mkdir -p "$FULEXO_DIR/compose/grafana/provisioning/datasources"

# Dashboard yapılandırması
cat > "$FULEXO_DIR/compose/grafana/provisioning/dashboards/dashboard.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

# Datasource yapılandırması
cat > "$FULEXO_DIR/compose/grafana/provisioning/datasources/datasource.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

# 2. Prometheus alert kurallarını güncelle
print_info "2/5 - Prometheus alert kuralları güncelleniyor..."

cat > "$FULEXO_DIR/compose/prometheus/alerts.yml" << 'EOF'
groups:
  - name: fulexo-alerts
    rules:
      - alert: ApiHighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API 5xx > 1%"
          description: "High error rate detected in API"

      - alert: SyncLagHigh
        expr: sync_lag_seconds > 1800
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Sync lag high"
          description: "Orders sync lag > 30m"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis cache is not responding"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
          description: "Disk usage is above 90%"

      - alert: ContainerDown
        expr: up{job=~"api|web|worker"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Container is down"
          description: "{{ $labels.job }} container is not running"
EOF

# 3. Uptime Kuma yapılandırması
print_info "3/5 - Uptime Kuma yapılandırması oluşturuluyor..."

# Uptime Kuma için environment dosyası
cat > "$FULEXO_DIR/compose/uptimekuma.env" << 'EOF'
# Uptime Kuma Environment
UPTIME_KUMA_PORT=3001
UPTIME_KUMA_HOST=0.0.0.0
EOF

# 4. Log rotation yapılandırması
print_info "4/5 - Log rotation yapılandırılıyor..."

cat > /etc/logrotate.d/fulexo << 'EOF'
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker kill --signal="USR1" $(docker ps -q) 2>/dev/null || true
    endscript
}
EOF

# 5. Monitoring script'leri oluştur
print_info "5/5 - Monitoring script'leri oluşturuluyor..."

# System metrics script
cat > "$FULEXO_DIR/scripts/system-metrics.sh" << 'EOF'
#!/bin/bash

# System metrics collection script
METRICS_FILE="/tmp/fulexo-metrics.txt"

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')

# Memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')

# Disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

# Write metrics to file
cat > "$METRICS_FILE" << EOL
# HELP fulexo_cpu_usage CPU usage percentage
# TYPE fulexo_cpu_usage gauge
fulexo_cpu_usage $CPU_USAGE

# HELP fulexo_memory_usage Memory usage percentage
# TYPE fulexo_memory_usage gauge
fulexo_memory_usage $MEMORY_USAGE

# HELP fulexo_disk_usage Disk usage percentage
# TYPE fulexo_disk_usage gauge
fulexo_disk_usage $DISK_USAGE

# HELP fulexo_load_average System load average
# TYPE fulexo_load_average gauge
fulexo_load_average $LOAD_AVG
EOL

echo "Metrics written to $METRICS_FILE"
EOF

chmod +x "$FULEXO_DIR/scripts/system-metrics.sh"

# Alert script
cat > "$FULEXO_DIR/scripts/send-alert.sh" << 'EOF'
#!/bin/bash

# Alert sending script
ALERT_TYPE="$1"
ALERT_MESSAGE="$2"
ALERT_SEVERITY="${3:-warning}"

# Log alert
echo "$(date): [$ALERT_SEVERITY] $ALERT_TYPE - $ALERT_MESSAGE" >> /var/log/fulexo-alerts.log

# Send email if SMTP is configured
if [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_USER:-}" ] && [ -n "${SMTP_PASS:-}" ]; then
    echo "Alert: $ALERT_MESSAGE" | mail -s "Fulexo Alert: $ALERT_TYPE" "$SMTP_FROM"
fi

# Send webhook if configured
if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"[$ALERT_SEVERITY] $ALERT_TYPE: $ALERT_MESSAGE\"}"
fi
EOF

chmod +x "$FULEXO_DIR/scripts/send-alert.sh"

# Health check script'i güncelle
if [ -f "$FULEXO_DIR/scripts/health-check.sh" ]; then
    # Health check script'ine monitoring entegrasyonu ekle
    cat >> "$FULEXO_DIR/scripts/health-check.sh" << 'EOF'

# Monitoring entegrasyonu
if [ -f "$FULEXO_DIR/scripts/send-alert.sh" ]; then
    # Critical alerts
    if [ $SUCCESS_COUNT -lt $((TOTAL_TESTS - 2)) ]; then
        "$FULEXO_DIR/scripts/send-alert.sh" "Platform Health" "Critical issues detected" "critical"
    elif [ $SUCCESS_COUNT -lt $TOTAL_TESTS ]; then
        "$FULEXO_DIR/scripts/send-alert.sh" "Platform Health" "Some issues detected" "warning"
    fi
fi
EOF
fi

# Cron job'ları oluştur
print_info "Cron job'ları oluşturuluyor..."

# System metrics collection (every 5 minutes)
echo "*/5 * * * * root $FULEXO_DIR/scripts/system-metrics.sh" >> /etc/crontab

# Health check (every 10 minutes)
echo "*/10 * * * * root $FULEXO_DIR/scripts/health-check.sh" >> /etc/crontab

# Backup (daily at 2 AM)
echo "0 2 * * * fulexo $FULEXO_DIR/scripts/backup.sh" >> /etc/crontab

print_status "Monitoring kurulumu tamamlandı ✓"

# Final instructions
echo ""
echo "🎉 MONITORING KURULUMU TAMAMLANDI!"
echo "=================================="
echo ""
echo "📊 Monitoring Servisleri:"
echo "   - Grafana: http://localhost:3002 (SSH tüneli gerekli)"
echo "   - Prometheus: http://localhost:9090 (SSH tüneli gerekli)"
echo "   - Uptime Kuma: http://localhost:3001 (SSH tüneli gerekli)"
echo ""
echo "🔧 Monitoring Komutları:"
echo "   - Health check: $FULEXO_DIR/scripts/health-check.sh"
echo "   - System metrics: $FULEXO_DIR/scripts/system-metrics.sh"
echo "   - Send alert: $FULEXO_DIR/scripts/send-alert.sh"
echo ""
echo "📋 SSH Tüneli Komutları:"
echo "   - Grafana: ssh -L 3002:localhost:3002 root@your-server-ip"
echo "   - Prometheus: ssh -L 9090:localhost:9090 root@your-server-ip"
echo "   - Uptime Kuma: ssh -L 3001:localhost:3001 root@your-server-ip"
echo ""
echo "⚙️ Grafana Varsayılan Giriş:"
echo "   - Username: admin"
echo "   - Password: (environment dosyasından GF_SECURITY_ADMIN_PASSWORD)"
echo ""
echo "🎊 Monitoring kurulumu başarıyla tamamlandı!"