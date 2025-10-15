#!/bin/bash
# Verify Docker configuration completeness

echo "🔍 Docker Configuration Verification Script"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Function to check variable
check_var() {
    local var_name=$1
    local file=$2
    local required=$3
    
    if grep -q "^${var_name}=" "$file" 2>/dev/null; then
        value=$(grep "^${var_name}=" "$file" | cut -d'=' -f2-)
        if [[ -z "$value" || "$value" == "your_"* || "$value" == "change-me"* ]]; then
            if [[ "$required" == "required" ]]; then
                echo -e "${RED}❌ $var_name in $file has placeholder value: $value${NC}"
                ((ERRORS++))
            else
                echo -e "${YELLOW}⚠️  $var_name in $file has placeholder value: $value${NC}"
                ((WARNINGS++))
            fi
        else
            echo -e "${GREEN}✓ $var_name in $file is set${NC}"
        fi
    else
        if [[ "$required" == "required" ]]; then
            echo -e "${RED}❌ $var_name missing in $file${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $var_name missing in $file (optional)${NC}"
            ((WARNINGS++))
        fi
    fi
}

# Check file exists
check_file() {
    local file=$1
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✓ $file exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $file missing${NC}"
        ((ERRORS++))
        return 1
    fi
}

echo ""
echo "1. Checking environment files..."
echo "--------------------------------"
check_file ".env"
check_file "compose/.env"
check_file "compose/env-template"
check_file ".env.development.example"

echo ""
echo "2. Checking required environment variables in .env..."
echo "----------------------------------------------------"
REQUIRED_VARS=(
    "NODE_ENV"
    "DOMAIN_API" 
    "DOMAIN_APP"
    "DATABASE_URL"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "REDIS_URL"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "NEXT_PUBLIC_API_BASE"
    "NEXT_PUBLIC_APP_URL"
    "S3_ENDPOINT"
    "S3_ACCESS_KEY"
    "S3_SECRET_KEY"
    "S3_BUCKET"
    "KARRIO_SECRET_KEY"
    "BACKEND_API_BASE"
    "FRONTEND_URL"
    "WEB_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    check_var "$var" ".env" "required"
done

echo ""
echo "3. Checking optional environment variables..."
echo "-------------------------------------------"
OPTIONAL_VARS=(
    "MASTER_KEY_HEX"
    "SHARE_TOKEN_SECRET"
    "SHARE_BASE_URL"
    "SMTP_HOST"
    "UPS_USERNAME"
)

for var in "${OPTIONAL_VARS[@]}"; do
    check_var "$var" ".env" "optional"
done

echo ""
echo "4. Checking variable formats..."
echo "-------------------------------"

# Check JWT_SECRET length
if [[ -f ".env" ]]; then
    jwt_secret=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2-)
    jwt_length=${#jwt_secret}
    if [[ $jwt_length -ge 64 ]]; then
        echo -e "${GREEN}✓ JWT_SECRET length: $jwt_length chars (>= 64)${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET length: $jwt_length chars (must be >= 64)${NC}"
        ((ERRORS++))
    fi
    
    # Check ENCRYPTION_KEY length
    enc_key=$(grep "^ENCRYPTION_KEY=" .env | cut -d'=' -f2-)
    enc_length=${#enc_key}
    if [[ $enc_length -eq 32 ]]; then
        echo -e "${GREEN}✓ ENCRYPTION_KEY length: $enc_length chars (exactly 32)${NC}"
    else
        echo -e "${RED}❌ ENCRYPTION_KEY length: $enc_length chars (must be exactly 32)${NC}"
        ((ERRORS++))
    fi
    
    # Check URL formats
    domain_api=$(grep "^DOMAIN_API=" .env | cut -d'=' -f2-)
    if [[ "$domain_api" =~ ^https?:// ]]; then
        echo -e "${GREEN}✓ DOMAIN_API has protocol: $domain_api${NC}"
    else
        echo -e "${RED}❌ DOMAIN_API missing protocol (should start with http:// or https://): $domain_api${NC}"
        ((ERRORS++))
    fi
    
    domain_app=$(grep "^DOMAIN_APP=" .env | cut -d'=' -f2-)
    if [[ "$domain_app" =~ ^https?:// ]]; then
        echo -e "${GREEN}✓ DOMAIN_APP has protocol: $domain_app${NC}"
    else
        echo -e "${RED}❌ DOMAIN_APP missing protocol (should start with http:// or https://): $domain_app${NC}"
        ((ERRORS++))
    fi
fi

echo ""
echo "5. Checking Docker Compose files..."
echo "----------------------------------"
check_file "compose/docker-compose.yml"
check_file "compose/docker-compose.dev.yml"
check_file "docker-compose.prod.yml"

echo ""
echo "6. Checking file synchronization..."
echo "----------------------------------"
if [[ -f ".env" && -f "compose/.env" ]]; then
    if diff -q ".env" "compose/.env" > /dev/null; then
        echo -e "${GREEN}✓ .env and compose/.env are synchronized${NC}"
    else
        echo -e "${YELLOW}⚠️  .env and compose/.env are different${NC}"
        ((WARNINGS++))
    fi
fi

# Check if app env files are synced
for app in api web worker; do
    if [[ -f "apps/$app/.env" ]]; then
        if diff -q ".env" "apps/$app/.env" > /dev/null; then
            echo -e "${GREEN}✓ apps/$app/.env is synchronized${NC}"
        else
            echo -e "${YELLOW}⚠️  apps/$app/.env is different from main .env${NC}"
            ((WARNINGS++))
        fi
    fi
done

echo ""
echo "7. Checking for common issues..."
echo "-------------------------------"

# Check for duplicate variables in env-template
if [[ -f "compose/env-template" ]]; then
    duplicates=$(grep -E "^[A-Z_]+=" compose/env-template | cut -d'=' -f1 | sort | uniq -d)
    if [[ -z "$duplicates" ]]; then
        echo -e "${GREEN}✓ No duplicate variables in env-template${NC}"
    else
        echo -e "${RED}❌ Duplicate variables found in env-template: $duplicates${NC}"
        ((ERRORS++))
    fi
fi

# Check for MinIO in production compose
if grep -q "minio:" docker-compose.prod.yml 2>/dev/null; then
    echo -e "${GREEN}✓ MinIO service found in docker-compose.prod.yml${NC}"
else
    echo -e "${RED}❌ MinIO service missing in docker-compose.prod.yml${NC}"
    ((ERRORS++))
fi

echo ""
echo "=========================================="
echo "Summary:"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}✅ Docker configuration is ready!${NC}"
    exit 0
else
    echo -e "${RED}❌ Please fix the errors above before running Docker.${NC}"
    exit 1
fi