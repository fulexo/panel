#!/bin/bash

# Fulexo Platform - Production Environment Validator
# Bu script production .env dosyasını doğrular ve eksik/hatalı değerleri tespit eder

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default env file path
ENV_FILE="${1:-compose/.env}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fulexo Platform - Environment Validator${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment dosyası bulunamadı: $ENV_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Environment dosyası kontrol ediliyor: $ENV_FILE${NC}"
echo

# Source the env file
set -a
source "$ENV_FILE"
set +a

# Validation results
ERRORS=0
WARNINGS=0

# Function to check variable
check_required() {
    local var_name=$1
    local var_value=${!var_name}
    local min_length=${2:-1}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ HATA: $var_name tanımlı değil${NC}"
        ((ERRORS++))
        return 1
    elif [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}❌ HATA: $var_name çok kısa (minimum $min_length karakter olmalı)${NC}"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✅ $var_name: OK${NC}"
        return 0
    fi
}

check_url() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ HATA: $var_name tanımlı değil${NC}"
        ((ERRORS++))
        return 1
    elif [[ ! $var_value =~ ^https?:// ]]; then
        echo -e "${YELLOW}⚠️  UYARI: $var_name HTTPS kullanmıyor: $var_value${NC}"
        ((WARNINGS++))
        return 1
    else
        echo -e "${GREEN}✅ $var_name: $var_value${NC}"
        return 0
    fi
}

check_hex() {
    local var_name=$1
    local var_value=${!var_name}
    local expected_length=$2
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ HATA: $var_name tanımlı değil${NC}"
        ((ERRORS++))
        return 1
    elif [ ${#var_value} -ne $expected_length ]; then
        echo -e "${RED}❌ HATA: $var_name tam olarak $expected_length karakter olmalı (şu an: ${#var_value})${NC}"
        ((ERRORS++))
        return 1
    elif ! [[ $var_value =~ ^[0-9a-fA-F]+$ ]]; then
        echo -e "${RED}❌ HATA: $var_name sadece hexadecimal karakterler içermeli${NC}"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✅ $var_name: OK (${#var_value} hex karakter)${NC}"
        return 0
    fi
}

# Section: Application Settings
echo -e "${BLUE}[Application Settings]${NC}"
check_required "NODE_ENV"
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  UYARI: NODE_ENV 'production' değil: $NODE_ENV${NC}"
    ((WARNINGS++))
fi
check_required "LOG_LEVEL"
echo

# Section: Domain Configuration
echo -e "${BLUE}[Domain Configuration]${NC}"
check_url "DOMAIN_API"
check_url "DOMAIN_APP"
check_url "NEXT_PUBLIC_API_BASE"
check_url "NEXT_PUBLIC_APP_URL"
check_url "FRONTEND_URL"
check_url "WEB_URL"
check_url "SHARE_BASE_URL"
check_required "BACKEND_API_BASE"
echo

# Section: Database
echo -e "${BLUE}[Database Configuration]${NC}"
check_required "POSTGRES_DB"
check_required "POSTGRES_USER"
check_required "POSTGRES_PASSWORD" 16
check_required "DATABASE_URL"
echo

# Section: Redis
echo -e "${BLUE}[Redis Configuration]${NC}"
check_required "REDIS_URL"
echo

# Section: Security (Critical!)
echo -e "${BLUE}[Security Configuration - CRITICAL]${NC}"
check_required "JWT_SECRET" 64
check_required "ENCRYPTION_KEY" 32
if [ ${#ENCRYPTION_KEY} -ne 32 ]; then
    echo -e "${RED}❌ KRITIK: ENCRYPTION_KEY tam olarak 32 karakter olmalı!${NC}"
    ((ERRORS++))
fi
check_hex "MASTER_KEY_HEX" 64
check_required "SHARE_TOKEN_SECRET" 32
echo

# Section: Storage
echo -e "${BLUE}[Storage Configuration]${NC}"
check_required "S3_ENDPOINT"
check_required "S3_ACCESS_KEY" 8
check_required "S3_SECRET_KEY" 16
check_required "S3_BUCKET"
echo

# Section: Monitoring
echo -e "${BLUE}[Monitoring Configuration]${NC}"
check_required "GF_SECURITY_ADMIN_PASSWORD" 8
echo

# Section: Karrio (Optional)
echo -e "${BLUE}[Karrio Configuration (Optional)]${NC}"
if [ ! -z "$KARRIO_SECRET_KEY" ]; then
    check_required "KARRIO_SECRET_KEY" 32
    check_required "KARRIO_API_URL"
    check_required "KARRIO_POSTGRES_USER"
    check_required "KARRIO_POSTGRES_PASSWORD" 16
    check_required "KARRIO_POSTGRES_DB"
else
    echo -e "${YELLOW}ℹ️  Karrio yapılandırılmamış (opsiyonel)${NC}"
fi
echo

# Check for insecure default values
echo -e "${BLUE}[Security Checks]${NC}"

# Check for default passwords
if [[ "$POSTGRES_PASSWORD" == "fulexo_secure_password_123" ]] || [[ "$POSTGRES_PASSWORD" == "localdev123" ]]; then
    echo -e "${RED}❌ KRITIK: POSTGRES_PASSWORD default değerde!${NC}"
    ((ERRORS++))
fi

if [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"test"* ]] || [[ ${#JWT_SECRET} -lt 64 ]]; then
    echo -e "${RED}❌ KRITIK: JWT_SECRET güvenli değil!${NC}"
    ((ERRORS++))
fi

if [[ "$S3_ACCESS_KEY" == "minioadmin" ]]; then
    echo -e "${RED}❌ KRITIK: S3_ACCESS_KEY default değerde!${NC}"
    ((ERRORS++))
fi

if [[ "$S3_SECRET_KEY" == "minioadmin" ]]; then
    echo -e "${RED}❌ KRITIK: S3_SECRET_KEY default değerde!${NC}"
    ((ERRORS++))
fi

# Check for localhost/development URLs in production
if [[ "$NODE_ENV" == "production" ]]; then
    if [[ "$DOMAIN_API" == *"localhost"* ]] || [[ "$DOMAIN_API" == *"127.0.0.1"* ]]; then
        echo -e "${RED}❌ KRITIK: Production'da localhost URL kullanılamaz!${NC}"
        ((ERRORS++))
    fi
    
    if [[ "$DOMAIN_API" != https://* ]]; then
        echo -e "${YELLOW}⚠️  UYARI: Production'da HTTPS kullanılmalı!${NC}"
        ((WARNINGS++))
    fi
fi

echo -e "${GREEN}✅ Güvenlik kontrolleri tamamlandı${NC}"
echo

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ÖZET${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ TÜM KONTROLLER BAŞARILI!${NC}"
    echo -e "${GREEN}Environment dosyası production için hazır.${NC}"
    exit 0
else
    echo -e "${RED}Toplam Hata: $ERRORS${NC}"
    echo -e "${YELLOW}Toplam Uyarı: $WARNINGS${NC}"
    
    if [ $ERRORS -gt 0 ]; then
        echo
        echo -e "${RED}❌ DEPLOYMENT ÖNCESİ HATALAR DÜZELTİLMELİ!${NC}"
        echo
        echo "Öneriler:"
        echo "1. scripts/generate-production-env.sh script'ini çalıştırın"
        echo "2. Tüm güvenlik anahtarlarının güçlü olduğundan emin olun"
        echo "3. Production URL'lerini doğru ayarlayın"
        echo "4. Default değerleri değiştirin"
        exit 1
    else
        echo
        echo -e "${YELLOW}⚠️  Uyarılar var ama deployment yapılabilir.${NC}"
        exit 0
    fi
fi