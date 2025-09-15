#!/bin/bash

# Deployment Validation Script for Fulexo Platform
# This script checks if all components are properly configured and running

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

ERRORS=0

echo "🔍 Fulexo Platform Deployment Validation"
echo "========================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script should be run as root for complete validation"
   ERRORS=$((ERRORS + 1))
fi

# 1. Check environment file
print_info "Checking environment configuration..."
ENV_FILE="/etc/fulexo/fulexo.env"
if [ -f "$ENV_FILE" ]; then
    print_status "Environment file exists: $ENV_FILE"
    
    # Check if domains are configured
    if grep -q "yourdomain.com" "$ENV_FILE"; then
        print_error "Default domains still present in .env file - please update with your actual domains"
        ERRORS=$((ERRORS + 1))
    else
        print_status "Custom domains configured"
    fi
    
    # Check if passwords are changed
    if grep -q "your_secure_postgres_password" "$ENV_FILE"; then
        print_error "Default passwords still present in .env file"
        ERRORS=$((ERRORS + 1))
    else
        print_status "Passwords have been customized"
    fi
else
    print_error "Environment file not found: $ENV_FILE"
    ERRORS=$((ERRORS + 1))
fi

# 2. Check Docker installation
print_info "Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status "Docker installed: $DOCKER_VERSION"
    
    if docker compose version &> /dev/null; then
        print_status "Docker Compose V2 available"
    else
        print_error "Docker Compose V2 not available"
        ERRORS=$((ERRORS + 1))
    fi
else
    print_error "Docker not installed"
    ERRORS=$((ERRORS + 1))
fi

# 3. Check Node.js installation
print_info "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 20 ]; then
        print_status "Node.js installed: $NODE_VERSION"
    else
        print_warning "Node.js version is $NODE_VERSION, but 20+ is recommended"
    fi
else
    print_error "Node.js not installed"
    ERRORS=$((ERRORS + 1))
fi

# 4. Check project files
print_info "Checking project files..."
if [ -d "/opt/fulexo" ]; then
    print_status "Project directory exists: /opt/fulexo"
    
    if [ -f "/opt/fulexo/compose/docker-compose.yml" ]; then
        print_status "Docker compose file exists"
    else
        print_error "Docker compose file missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ -f "/opt/fulexo/env.example" ]; then
        print_status "Environment example file exists"
    else
        print_error "Environment example file missing"
        ERRORS=$((ERRORS + 1))
    fi
else
    print_error "Project directory not found: /opt/fulexo"
    ERRORS=$((ERRORS + 1))
fi

# 5. Check systemd service
print_info "Checking systemd service..."
if systemctl list-unit-files | grep -q "fulexo.service"; then
    print_status "Fulexo systemd service exists"
    
    if systemctl is-enabled fulexo &> /dev/null; then
        print_status "Service is enabled for auto-start"
    else
        print_warning "Service is not enabled for auto-start"
    fi
    
    if systemctl is-active fulexo &> /dev/null; then
        print_status "Service is currently running"
    else
        print_warning "Service is not currently running"
    fi
else
    print_error "Fulexo systemd service not found"
    ERRORS=$((ERRORS + 1))
fi

# 6. Check SSL certificates (if domains are configured)
print_info "Checking SSL certificates..."
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    if [ -n "${DOMAIN_API:-}" ] && [ -n "${DOMAIN_APP:-}" ]; then
        if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ]; then
            print_status "SSL certificate exists for API domain: $DOMAIN_API"
        else
            print_warning "SSL certificate missing for API domain: $DOMAIN_API"
        fi
        
        if [ -f "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" ]; then
            print_status "SSL certificate exists for App domain: $DOMAIN_APP"
        else
            print_warning "SSL certificate missing for App domain: $DOMAIN_APP"
        fi
    else
        print_warning "Domains not configured in environment file"
    fi
fi

# 7. Check Docker containers
print_info "Checking Docker containers..."
if [ -f "/opt/fulexo/compose/docker-compose.yml" ]; then
    cd /opt/fulexo/compose
    
    EXPECTED_SERVICES=("nginx" "postgres" "valkey" "minio" "api" "web" "worker" "prometheus" "alertmanager" "grafana" "loki" "promtail" "jaeger" "uptimekuma")
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | grep "compose-" | wc -l)
    
    if [ $RUNNING_CONTAINERS -gt 0 ]; then
        print_status "$RUNNING_CONTAINERS containers are running"
        
        # Check specific important containers
        for service in "api" "web" "postgres" "nginx"; do
            if docker ps --format "{{.Names}}" | grep -q "compose-${service}-1"; then
                print_status "$service container is running"
            else
                print_error "$service container is not running"
                ERRORS=$((ERRORS + 1))
            fi
        done
    else
        print_warning "No containers are currently running"
    fi
fi

# 8. Check firewall
print_info "Checking firewall configuration..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_status "UFW firewall is active"
        
        # Check essential ports
        if ufw status | grep -q "80/tcp"; then
            print_status "HTTP port (80) is open"
        else
            print_error "HTTP port (80) is not open"
            ERRORS=$((ERRORS + 1))
        fi
        
        if ufw status | grep -q "443/tcp"; then
            print_status "HTTPS port (443) is open"
        else
            print_error "HTTPS port (443) is not open"
            ERRORS=$((ERRORS + 1))
        fi
    else
        print_error "UFW firewall is not active"
        ERRORS=$((ERRORS + 1))
    fi
else
    print_error "UFW firewall not installed"
    ERRORS=$((ERRORS + 1))
fi

# 9. Check backup configuration
print_info "Checking backup configuration..."
if [ -f "/opt/fulexo/scripts/backup.sh" ]; then
    print_status "Backup script exists"
    
    if crontab -u fulexo -l 2>/dev/null | grep -q "backup.sh"; then
        print_status "Backup cron job is configured"
    else
        print_warning "Backup cron job is not configured"
    fi
else
    print_error "Backup script missing"
    ERRORS=$((ERRORS + 1))
fi

# 10. Network connectivity test
print_info "Testing network connectivity..."
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    if [ -n "${DOMAIN_API:-}" ] && [ -n "${DOMAIN_APP:-}" ]; then
        # Test if domains resolve
        if nslookup "$DOMAIN_API" &> /dev/null; then
            print_status "API domain resolves: $DOMAIN_API"
        else
            print_warning "API domain does not resolve: $DOMAIN_API"
        fi
        
        if nslookup "$DOMAIN_APP" &> /dev/null; then
            print_status "App domain resolves: $DOMAIN_APP"
        else
            print_warning "App domain does not resolve: $DOMAIN_APP"
        fi
    fi
fi

# Summary
echo ""
echo "========================================"
echo "🔍 VALIDATION SUMMARY"
echo "========================================"

if [ $ERRORS -eq 0 ]; then
    print_status "All critical checks passed! ✨"
    echo ""
    echo "Your Fulexo platform appears to be properly configured."
    echo "If you haven't started the services yet, run:"
    echo "  systemctl start fulexo"
    echo ""
    echo "Then check the service status:"
    echo "  systemctl status fulexo"
    echo "  docker ps"
else
    print_error "Found $ERRORS critical issues that need attention"
    echo ""
    echo "Please resolve the issues above before proceeding."
    exit 1
fi

echo ""
echo "🎉 Ready for deployment!"
