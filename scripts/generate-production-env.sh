#!/bin/bash

# Fulexo Platform - Production Environment Generator
# Bu script production deployment için güvenli environment değişkenleri oluşturur

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Fulexo Platform - Production ENV Generator${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Output file
ENV_FILE="compose/.env.production"

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl is not installed${NC}"
    exit 1
fi

# Confirm production deployment
echo -e "${YELLOW}⚠️  Bu script PRODUCTION için güvenli değerler oluşturacak.${NC}"
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "İptal edildi."
    exit 0
fi

# Get domain information
echo
echo -e "${GREEN}Domain Bilgileri:${NC}"
read -p "API Domain (örn: api.fulexo.com): " API_DOMAIN
read -p "Panel Domain (örn: panel.fulexo.com): " PANEL_DOMAIN

# Generate secure passwords and keys
echo
echo -e "${GREEN}Güvenli anahtarlar oluşturuluyor...${NC}"

# Generate all secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 16)
MASTER_KEY_HEX=$(openssl rand -hex 32)
SHARE_TOKEN_SECRET=$(openssl rand -base64 32 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
S3_ACCESS_KEY=$(openssl rand -base64 16 | tr -d '\n')
S3_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')
GF_SECURITY_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d '\n')
KARRIO_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')
KARRIO_POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
FULEXO_TO_KARRIO_API_TOKEN=$(openssl rand -hex 32)
FULEXO_INTERNAL_API_TOKEN=$(openssl rand -hex 32)

# Create .env.production file
cat > "$ENV_FILE" << EOF
# =============================================================================
# FULEXO PLATFORM - PRODUCTION ENVIRONMENT
# Generated: $(date)
# =============================================================================

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
WORKER_PORT=3002

# =============================================================================
# DOMAIN CONFIGURATION
# =============================================================================
DOMAIN_API=https://${API_DOMAIN}
DOMAIN_APP=https://${PANEL_DOMAIN}
NEXT_PUBLIC_API_BASE=https://${API_DOMAIN}
NEXT_PUBLIC_APP_URL=https://${PANEL_DOMAIN}
FRONTEND_URL=https://${PANEL_DOMAIN}
WEB_URL=https://${PANEL_DOMAIN}
SHARE_BASE_URL=https://${PANEL_DOMAIN}
BACKEND_API_BASE=http://api:3000

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://fulexo_user:${POSTGRES_PASSWORD}@postgres:5432/fulexo?schema=public

# =============================================================================
# CACHE & QUEUE CONFIGURATION
# =============================================================================
REDIS_URL=redis://valkey:6379/0

# =============================================================================
# SECURITY CONFIGURATION - CRITICAL!
# =============================================================================
# JWT Secret (64+ characters)
JWT_SECRET=${JWT_SECRET}

# Encryption key (exactly 32 characters)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Master key for additional encryption (64 hex characters)
MASTER_KEY_HEX=${MASTER_KEY_HEX}

# Share token secret (32+ characters)
SHARE_TOKEN_SECRET=${SHARE_TOKEN_SECRET}

# =============================================================================
# OBJECT STORAGE (MinIO) CONFIGURATION
# =============================================================================
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
S3_BUCKET=fulexo-cache
S3_REGION=us-east-1

# =============================================================================
# MONITORING CONFIGURATION
# =============================================================================
GF_SECURITY_ADMIN_PASSWORD=${GF_SECURITY_ADMIN_PASSWORD}

# =============================================================================
# KARRIO INTEGRATION (Optional)
# =============================================================================
KARRIO_SECRET_KEY=${KARRIO_SECRET_KEY}
KARRIO_API_URL=http://karrio-server:5002
KARRIO_POSTGRES_USER=karrio
KARRIO_POSTGRES_PASSWORD=${KARRIO_POSTGRES_PASSWORD}
KARRIO_POSTGRES_DB=karrio
KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server
KARRIO_CORS_ALLOWED_ORIGINS=https://${PANEL_DOMAIN}
FULEXO_TO_KARRIO_API_TOKEN=${FULEXO_TO_KARRIO_API_TOKEN}
FULEXO_INTERNAL_API_TOKEN=${FULEXO_INTERNAL_API_TOKEN}

# =============================================================================
# EMAIL CONFIGURATION (Configure via Settings UI after deployment)
# =============================================================================
# SMTP settings will be configured through the Settings page in the admin panel

# =============================================================================
# ADMIN SEED DATA
# =============================================================================
ADMIN_EMAIL=admin@fulexo.com
ADMIN_PASSWORD=ChangeMeAfterFirstLogin123!
CUSTOMER_PASSWORD=demo123

# =============================================================================
# ALERTING (Optional)
# =============================================================================
# ALERT_EMAIL=admin@${PANEL_DOMAIN}
# SLACK_WEBHOOK_URL=

EOF

# Create backup of generated credentials
BACKUP_FILE="compose/.env.production.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"

# Display summary
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Production environment dosyası oluşturuldu!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}Dosya konumu:${NC} $ENV_FILE"
echo -e "${YELLOW}Backup konumu:${NC} $BACKUP_FILE"
echo
echo -e "${RED}⚠️  ÖNEMLİ UYARILAR:${NC}"
echo "1. Bu dosyadaki değerler GİZLİ tutulmalıdır"
echo "2. Backup dosyasını güvenli bir yere kopyalayın"
echo "3. Production'da ilk giriş sonrası admin şifresini değiştirin"
echo "4. SMTP ayarlarını Settings sayfasından yapılandırın"
echo
echo -e "${GREEN}Deployment için hazırsınız!${NC}"
echo
echo "Kullanım:"
echo "  cd compose"
echo "  cp .env.production .env"
echo "  docker-compose up -d --build"
echo

# Show generated values (optional - comment out in production)
echo -e "${YELLOW}Oluşturulan değerler (güvenlik için not alın):${NC}"
echo "----------------------------------------"
echo "Grafana Admin Password: ${GF_SECURITY_ADMIN_PASSWORD}"
echo "MinIO Access Key: ${S3_ACCESS_KEY}"
echo "MinIO Secret Key: ${S3_SECRET_KEY}"
echo "----------------------------------------"
echo
echo -e "${GREEN}Bu değerleri güvenli bir yerde saklayın!${NC}"