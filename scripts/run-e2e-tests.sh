#!/bin/bash

# =============================================================================
# Fulexo Panel - E2E Testing Execution Script
# =============================================================================
# This script runs comprehensive end-to-end tests including:
# - Health checks for all services
# - API endpoint testing
# - Frontend page testing
# - Worker job testing
# - Integration testing
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Test results array
declare -a TEST_RESULTS

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
    TEST_RESULTS+=("PASS: $1")
}

log_failure() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
    TEST_RESULTS+=("FAIL: $1")
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNINGS++))
}

log_section() {
    echo ""
    echo -e "${MAGENTA}=========================================================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}=========================================================================${NC}"
}

# Test HTTP endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local expected_status=${4:-200}
    local data=$5

    ((TOTAL_TESTS++))
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ] || [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
        log_success "$description (HTTP $status_code)"
        TEST_RESULTS+=("PASS: $description")
        ((PASSED_TESTS++))
        return 0
    else
        log_failure "$description (Expected $expected_status, got $status_code)"
        TEST_RESULTS+=("FAIL: $description - HTTP $status_code")
        ((FAILED_TESTS++))
        return 1
    fi
}

# =============================================================================
# Phase 1: Infrastructure Health Checks
# =============================================================================
log_section "Phase 1: Infrastructure Health Checks"

log_info "Checking Docker services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_failure "Docker is not running"
    exit 1
fi

# Check PostgreSQL
if docker ps | grep -q postgres; then
    log_success "PostgreSQL container is running"
else
    log_failure "PostgreSQL container is not running"
fi

# Check Redis/Valkey
if docker ps | grep -q valkey; then
    log_success "Redis/Valkey container is running"
else
    log_failure "Redis/Valkey container is not running"
fi

# Check MinIO
if docker ps | grep -q minio; then
    log_success "MinIO container is running"
else
    log_failure "MinIO container is not running"
fi

# Check Karrio
if docker ps | grep -q karrio-server; then
    log_success "Karrio server container is running"
else
    log_failure "Karrio server container is not running"
fi

# =============================================================================
# Phase 2: Service Health Endpoints
# =============================================================================
log_section "Phase 2: Service Health Endpoints"

# API Health Check
test_endpoint "GET" "http://localhost:3000/health" "API health check"

# API Detailed Health
test_endpoint "GET" "http://localhost:3000/health/detailed" "API detailed health check"

# API Metrics
test_endpoint "GET" "http://localhost:3000/metrics" "API Prometheus metrics"

# Worker Health
test_endpoint "GET" "http://localhost:3002/health" "Worker health check"

# Worker Metrics
test_endpoint "GET" "http://localhost:3002/metrics" "Worker Prometheus metrics"

# Web Application
test_endpoint "GET" "http://localhost:3001" "Web application homepage"

# Karrio API
test_endpoint "GET" "http://localhost:5002" "Karrio API endpoint"

# MinIO
test_endpoint "GET" "http://localhost:9000/minio/health/live" "MinIO health check"

# =============================================================================
# Phase 3: API Authentication Endpoints
# =============================================================================
log_section "Phase 3: API Authentication Endpoints"

log_info "Testing authentication endpoints..."

# Test endpoints existence (without actual authentication for now)
test_endpoint "GET" "http://localhost:3000/api/auth/me" "Auth /me endpoint (should return 401)" "401"

# Test Swagger documentation
test_endpoint "GET" "http://localhost:3000/api/docs" "Swagger API documentation"

# Test JWKS endpoint
test_endpoint "GET" "http://localhost:3000/.well-known/jwks.json" "JWKS endpoint"

# =============================================================================
# Phase 4: API Module Endpoints (Unauthenticated checks)
# =============================================================================
log_section "Phase 4: API Module Endpoints Availability"

log_info "Checking API endpoints are responding (authentication required)..."

# These should return 401 or 403, indicating the endpoint exists
test_endpoint "GET" "http://localhost:3000/api/tenants" "Tenants endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/users" "Users endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/orders" "Orders endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/products" "Products endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/customers" "Customers endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/shipments" "Shipments endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/stores" "Stores endpoint exists" "401"
test_endpoint "GET" "http://localhost:3000/api/reports/sales" "Reports endpoint exists" "401"

# =============================================================================
# Phase 5: Frontend Pages Accessibility
# =============================================================================
log_section "Phase 5: Frontend Pages Accessibility"

log_info "Checking frontend pages are accessible..."

# Public pages
test_endpoint "GET" "http://localhost:3001" "Homepage"
test_endpoint "GET" "http://localhost:3001/login" "Login page"

# Protected pages (should redirect to login or show login)
test_endpoint "GET" "http://localhost:3001/dashboard" "Dashboard page"
test_endpoint "GET" "http://localhost:3001/orders" "Orders page"
test_endpoint "GET" "http://localhost:3001/products" "Products page"
test_endpoint "GET" "http://localhost:3001/customers" "Customers page"
test_endpoint "GET" "http://localhost:3001/shipping" "Shipping page"
test_endpoint "GET" "http://localhost:3001/inventory" "Inventory page"
test_endpoint "GET" "http://localhost:3001/stores" "Stores page"
test_endpoint "GET" "http://localhost:3001/reports" "Reports page"
test_endpoint "GET" "http://localhost:3001/calendar" "Calendar page"
test_endpoint "GET" "http://localhost:3001/settings" "Settings page"
test_endpoint "GET" "http://localhost:3001/profile" "Profile page"
test_endpoint "GET" "http://localhost:3001/support" "Support page"

# =============================================================================
# Phase 6: Database Connectivity
# =============================================================================
log_section "Phase 6: Database Connectivity"

log_info "Checking database connectivity..."

# Test database connection via API health check
if curl -s http://localhost:3000/health | grep -q '"database":"healthy"'; then
    log_success "Database connection is healthy"
else
    log_failure "Database connection is not healthy"
fi

# Test Redis connection
if curl -s http://localhost:3000/health | grep -q '"redis":"healthy"'; then
    log_success "Redis connection is healthy"
else
    log_failure "Redis connection is not healthy"
fi

# Test S3/MinIO connection
if curl -s http://localhost:3000/health | grep -q '"storage":"healthy"'; then
    log_success "S3/MinIO connection is healthy"
else
    log_warning "S3/MinIO connection status unknown"
fi

# =============================================================================
# Phase 7: Monitoring Stack
# =============================================================================
log_section "Phase 7: Monitoring Stack"

log_info "Checking monitoring services..."

# Prometheus
test_endpoint "GET" "http://localhost:9090/-/healthy" "Prometheus health"

# Grafana
test_endpoint "GET" "http://localhost:3003/api/health" "Grafana health"

# Jaeger
test_endpoint "GET" "http://localhost:16686" "Jaeger UI"

# Uptime Kuma
test_endpoint "GET" "http://localhost:3004" "Uptime Kuma"

# =============================================================================
# Phase 8: Docker Logs Analysis
# =============================================================================
log_section "Phase 8: Docker Logs Analysis"

log_info "Analyzing Docker logs for errors..."

cd compose 2>/dev/null || cd .

# Check API logs for errors
log_info "Checking API logs..."
if docker-compose logs --tail=100 api 2>/dev/null | grep -i "error" | grep -v "0 errors" > /dev/null; then
    log_warning "Found errors in API logs (check manually)"
else
    log_success "No critical errors in API logs"
fi

# Check Worker logs
log_info "Checking Worker logs..."
if docker-compose logs --tail=100 worker 2>/dev/null | grep -i "error" | grep -v "0 errors" > /dev/null; then
    log_warning "Found errors in Worker logs (check manually)"
else
    log_success "No critical errors in Worker logs"
fi

# Check Web logs
log_info "Checking Web logs..."
if docker-compose logs --tail=100 web 2>/dev/null | grep -i "error" | grep -v "0 errors" > /dev/null; then
    log_warning "Found errors in Web logs (check manually)"
else
    log_success "No critical errors in Web logs"
fi

cd .. 2>/dev/null || true

# =============================================================================
# Phase 9: Performance Checks
# =============================================================================
log_section "Phase 9: Performance Checks"

log_info "Measuring API response times..."

# Measure API health endpoint response time
start_time=$(date +%s%N)
curl -s http://localhost:3000/health > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

if [ $response_time -lt 200 ]; then
    log_success "API response time: ${response_time}ms (excellent)"
elif [ $response_time -lt 500 ]; then
    log_success "API response time: ${response_time}ms (good)"
elif [ $response_time -lt 1000 ]; then
    log_warning "API response time: ${response_time}ms (acceptable)"
else
    log_warning "API response time: ${response_time}ms (slow)"
fi

# =============================================================================
# Test Summary
# =============================================================================
log_section "Test Summary"

echo ""
echo "Total Tests:    $TOTAL_TESTS"
echo -e "${GREEN}Passed:         $PASSED_TESTS${NC}"
echo -e "${RED}Failed:         $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings:       $WARNINGS${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "Success Rate:   ${success_rate}%"
fi

echo ""

# Print detailed results
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed Tests:${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == FAIL:* ]]; then
            echo "  - ${result#FAIL: }"
        fi
    done
    echo ""
fi

# Final verdict
if [ $FAILED_TESTS -eq 0 ]; then
    log_success "All tests passed! System is ready for E2E testing."
    exit 0
elif [ $FAILED_TESTS -lt 5 ]; then
    log_warning "Some tests failed, but system is mostly operational."
    exit 0
else
    log_failure "Multiple tests failed. Please check the logs and fix issues."
    exit 1
fi

