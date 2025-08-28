#!/bin/bash

# SSL Certificate Setup Script for Fulexo Platform
# Uses Certbot with Let's Encrypt

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

# Check if .env file exists
if [ ! -f "/opt/fulexo/compose/.env" ]; then
    print_error ".env file not found. Please run setup-droplet.sh first!"
    exit 1
fi

# Load environment variables
source /opt/fulexo/compose/.env

# Check required variables
if [ -z "${DOMAIN_API:-}" ] || [ -z "${DOMAIN_APP:-}" ]; then
    print_error "DOMAIN_API and DOMAIN_APP must be set in .env file!"
    exit 1
fi

# Validate domains
if [[ "$DOMAIN_API" == *"example.com"* ]] || [[ "$DOMAIN_APP" == *"example.com"* ]]; then
    print_error "Please update DOMAIN_API and DOMAIN_APP in .env with your actual domains!"
    exit 1
fi

print_status "Setting up SSL certificates for:"
echo "  - API Domain: $DOMAIN_API"
echo "  - App Domain: $DOMAIN_APP"

# Install Certbot
print_status "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y snapd
    snap install core
    snap refresh core
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
else
    print_warning "Certbot already installed, skipping..."
fi

# Stop services to free up port 80
print_status "Stopping services temporarily..."
if systemctl is-active --quiet fulexo; then
    systemctl stop fulexo
    SERVICES_WERE_RUNNING=true
else
    SERVICES_WERE_RUNNING=false
fi

# Function to obtain certificate
obtain_certificate() {
    local domain=$1
    local email=$2
    
    print_status "Obtaining certificate for $domain..."
    
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$email" \
        -d "$domain" \
        --keep-until-expiring
}

# Get email for Let's Encrypt
read -p "Enter email for Let's Encrypt notifications: " LETSENCRYPT_EMAIL
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    print_error "Email is required for Let's Encrypt!"
    exit 1
fi

# Obtain certificates
obtain_certificate "$DOMAIN_API" "$LETSENCRYPT_EMAIL"
obtain_certificate "$DOMAIN_APP" "$LETSENCRYPT_EMAIL"

# Update Nginx configuration
print_status "Updating Nginx configuration..."
NGINX_CONF="/opt/fulexo/compose/nginx/conf.d/app.conf"

# Backup original config
cp "$NGINX_CONF" "${NGINX_CONF}.backup"

# Update domain names and SSL paths
sed -i "s/api.example.com/$DOMAIN_API/g" "$NGINX_CONF"
sed -i "s/app.example.com/$DOMAIN_APP/g" "$NGINX_CONF"

print_status "Nginx configuration updated!"

# Setup auto-renewal
print_status "Setting up automatic certificate renewal..."
cat > /etc/systemd/system/certbot-renewal.service << EOF
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStartPre=/usr/bin/docker compose -f /opt/fulexo/compose/docker-compose.yml stop nginx
ExecStart=/usr/bin/certbot renew --quiet --standalone
ExecStartPost=/usr/bin/docker compose -f /opt/fulexo/compose/docker-compose.yml start nginx
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

# Create renewal hook script
print_status "Creating renewal hook..."
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
docker exec compose-nginx-1 nginx -s reload
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Restart services if they were running
if [ "$SERVICES_WERE_RUNNING" = true ]; then
    print_status "Starting services..."
    systemctl start fulexo
fi

# Verify certificates
print_status "Verifying certificates..."
if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN_APP/fullchain.pem" ]; then
    print_status "SSL certificates successfully installed!"
    echo ""
    echo "================================================"
    echo "SSL SETUP COMPLETED!"
    echo ""
    echo "Certificates installed for:"
    echo "  - $DOMAIN_API"
    echo "  - $DOMAIN_APP"
    echo ""
    echo "Auto-renewal is configured and will run twice daily."
    echo ""
    echo "Your application should now be accessible at:"
    echo "  - https://$DOMAIN_APP"
    echo "  - https://$DOMAIN_API"
    echo "================================================"
else
    print_error "Certificate installation failed! Please check the logs."
    exit 1
fi

# Test renewal
print_status "Testing certificate renewal..."
certbot renew --dry-run

print_status "SSL setup completed successfully!"