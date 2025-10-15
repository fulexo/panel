#!/bin/bash
# Deep check for environment configuration issues

echo "🔍 Deep Environment Configuration Check"
echo "======================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0

# Check for trailing spaces in .env
echo -e "\n1. Checking for trailing spaces in .env..."
if grep -E " +$" .env > /dev/null; then
    echo -e "${RED}❌ Found trailing spaces in .env:${NC}"
    grep -n -E " +$" .env
    ((ISSUES++))
else
    echo -e "${GREEN}✓ No trailing spaces found${NC}"
fi

# Check for Windows line endings
echo -e "\n2. Checking for Windows line endings..."
if file .env | grep -q "CRLF"; then
    echo -e "${RED}❌ .env has Windows line endings (CRLF)${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ .env has Unix line endings (LF)${NC}"
fi

# Check for malformed lines
echo -e "\n3. Checking for malformed environment lines..."
if grep -v "^#" .env | grep -v "^$" | grep -v "^[A-Z_][A-Z0-9_]*=.*$" > /dev/null; then
    echo -e "${RED}❌ Found malformed lines in .env:${NC}"
    grep -n -v "^#" .env | grep -v "^$" | grep -v "^[A-Z_][A-Z0-9_]*=.*$"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ All environment lines properly formatted${NC}"
fi

# Check for quotes in values
echo -e "\n4. Checking for quoted values (which might cause issues)..."
if grep -E "^[A-Z_]+=(\"|')" .env > /dev/null; then
    echo -e "${YELLOW}⚠️  Found quoted values in .env:${NC}"
    grep -n -E "^[A-Z_]+=(\"|')" .env
    echo "   (This might be intentional, but can cause issues with some parsers)"
fi

# Check Docker networking
echo -e "\n5. Checking service communication settings..."
# API should connect to postgres, not localhost
if grep -E "DATABASE_URL.*localhost|DATABASE_URL.*127\.0\.0\.1" .env > /dev/null; then
    echo -e "${RED}❌ DATABASE_URL uses localhost instead of service name${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ DATABASE_URL uses correct service names${NC}"
fi

# Check Redis URL
if grep -E "REDIS_URL.*localhost|REDIS_URL.*127\.0\.0\.1" .env > /dev/null; then
    echo -e "${RED}❌ REDIS_URL uses localhost instead of service name${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ REDIS_URL uses correct service names${NC}"
fi

# Check S3 endpoint
if grep -E "S3_ENDPOINT.*localhost|S3_ENDPOINT.*127\.0\.0\.1" .env > /dev/null; then
    echo -e "${RED}❌ S3_ENDPOINT uses localhost instead of service name${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ S3_ENDPOINT uses correct service names${NC}"
fi

# Check for conflicting ports
echo -e "\n6. Checking for port conflicts..."
ports=$(grep -E "^\s*-\s*\"[0-9]+:[0-9]+\"" compose/docker-compose.dev.yml docker-compose.prod.yml | grep -oE "[0-9]+:" | sed 's/://' | sort | uniq -d)
if [[ -n "$ports" ]]; then
    echo -e "${RED}❌ Found duplicate external ports: $ports${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ No port conflicts found${NC}"
fi

# Check MinIO credentials
echo -e "\n7. Checking MinIO credentials..."
s3_access=$(grep "^S3_ACCESS_KEY=" .env | cut -d'=' -f2)
s3_secret=$(grep "^S3_SECRET_KEY=" .env | cut -d'=' -f2)
if [[ "$s3_access" == "minioadmin" && "$s3_secret" == "minioadmin" ]]; then
    echo -e "${YELLOW}⚠️  Using default MinIO credentials (OK for development)${NC}"
else
    echo -e "${GREEN}✓ MinIO credentials customized${NC}"
fi

# Check BACKEND_API_BASE
echo -e "\n8. Checking BACKEND_API_BASE for web service..."
backend_api=$(grep "^BACKEND_API_BASE=" .env | cut -d'=' -f2)
if [[ "$backend_api" == "http://api:3000" ]]; then
    echo -e "${GREEN}✓ BACKEND_API_BASE correctly uses Docker service name${NC}"
elif [[ "$backend_api" =~ localhost|127\.0\.0\.1 ]]; then
    echo -e "${RED}❌ BACKEND_API_BASE should use 'http://api:3000' for Docker${NC}"
    ((ISSUES++))
else
    echo -e "${YELLOW}⚠️  BACKEND_API_BASE: $backend_api (verify this is correct)${NC}"
fi

# Check Karrio configuration
echo -e "\n9. Checking Karrio configuration..."
karrio_url=$(grep "^KARRIO_API_URL=" .env | cut -d'=' -f2)
if [[ "$karrio_url" == "http://karrio-server:5002" ]]; then
    echo -e "${GREEN}✓ KARRIO_API_URL correctly uses Docker service name${NC}"
elif [[ "$karrio_url" =~ localhost|127\.0\.0\.1 ]]; then
    echo -e "${RED}❌ KARRIO_API_URL should use 'http://karrio-server:5002' for Docker${NC}"
    ((ISSUES++))
fi

# Check for multi-line values
echo -e "\n10. Checking for multi-line values..."
awk 'BEGIN{in_value=0} 
     /^[A-Z_]+=/ {
         if (in_value) print "Line " NR-1 ": Possible unterminated value"
         in_value=1
         if (/=$/) in_value=1
         else in_value=0
     }
     /^[^#=]+$/ && in_value {
         print "Line " NR ": Possible multi-line value continuation"
     }' .env > /tmp/multiline_check.txt

if [[ -s /tmp/multiline_check.txt ]]; then
    echo -e "${RED}❌ Possible multi-line value issues:${NC}"
    cat /tmp/multiline_check.txt
    ((ISSUES++))
else
    echo -e "${GREEN}✓ No multi-line value issues detected${NC}"
fi

echo -e "\n======================================"
echo "Total issues found: $ISSUES"

if [[ $ISSUES -eq 0 ]]; then
    echo -e "${GREEN}✅ Environment configuration looks good!${NC}"
    exit 0
else
    echo -e "${RED}❌ Please fix the issues above.${NC}"
    exit 1
fi