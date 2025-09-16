#!/bin/bash

# Fulexo Platform - Backup ve Restore Script'i
# Bu script platform verilerini yedekler ve geri yükler

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

# Backup verification function
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        return 1
    fi
    
    # Check if backup file is valid gzip
    if ! gzip -t "$backup_file" 2>/dev/null; then
        return 1
    fi
    
    # Check if backup contains data
    local size=$(stat -c%s "$backup_file")
    if [ $size -lt 1000 ]; then
        return 1
    fi
    
    return 0
}

# Create backup metadata
create_backup_metadata() {
    local date="$1"
    local metadata_file="$BACKUP_DIR/metadata_${date}.json"
    
    cat > "$metadata_file" << EOF
{
  "backup_date": "$date",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0.0",
  "components": {
    "database": true,
    "postgres_data": true,
    "minio_data": true,
    "environment": true,
    "nginx_config": true
  },
  "size_bytes": $(du -sb "$BACKUP_DIR" | cut -f1),
  "hostname": "$(hostname)",
  "platform": "fulexo"
}
EOF
    
    print_status "Backup metadata oluşturuldu ✓"
}

# Send backup notification
send_backup_notification() {
    local date="$1"
    local status="$2"
    
    # Log to system log
    logger -t fulexo-backup "Backup $status: $date"
    
    # Send email notification if configured
    if command -v mail >/dev/null 2>&1; then
        local admin_email=$(grep "^ADMIN_EMAIL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo "admin@fulexo.com")
        local subject="Fulexo Backup $status - $date"
        local body="Backup $status for date $date on $(hostname)"
        
        echo "$body" | mail -s "$subject" "$admin_email" 2>/dev/null || true
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Bu script root olarak çalıştırılmalıdır"
   exit 1
fi

FULEXO_DIR="/opt/fulexo"
FULEXO_USER="fulexo"
BACKUP_DIR="/opt/fulexo/backups"
ENV_FILE="/etc/fulexo/fulexo.env"

# Usage function
usage() {
    echo "Kullanım: $0 [OPTIONS]"
    echo ""
    echo "Seçenekler:"
    echo "  backup                    - Platform verilerini yedekle"
    echo "  restore <backup-file>     - Belirtilen yedekten geri yükle"
    echo "  list                      - Mevcut yedekleri listele"
    echo "  cleanup                   - Eski yedekleri temizle"
    echo "  -h, --help               - Bu yardım mesajını göster"
    echo ""
    echo "Örnekler:"
    echo "  $0 backup"
    echo "  $0 restore /opt/fulexo/backups/db_20240115_143022.sql.gz"
    echo "  $0 list"
    echo "  $0 cleanup"
}

# Backup function
backup() {
    print_info "Platform verileri yedekleniyor..."
    
    # Backup dizinini oluştur
    mkdir -p "$BACKUP_DIR"
    
    # Environment dosyasını yükle
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    PG_USER="${POSTGRES_USER:-fulexo_user}"
    PG_DB="${POSTGRES_DB:-fulexo}"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    print_info "Backup başlatılıyor: $DATE"
    
    # Database backup
    print_info "Database yedekleniyor..."
    if docker exec compose-postgres-1 pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"; then
        print_status "Database yedeklendi ✓"
    else
        print_error "Database yedekleme başarısız ✗"
        return 1
    fi
    
    # PostgreSQL data volume backup
    print_info "PostgreSQL data volume yedekleniyor..."
    if docker run --rm -v compose_pgdata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/pgdata_${DATE}.tar.gz" -C /data .; then
        print_status "PostgreSQL data volume yedeklendi ✓"
    else
        print_warning "PostgreSQL data volume yedekleme başarısız ⚠"
    fi
    
    # MinIO data volume backup
    print_info "MinIO data volume yedekleniyor..."
    if docker run --rm -v compose_miniodata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/miniodata_${DATE}.tar.gz" -C /data .; then
        print_status "MinIO data volume yedeklendi ✓"
    else
        print_warning "MinIO data volume yedekleme başarısız ⚠"
    fi
    
    # Environment dosyasını yedekle
    print_info "Environment dosyası yedekleniyor..."
    cp "$ENV_FILE" "$BACKUP_DIR/env_${DATE}.env"
    
    # Nginx yapılandırmasını yedekle
    print_info "Nginx yapılandırması yedekleniyor..."
    if [ -d "$FULEXO_DIR/compose/nginx" ]; then
        tar czf "$BACKUP_DIR/nginx_${DATE}.tar.gz" -C "$FULEXO_DIR/compose" nginx
    fi
    
    # Backup boyutunu hesapla
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    
    print_status "Backup tamamlandı ✓"
    print_info "Backup boyutu: $BACKUP_SIZE"
    print_info "Backup dizini: $BACKUP_DIR"
    
    # Backup verification
    print_info "Backup doğrulanıyor..."
    if verify_backup "$BACKUP_DIR/db_${DATE}.sql.gz"; then
        print_status "Backup doğrulandı ✓"
    else
        print_error "Backup doğrulama başarısız ✗"
        return 1
    fi
    
    # Backup metadata oluştur
    create_backup_metadata "$DATE"
    
    # Eski yedekleri temizle (7 günden eski)
    print_info "Eski yedekler temizleniyor..."
    find "$BACKUP_DIR" -type f -mtime +7 -delete
    print_status "Eski yedekler temizlendi ✓"
    
    # Backup notification gönder
    send_backup_notification "$DATE" "success"
}

# Restore function
restore() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup dosyası bulunamadı: $backup_file"
        return 1
    fi
    
    print_warning "DİKKAT: Bu işlem mevcut verileri siler!"
    read -p "Devam etmek istediğinizden emin misiniz? (y/N): " confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_info "İşlem iptal edildi"
        return 0
    fi
    
    print_info "Platform verileri geri yükleniyor..."
    
    # Servisleri durdur
    print_info "Servisler durduruluyor..."
    systemctl stop fulexo
    
    # Environment dosyasını yükle
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    PG_USER="${POSTGRES_USER:-fulexo_user}"
    PG_DB="${POSTGRES_DB:-fulexo}"
    
    # Backup dosyası tipini belirle
    if [[ "$backup_file" == *"db_"*".sql.gz" ]]; then
        # Database backup
        print_info "Database geri yükleniyor..."
        
        # Mevcut database'i temizle
        docker exec compose-postgres-1 psql -U "$PG_USER" -d "$PG_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        
        # Backup'ı geri yükle
        if zcat "$backup_file" | docker exec -i compose-postgres-1 psql -U "$PG_USER" -d "$PG_DB"; then
            print_status "Database geri yüklendi ✓"
        else
            print_error "Database geri yükleme başarısız ✗"
            return 1
        fi
        
    elif [[ "$backup_file" == *"pgdata_"*".tar.gz" ]]; then
        # PostgreSQL data volume backup
        print_info "PostgreSQL data volume geri yükleniyor..."
        
        # Container'ı durdur
        docker stop compose-postgres-1
        
        # Volume'u geri yükle
        if docker run --rm -v compose_pgdata:/data -v "$(dirname "$backup_file")":/backup alpine tar xzf "/backup/$(basename "$backup_file")" -C /data; then
            print_status "PostgreSQL data volume geri yüklendi ✓"
        else
            print_error "PostgreSQL data volume geri yükleme başarısız ✗"
            return 1
        fi
        
        # Container'ı başlat
        docker start compose-postgres-1
        
    elif [[ "$backup_file" == *"miniodata_"*".tar.gz" ]]; then
        # MinIO data volume backup
        print_info "MinIO data volume geri yükleniyor..."
        
        # Container'ı durdur
        docker stop compose-minio-1
        
        # Volume'u geri yükle
        if docker run --rm -v compose_miniodata:/data -v "$(dirname "$backup_file")":/backup alpine tar xzf "/backup/$(basename "$backup_file")" -C /data; then
            print_status "MinIO data volume geri yüklendi ✓"
        else
            print_error "MinIO data volume geri yükleme başarısız ✗"
            return 1
        fi
        
        # Container'ı başlat
        docker start compose-minio-1
        
    else
        print_error "Bilinmeyen backup dosyası formatı"
        return 1
    fi
    
    # Servisleri başlat
    print_info "Servisler başlatılıyor..."
    systemctl start fulexo
    
    # Servislerin başlamasını bekle
    print_info "Servislerin başlaması bekleniyor (30 saniye)..."
    sleep 30
    
    print_status "Geri yükleme tamamlandı ✓"
}

# List function
list() {
    print_info "Mevcut yedekler:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "Backup dizini bulunamadı"
        return 0
    fi
    
    # Database backups
    echo "📊 Database Yedekleri:"
    ls -lah "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  Yedek bulunamadı"
    echo ""
    
    # PostgreSQL data volume backups
    echo "🗄️ PostgreSQL Data Volume Yedekleri:"
    ls -lah "$BACKUP_DIR"/pgdata_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  Yedek bulunamadı"
    echo ""
    
    # MinIO data volume backups
    echo "📦 MinIO Data Volume Yedekleri:"
    ls -lah "$BACKUP_DIR"/miniodata_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  Yedek bulunamadı"
    echo ""
    
    # Environment backups
    echo "⚙️ Environment Yedekleri:"
    ls -lah "$BACKUP_DIR"/env_*.env 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  Yedek bulunamadı"
    echo ""
    
    # Nginx backups
    echo "🌐 Nginx Yedekleri:"
    ls -lah "$BACKUP_DIR"/nginx_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  Yedek bulunamadı"
    echo ""
    
    # Total size
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    print_info "Toplam backup boyutu: $TOTAL_SIZE"
}

# Cleanup function
cleanup() {
    print_info "Eski yedekler temizleniyor..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "Backup dizini bulunamadı"
        return 0
    fi
    
    # 7 günden eski dosyaları sil
    OLD_FILES=$(find "$BACKUP_DIR" -type f -mtime +7 | wc -l)
    
    if [ $OLD_FILES -gt 0 ]; then
        find "$BACKUP_DIR" -type f -mtime +7 -delete
        print_status "$OLD_FILES eski yedek dosyası silindi ✓"
    else
        print_info "Silinecek eski yedek dosyası bulunamadı"
    fi
    
    # Kalan dosya sayısını göster
    REMAINING_FILES=$(find "$BACKUP_DIR" -type f | wc -l)
    print_info "Kalan yedek dosyası sayısı: $REMAINING_FILES"
}

# Main script
case "${1:-}" in
    backup)
        backup
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            print_error "Backup dosyası belirtilmedi"
            echo "Kullanım: $0 restore <backup-file>"
            exit 1
        fi
        restore "$2"
        ;;
    list)
        list
        ;;
    cleanup)
        cleanup
        ;;
    -h|--help)
        usage
        ;;
    *)
        print_error "Geçersiz seçenek"
        echo ""
        usage
        exit 1
        ;;
esac