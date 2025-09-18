#!/bin/bash

# Fulexo Platform SSL Certificate Setup Script
# For panel.fulexo.com and api.fulexo.com domains

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAINS=("panel.fulexo.com" "api.fulexo.com" "monitor.fulexo.com")
SSL_DIR="./ssl"
EMAIL="admin@fulexo.com"
STAGING=false

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check if certbot is installed
check_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt update
        sudo apt install -y certbot
    else
        log_success "Certbot is already installed"
    fi
}

# Create SSL directory
create_ssl_dir() {
    log_info "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
    chmod 700 "$SSL_DIR"
    log_success "SSL directory created: $SSL_DIR"
}

# Generate self-signed certificates (for testing)
generate_self_signed() {
    log_info "Generating self-signed certificates for testing..."
    
    for domain in "${DOMAINS[@]}"; do
        log_info "Generating certificate for $domain..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/$domain.key" \
            -out "$SSL_DIR/$domain.crt" \
            -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Fulexo/OU=IT/CN=$domain" \
            -addext "subjectAltName=DNS:$domain,DNS:www.$domain"
        
        chmod 600 "$SSL_DIR/$domain.key"
        chmod 644 "$SSL_DIR/$domain.crt"
        
        log_success "Self-signed certificate generated for $domain"
    done
}

# Generate Let's Encrypt certificates
generate_letsencrypt() {
    log_info "Generating Let's Encrypt certificates..."
    
    # Stop nginx if running
    if docker ps | grep -q fulexo-nginx; then
        log_info "Stopping nginx container..."
        docker stop fulexo-nginx || true
    fi
    
    # Generate certificates
    for domain in "${DOMAINS[@]}"; do
        log_info "Generating Let's Encrypt certificate for $domain..."
        
        if [ "$STAGING" = true ]; then
            certbot certonly --standalone \
                --staging \
                --email "$EMAIL" \
                --agree-tos \
                --no-eff-email \
                --domains "$domain" \
                --non-interactive
        else
            certbot certonly --standalone \
                --email "$EMAIL" \
                --agree-tos \
                --no-eff-email \
                --domains "$domain" \
                --non-interactive
        fi
        
        # Copy certificates to our SSL directory
        cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/$domain.crt"
        cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/$domain.key"
        
        chmod 600 "$SSL_DIR/$domain.key"
        chmod 644 "$SSL_DIR/$domain.crt"
        
        log_success "Let's Encrypt certificate generated for $domain"
    done
}

# Setup certificate renewal
setup_renewal() {
    log_info "Setting up certificate renewal..."
    
    # Create renewal script
    cat > /tmp/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

SSL_DIR="./ssl"
DOMAINS=("panel.fulexo.com" "api.fulexo.com" "monitor.fulexo.com")

# Renew certificates
certbot renew --quiet

# Copy renewed certificates
for domain in "${DOMAINS[@]}"; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/$domain.crt"
        cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/$domain.key"
        chmod 600 "$SSL_DIR/$domain.key"
        chmod 644 "$SSL_DIR/$domain.crt"
    fi
done

# Reload nginx
if docker ps | grep -q fulexo-nginx; then
    docker exec fulexo-nginx nginx -s reload
fi

echo "SSL certificates renewed successfully"
EOF

    chmod +x /tmp/renew-ssl.sh
    sudo mv /tmp/renew-ssl.sh /usr/local/bin/renew-ssl.sh
    
    # Add to crontab for automatic renewal
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
    
    log_success "Certificate renewal setup completed"
}

# Verify certificates
verify_certificates() {
    log_info "Verifying certificates..."
    
    for domain in "${DOMAINS[@]}"; do
        if [ -f "$SSL_DIR/$domain.crt" ] && [ -f "$SSL_DIR/$domain.key" ]; then
            log_success "Certificate files exist for $domain"
            
            # Check certificate validity
            if openssl x509 -in "$SSL_DIR/$domain.crt" -text -noout | grep -q "Validity"; then
                log_success "Certificate is valid for $domain"
            else
                log_warning "Certificate validation failed for $domain"
            fi
        else
            log_error "Certificate files missing for $domain"
        fi
    done
}

# Main function
main() {
    log_info "Starting SSL certificate setup for Fulexo Platform..."
    log_info "Domains: ${DOMAINS[*]}"
    
    check_root
    create_ssl_dir
    
    # Ask user for certificate type
    echo ""
    echo "Choose certificate type:"
    echo "1) Self-signed (for testing)"
    echo "2) Let's Encrypt (for production)"
    echo "3) Let's Encrypt Staging (for testing)"
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            generate_self_signed
            ;;
        2)
            check_certbot
            generate_letsencrypt
            setup_renewal
            ;;
        3)
            STAGING=true
            check_certbot
            generate_letsencrypt
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    verify_certificates
    
    log_success "SSL certificate setup completed!"
    log_info "Certificates are located in: $SSL_DIR"
    log_info "You can now start your application with: docker-compose -f docker-compose.prod.yml up -d"
}

# Run main function
main "$@"