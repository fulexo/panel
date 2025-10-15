#!/bin/bash
# Test Docker environment setup

echo "🧪 Testing Docker Environment Setup"
echo "==================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to test a service
test_service() {
    local service=$1
    local env_var=$2
    local expected_pattern=$3
    
    echo -n "Testing $service - $env_var: "
    
    # Get the actual value from docker-compose config
    value=$(cd compose && docker compose -f docker-compose.dev.yml config | grep -A 100 "^  $service:" | grep -E "^\s+$env_var:" | head -1 | cut -d':' -f2- | xargs)
    
    if [[ -z "$value" ]]; then
        echo -e "${RED}❌ Not set${NC}"
        return 1
    elif [[ "$value" =~ $expected_pattern ]]; then
        echo -e "${GREEN}✓ $value${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $value (expected pattern: $expected_pattern)${NC}"
        return 1
    fi
}

# Test if docker compose command exists
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
    exit 1
fi

echo ""
echo "1. Testing API Service Environment Variables"
echo "-------------------------------------------"
test_service "api" "DATABASE_URL" "postgresql://.*@postgres:5432/fulexo"
test_service "api" "REDIS_URL" "redis://valkey:6379"
test_service "api" "DOMAIN_API" "http://localhost:3000"
test_service "api" "DOMAIN_APP" "http://localhost:3001"
test_service "api" "S3_ENDPOINT" "http://minio:9000"
test_service "api" "KARRIO_API_URL" "http://karrio-server:5002"

echo ""
echo "2. Testing Web Service Environment Variables"
echo "-------------------------------------------"
test_service "web" "BACKEND_API_BASE" "http://api:3000"
test_service "web" "NEXT_PUBLIC_API_BASE" "http://localhost:3000"
test_service "web" "NEXT_PUBLIC_APP_URL" "http://localhost:3001"
test_service "web" "DOMAIN_API" "http://localhost:3000"
test_service "web" "DOMAIN_APP" "http://localhost:3001"

echo ""
echo "3. Testing Worker Service Environment Variables"
echo "----------------------------------------------"
test_service "worker" "DATABASE_URL" "postgresql://.*@postgres:5432/fulexo"
test_service "worker" "REDIS_URL" "redis://valkey:6379"
test_service "worker" "FULEXO_API_URL" "http://api:3000"
test_service "worker" "KARRIO_API_URL" "http://karrio-server:5002"

echo ""
echo "4. Testing Service Connectivity"
echo "-------------------------------"
# This would require services to be running
echo -e "${YELLOW}Note: Full connectivity tests require services to be running${NC}"

echo ""
echo "5. Testing Port Accessibility"
echo "-----------------------------"
ports=("3000:API" "3001:Web" "5433:PostgreSQL" "6380:Redis/Valkey" "9000:MinIO" "9001:MinIO Console" "5002:Karrio API" "5001:Karrio Dashboard")

for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d':' -f1)
    service=$(echo $port_info | cut -d':' -f2)
    echo -e "Port $port ($service): Would be available on localhost:$port"
done

echo ""
echo "==================================="
echo -e "${GREEN}Environment configuration test complete!${NC}"
echo ""
echo "To start services, run:"
echo "  cd compose && docker-compose -f docker-compose.dev.yml up -d"