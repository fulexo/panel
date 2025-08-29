#!/bin/bash

# DigitalOcean Droplet Setup Script for Fulexo Platform
# Requirements: Ubuntu 22.04+ droplet with at least 4GB RAM

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

print_status "Starting Fulexo Platform installation on DigitalOcean Droplet..."

# Update system packages
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
print_status "Installing required packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    git \
    htop \
    vim \
    wget

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
else
    print_warning "Docker already installed, skipping..."
fi

# Configure firewall
print_status "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9000:9001/tcp  # MinIO ports (restrict in production)
ufw allow 3001/tcp       # Uptime Kuma (restrict in production)
ufw allow 9093/tcp       # Alertmanager (restrict in production)
ufw allow 16686/tcp      # Jaeger (restrict in production)
ufw --force enable

# Configure fail2ban
print_status "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create application user
print_status "Creating application user..."
if ! id -u fulexo &>/dev/null; then
    useradd -m -s /bin/bash fulexo
    usermod -aG docker fulexo
else
    print_warning "User 'fulexo' already exists, skipping..."
fi

# Create application directories
print_status "Creating application directories..."
mkdir -p /opt/fulexo
chown fulexo:fulexo /opt/fulexo

# Clone repository (if not exists)
print_status "Setting up application..."
cd /opt/fulexo
if [ "${SKIP_CLONE:-false}" = "true" ]; then
    print_warning "SKIP_CLONE=true → skipping repository clone/update step"
else
    if [ ! -d ".git" ]; then
        print_status "Cloning repository..."
        git clone https://github.com/fulexo/panel.git .
        chown -R fulexo:fulexo /opt/fulexo
    else
        print_warning "Repository already exists, pulling latest changes..."
        sudo -u fulexo git pull
    fi
fi

# Setup environment file (stored outside repo to avoid git operations)
print_status "Setting up environment configuration..."
ENV_DIR="/etc/fulexo"
ENV_PATH="${ENV_DIR}/fulexo.env"
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_PATH" ]; then
    cp compose/.env.example "$ENV_PATH"
    print_warning "Environment file created. Please edit $ENV_PATH with your configuration!"

    # Generate secure passwords
    POSTGRES_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    MINIO_ACCESS=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)
    MINIO_SECRET=$(openssl rand -base64 40 | tr -d "=+/" | cut -c1-40)
    GRAFANA_PASS=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)

    # Update env with generated passwords
    sed -i "s/your_secure_postgres_password/$POSTGRES_PASS/g" "$ENV_PATH"
    sed -i "s/your_very_long_and_secure_jwt_secret_key/$JWT_SECRET/g" "$ENV_PATH"
    sed -i "s/your_32_character_encryption_key/$ENCRYPTION_KEY/g" "$ENV_PATH"
    sed -i "s/your_minio_access_key/$MINIO_ACCESS/g" "$ENV_PATH"
    sed -i "s/your_minio_secret_key/$MINIO_SECRET/g" "$ENV_PATH"
    sed -i "s/your_secure_grafana_password/$GRAFANA_PASS/g" "$ENV_PATH"

    print_status "Generated secure passwords and updated env file"
    print_warning "IMPORTANT: Save these credentials securely!"
    echo "================================================"
    echo "PostgreSQL Password: $POSTGRES_PASS"
    echo "MinIO Access Key: $MINIO_ACCESS"
    echo "MinIO Secret Key: $MINIO_SECRET"
    echo "Grafana Admin Password: $GRAFANA_PASS"
    echo "================================================"
else
    print_warning "Environment file already exists at $ENV_PATH, skipping..."
fi

# Optional: maintain a symlink for local compose convenience
ln -sf "$ENV_PATH" /opt/fulexo/compose/.env || true

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/fulexo.service << EOF
[Unit]
Description=Fulexo Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=fulexo
WorkingDirectory=/opt/fulexo/compose
Environment=ENV_FILE=/etc/fulexo/fulexo.env
ExecStart=/usr/bin/docker compose --env-file /etc/fulexo/fulexo.env -f /opt/fulexo/compose/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose --env-file /etc/fulexo/fulexo.env -f /opt/fulexo/compose/docker-compose.yml down
ExecReload=/usr/bin/docker compose --env-file /etc/fulexo/fulexo.env -f /opt/fulexo/compose/docker-compose.yml restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fulexo.service

# Setup log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/fulexo << EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

# Create backup script
print_status "Creating backup script..."
mkdir -p /opt/fulexo/scripts
cat > /opt/fulexo/scripts/backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/fulexo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Load environment from external file if present
ENV_FILE="/etc/fulexo/fulexo.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

PG_USER="${POSTGRES_USER:-fulexo}"
PG_DB="${POSTGRES_DB:-fulexo}"

# Backup database
docker exec compose-postgres-1 pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Backup volumes
docker run --rm -v compose_pgdata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/pgdata_${DATE}.tar.gz" -C /data .
docker run --rm -v compose_miniodata:/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/miniodata_${DATE}.tar.gz" -C /data .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -type f -mtime +7 -delete
EOF

chmod +x /opt/fulexo/scripts/backup.sh
chown -R fulexo:fulexo /opt/fulexo/scripts

# Setup cron for backups
print_status "Setting up automated backups..."
echo "0 2 * * * fulexo /opt/fulexo/scripts/backup.sh" | crontab -u fulexo -

# Setup monitoring alerts
print_status "Setting up basic monitoring..."
cat > /opt/fulexo/scripts/health-check.sh << 'EOF'
#!/bin/bash
# Add your monitoring logic here
# Example: Check if all containers are running
EXPECTED_CONTAINERS=12
RUNNING_CONTAINERS=$(docker ps --filter "name=compose-" --format "{{.Names}}" | wc -l)

if [ $RUNNING_CONTAINERS -lt $EXPECTED_CONTAINERS ]; then
    echo "WARNING: Only $RUNNING_CONTAINERS/$EXPECTED_CONTAINERS containers are running"
    # Add alerting logic here (email, webhook, etc.)
fi
EOF

chmod +x /opt/fulexo/scripts/health-check.sh
echo "*/5 * * * * fulexo /opt/fulexo/scripts/health-check.sh" | crontab -u fulexo -

# Final instructions
print_status "Installation completed!"
echo ""
echo "================================================"
echo "NEXT STEPS:"
echo "1. Edit environment variables: vim /opt/fulexo/compose/.env"
echo "2. Update domain names in: /opt/fulexo/compose/nginx/conf.d/app.conf"
echo "3. Setup SSL certificates: /opt/fulexo/scripts/setup-ssl.sh"
echo "4. Start the application: systemctl start fulexo"
echo "5. Check status: systemctl status fulexo"
echo "6. View logs: docker logs -f compose-api-1"
echo ""
echo "IMPORTANT URLS (after configuration):"
echo "- Application: https://app.yourdomain.com"
echo "- API: https://api.yourdomain.com"
echo "- MinIO Console: http://your-ip:9001"
echo "- Uptime Kuma: http://your-ip:3001"
echo "- Grafana: Access via SSH tunnel"
echo "================================================"
print_warning "Remember to configure your domains and SSL certificates before starting!"