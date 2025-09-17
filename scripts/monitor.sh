#!/bin/bash

# Monitoring Script
# Usage: ./scripts/monitor.sh [--continuous] [--alert-email=email@example.com]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CONTINUOUS=${1:-false}
ALERT_EMAIL=${2:-""}

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

# Send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || warning "Failed to send alert email"
    fi
}

# Check service health
check_service_health() {
    local service_name="$1"
    local url="$2"
    local expected_status="$3"
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        success "$service_name is healthy (HTTP $status_code)"
        return 0
    else
        error "$service_name is unhealthy (HTTP $status_code, expected $expected_status)"
        send_alert "Fulexo Alert: $service_name Down" "$service_name returned HTTP $status_code at $(date)"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        error "Disk usage is critical: ${usage}%"
        send_alert "Fulexo Alert: Disk Space Critical" "Disk usage is ${usage}% at $(date)"
        return 1
    elif [ "$usage" -gt 80 ]; then
        warning "Disk usage is high: ${usage}%"
        return 0
    else
        success "Disk usage is normal: ${usage}%"
        return 0
    fi
}

# Check memory usage
check_memory_usage() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -gt 90 ]; then
        error "Memory usage is critical: ${usage}%"
        send_alert "Fulexo Alert: Memory Critical" "Memory usage is ${usage}% at $(date)"
        return 1
    elif [ "$usage" -gt 80 ]; then
        warning "Memory usage is high: ${usage}%"
        return 0
    else
        success "Memory usage is normal: ${usage}%"
        return 0
    fi
}

# Check Docker containers
check_docker_containers() {
    local containers=("fulexo-api" "fulexo-web" "fulexo-postgres" "fulexo-redis" "fulexo-worker")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container")
            if [ "$status" = "running" ]; then
                success "Container $container is running"
            else
                error "Container $container is not running (status: $status)"
                send_alert "Fulexo Alert: Container Down" "Container $container is $status at $(date)"
                all_healthy=false
            fi
        else
            error "Container $container is not found"
            send_alert "Fulexo Alert: Container Missing" "Container $container is not found at $(date)"
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
    if docker exec fulexo-postgres psql -U postgres -d fulexo -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database is accessible"
        return 0
    else
        error "Database is not accessible"
        send_alert "Fulexo Alert: Database Down" "Database is not accessible at $(date)"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    if docker exec fulexo-redis redis-cli ping > /dev/null 2>&1; then
        success "Redis is accessible"
        return 0
    else
        error "Redis is not accessible"
        send_alert "Fulexo Alert: Redis Down" "Redis is not accessible at $(date)"
        return 1
    fi
}

# Main monitoring function
monitor() {
    log "Starting monitoring check..."
    
    local overall_status=0
    
    # Check system resources
    check_disk_space || overall_status=1
    check_memory_usage || overall_status=1
    
    # Check Docker containers
    check_docker_containers || overall_status=1
    
    # Check database
    check_database || overall_status=1
    
    # Check Redis
    check_redis || overall_status=1
    
    # Check services
    check_service_health "API" "http://localhost:3000/api/health" 200 || overall_status=1
    check_service_health "Web" "http://localhost:3001" 200 || overall_status=1
    check_service_health "Worker" "http://localhost:3002/health" 200 || overall_status=1
    
    # Overall status
    if [ $overall_status -eq 0 ]; then
        success "All systems are healthy!"
    else
        error "Some systems are unhealthy. Check the logs above."
    fi
    
    return $overall_status
}

# Continuous monitoring
continuous_monitor() {
    log "Starting continuous monitoring (press Ctrl+C to stop)..."
    
    while true; do
        monitor
        sleep 60
    done
}

# Main execution
if [ "$CONTINUOUS" = "--continuous" ]; then
    continuous_monitor
else
    monitor
fi