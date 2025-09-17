#!/bin/bash

# Health Check Script
# Usage: ./scripts/health-check.sh [--verbose]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERBOSE=${1:-false}
HEALTH_CHECK_TIMEOUT=30
MAX_RETRIES=3

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if service is healthy
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if [ "$VERBOSE" = "--verbose" ]; then
            log "Checking $service_name... (attempt $((retry_count + 1))/$MAX_RETRIES)"
        fi
        
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_CHECK_TIMEOUT "$url" || echo "000")
        
        if [ "$status_code" = "$expected_status" ]; then
            success "$service_name is healthy (HTTP $status_code)"
            return 0
        else
            warning "$service_name returned HTTP $status_code (expected $expected_status)"
            retry_count=$((retry_count + 1))
            sleep 5
        fi
    done
    
    error "$service_name health check failed after $MAX_RETRIES attempts"
    return 1
}

# Check Docker containers
check_containers() {
    log "Checking Docker containers..."
    
    local containers=("fulexo-api" "fulexo-web" "fulexo-postgres" "fulexo-redis" "fulexo-worker")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container")
            if [ "$status" = "running" ]; then
                success "Container $container is running"
            else
                error "Container $container is not running (status: $status)"
                all_healthy=false
            fi
        else
            error "Container $container is not found"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        return 1
    fi
    
    return 0
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    local db_check=$(docker exec fulexo-postgres psql -U postgres -d fulexo -c "SELECT 1;" 2>/dev/null | grep -c "1 row" || echo "0")
    
    if [ "$db_check" = "1" ]; then
        success "Database is accessible"
        return 0
    else
        error "Database is not accessible"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    local redis_check=$(docker exec fulexo-redis redis-cli ping 2>/dev/null | grep -c "PONG" || echo "0")
    
    if [ "$redis_check" = "1" ]; then
        success "Redis is accessible"
        return 0
    else
        error "Redis is not accessible"
        return 1
    fi
}

# Check API endpoints
check_api() {
    log "Checking API endpoints..."
    
    # Check API health endpoint
    check_service "API Health" "http://localhost:3000/api/health" 200
    
    # Check API auth endpoint
    check_service "API Auth" "http://localhost:3000/api/auth/me" 401  # Should return 401 without auth
    
    return $?
}

# Check frontend
check_frontend() {
    log "Checking frontend..."
    
    check_service "Frontend" "http://localhost:3001" 200
    
    return $?
}

# Check worker service
check_worker() {
    log "Checking worker service..."
    
    # Check if worker container is running
    if docker ps --format "table {{.Names}}" | grep -q "^fulexo-worker$"; then
        success "Worker service is running"
        return 0
    else
        error "Worker service is not running"
        return 1
    fi
}

# Main health check
main() {
    log "Starting comprehensive health check..."
    
    local overall_status=0
    
    # Check containers
    if ! check_containers; then
        overall_status=1
    fi
    
    # Check database
    if ! check_database; then
        overall_status=1
    fi
    
    # Check Redis
    if ! check_redis; then
        overall_status=1
    fi
    
    # Check API
    if ! check_api; then
        overall_status=1
    fi
    
    # Check frontend
    if ! check_frontend; then
        overall_status=1
    fi
    
    # Check worker
    if ! check_worker; then
        overall_status=1
    fi
    
    # Overall status
    if [ $overall_status -eq 0 ]; then
        success "All health checks passed! System is healthy."
    else
        error "Some health checks failed. Please check the logs above."
    fi
    
    return $overall_status
}

# Run main function
main