#!/bin/bash

# SSL Certificate Setup Script for Fulexo Platform
# Specifically configured for fulexo.com domains

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Domains to secure
DOMAIN_API="api.fulexo.com"
DOMAIN_PANEL="panel.fulexo.com"

print_status "Setting up SSL certificates for Fulexo domains..."
echo "  - API Domain: $DOMAIN_API"
echo "  - Panel Domain: $DOMAIN_PANEL"

# Install Certbot
print_status "Installing/Updating Certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y snapd
    snap install core
    snap refresh core
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
else
    print_warning "Certbot already installed, checking for updates..."
    snap refresh certbot
fi

# Stop services to free up port 80
print_status "Stopping services temporarily..."
if systemctl is-active --quiet fulexo; then
    systemctl stop fulexo
    SERVICES_WERE_RUNNING=true
else
    # If service not running, stop docker containers directly
    cd /opt/fulexo/compose
    docker compose down
    SERVICES_WERE_RUNNING=false
fi

# Wait a moment for ports to be released
sleep 5

# Function to obtain certificate with retries
obtain_certificate() {
    local domain=$1
    local email=$2
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        print_status "Obtaining certificate for $domain (attempt $((retry_count + 1))/$max_retries)..."
        
        if certbot certonly \
            --standalone \
            --non-interactive \
            --agree-tos \
            --email "$email" \
            --no-eff-email \
            -d "$domain" \
            --keep-until-expiring; then
            print_status "Certificate obtained successfully for $domain"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                print_warning "Failed to obtain certificate, retrying in 10 seconds..."
                sleep 10
            fi
        fi
    done
    
    print_error "Failed to obtain certificate for $domain after $max_retries attempts"
    return 1
}

# Get email for Let's Encrypt
read -p "Enter email for Let's Encrypt notifications: " LETSENCRYPT_EMAIL
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    print_error "Email is required for Let's Encrypt!"
    exit 1
fi

# Validate email format
if ! [[ "$LETSENCRYPT_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Invalid email format!"
    exit 1
fi

# Obtain certificates
FAILED_DOMAINS=""

if ! obtain_certificate "$DOMAIN_API" "$LETSENCRYPT_EMAIL"; then
    FAILED_DOMAINS="$FAILED_DOMAINS $DOMAIN_API"
fi

if ! obtain_certificate "$DOMAIN_PANEL" "$LETSENCRYPT_EMAIL"; then
    FAILED_DOMAINS="$FAILED_DOMAINS $DOMAIN_PANEL"
fi

# Check if any certificates failed
if [ -n "$FAILED_DOMAINS" ]; then
    print_error "Failed to obtain certificates for:$FAILED_DOMAINS"
    print_warning "Please ensure:"
    echo "  1. DNS records are properly configured (A records pointing to this server)"
    echo "  2. Ports 80 and 443 are accessible from the internet"
    echo "  3. No other service is using port 80"
    exit 1
fi

# Setup auto-renewal
print_status "Setting up automatic certificate renewal..."

# Create renewal script
cat > /opt/fulexo/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL renewal script for Fulexo

# Stop nginx temporarily
docker exec compose-nginx-1 nginx -s stop 2>/dev/null || true
sleep 2

# Renew certificates
certbot renew --quiet

# Start nginx again
docker exec compose-nginx-1 nginx 2>/dev/null || true

# Reload nginx if it's running
docker exec compose-nginx-1 nginx -s reload 2>/dev/null || true
EOF

chmod +x /opt/fulexo/scripts/renew-ssl.sh

# Setup systemd timer for renewal
cat > /etc/systemd/system/certbot-renewal.service << EOF
[Unit]
Description=Certbot Renewal for Fulexo
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/fulexo/scripts/renew-ssl.sh
User=root
EOF

cat > /etc/systemd/system/certbot-renewal.timer << EOF
[Unit]
Description=Run certbot renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable certbot-renewal.timer
systemctl start certbot-renewal.timer

# Update environment file
print_status "Updating environment configuration..."
ENV_FILE="/opt/fulexo/compose/.env"

if [ -f "$ENV_FILE" ]; then
    # Update domain settings
    sed -i "s/DOMAIN_API=.*/DOMAIN_API=api.fulexo.com/g" "$ENV_FILE"
    sed -i "s/DOMAIN_APP=.*/DOMAIN_APP=panel.fulexo.com/g" "$ENV_FILE"
    
    # Add if not exists
    grep -q "DOMAIN_API=" "$ENV_FILE" || echo "DOMAIN_API=api.fulexo.com" >> "$ENV_FILE"
    grep -q "DOMAIN_APP=" "$ENV_FILE" || echo "DOMAIN_APP=panel.fulexo.com" >> "$ENV_FILE"
fi

# Restart services
if [ "$SERVICES_WERE_RUNNING" = true ]; then
    print_status "Starting services..."
    systemctl start fulexo
else
    print_status "Starting containers..."
    cd /opt/fulexo/compose
    docker compose up -d
fi

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Verify certificates
print_status "Verifying SSL certificates..."
if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN_PANEL/fullchain.pem" ]; then
    print_status "SSL certificates successfully installed!"
    
    # Show certificate details
    echo ""
    echo "Certificate details:"
    echo "-------------------"
    certbot certificates
    
    echo ""
    echo "================================================"
    echo "SSL SETUP COMPLETED SUCCESSFULLY!"
    echo ""
    echo "Your Fulexo platform is now accessible at:"
    echo "  - Panel: https://panel.fulexo.com"
    echo "  - API: https://api.fulexo.com"
    echo ""
    echo "Auto-renewal is configured and will run twice daily."
    echo ""
    echo "To manually renew certificates, run:"
    echo "  certbot renew"
    echo ""
    echo "To check renewal timer status:"
    echo "  systemctl status certbot-renewal.timer"
    echo "================================================"
else
    print_error "Certificate verification failed!"
    print_error "Please check the logs and try again."
    exit 1
fi

# Test HTTPS connectivity
print_status "Testing HTTPS connectivity..."
sleep 5

if curl -s -o /dev/null -w "%{http_code}" https://api.fulexo.com/health | grep -q "200\|404"; then
    print_status "API HTTPS connection successful!"
else
    print_warning "API HTTPS test failed - this might be normal if the service is still starting"
fi

if curl -s -o /dev/null -w "%{http_code}" https://panel.fulexo.com | grep -q "200\|404"; then
    print_status "Panel HTTPS connection successful!"
else
    print_warning "Panel HTTPS test failed - this might be normal if the service is still starting"
fi

print_status "SSL setup completed!"