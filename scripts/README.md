# 🛠️ Fulexo Platform - Management Scripts

This directory contains essential scripts for installing, managing, and maintaining the Fulexo Platform.

## 📋 Script Categories

### 🚀 Installation Scripts

#### `quick-install.sh`
**Quick installation script (Recommended)**
- Complete installation in one go
- Interactive domain configuration
- Automatic SSL certificate setup
- Database configuration included
- Admin user creation included
- Systemd service installation included

```bash
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

#### `install-from-scratch.sh`
**Basic installation script**
- Fresh server setup
- Installs Docker, Node.js, required packages
- Creates environment file
- Creates systemd service

```bash
chmod +x scripts/install-from-scratch.sh
./scripts/install-from-scratch.sh
```

### 🔧 Management Scripts

#### `health-check.sh`
**Platform health monitoring**
- Checks service status
- Verifies container health
- Tests database connectivity
- Validates API/Web services
- Checks SSL certificates

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

#### `update-platform.sh`
**Platform update script**
- Updates repository
- Updates dependencies
- Runs database migrations
- Restarts services

```bash
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh
```

#### `fix-common-issues.sh`
**Common issues fix script**
- Checks Docker service
- Cleans disk space
- Restarts containers
- Fixes database/Redis connectivity
- Validates Nginx configuration

```bash
chmod +x scripts/fix-common-issues.sh
./scripts/fix-common-issues.sh
```

### 🔐 Security Scripts

#### `setup-ssl.sh`
**SSL certificate setup script**
- Installs Let's Encrypt certificates
- Configures automatic renewal
- Updates Nginx configuration

```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

#### `setup-security.sh`
**Security hardening script**
- Configures firewall
- Sets up security headers
- Implements rate limiting
- Configures fail2ban

```bash
chmod +x scripts/setup-security.sh
./scripts/setup-security.sh
```

### 💾 Backup Scripts

#### `backup.sh`
**Automated backup script**
- Backs up database
- Backs up volumes
- Cleans old backups
- Runs as cron job

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh --full
```

#### `backup-restore.sh`
**Backup and restore script**
- Creates platform backups
- Restores from specified backup
- Lists available backups
- Cleans old backups

```bash
# Create backup
./scripts/backup-restore.sh backup

# List backups
./scripts/backup-restore.sh list

# Restore backup
./scripts/backup-restore.sh restore /path/to/backup/file
```

### 📊 Monitoring Scripts

#### `setup-monitoring.sh`
**Monitoring setup script**
- Creates Grafana dashboards
- Updates Prometheus alert rules
- Configures log rotation
- Installs monitoring services

```bash
chmod +x scripts/setup-monitoring.sh
./scripts/setup-monitoring.sh
```

#### `monitor.sh`
**System monitoring script**
- Displays system metrics
- Shows service status
- Monitors resource usage
- Alerts on issues

```bash
chmod +x scripts/monitor.sh
./scripts/monitor.sh
```

### 👤 User Management Scripts

#### `create-admin-user.js`
**Admin user creation script**
- Creates default admin user
- Cleans old admin users
- Creates tenant

```bash
cd /opt/fulexo/apps/api
sudo -u fulexo node /opt/fulexo/scripts/create-admin-user.js
```

## 🔧 Usage Examples

### New Installation
```bash
# 1. Clone repository
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo

# 2. Quick installation
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

### Update Existing Installation
```bash
# 1. Update platform
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh

# 2. Health check
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Troubleshooting
```bash
# 1. Fix common issues
chmod +x scripts/fix-common-issues.sh
./scripts/fix-common-issues.sh

# 2. Health check
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Backup/Restore
```bash
# 1. Create backup
chmod +x scripts/backup.sh
./scripts/backup.sh --full

# 2. List backups
./scripts/backup-restore.sh list

# 3. Restore if needed
./scripts/backup-restore.sh restore /path/to/backup/file
```

## 📋 Automated Tasks

Scripts automatically create these cron jobs:

```bash
# Health check (every 10 minutes)
*/10 * * * * root /opt/fulexo/scripts/health-check.sh

# Backup (daily at 2:00 AM)
0 2 * * * fulexo /opt/fulexo/scripts/backup.sh

# Build cleanup (every Sunday at 3:00 AM)
0 3 * * 0 root /opt/fulexo/scripts/cleanup-build.sh
```

## 🐛 Troubleshooting

### Script Not Working
```bash
# Give execute permission
chmod +x scripts/script-name.sh

# Run as root
sudo ./scripts/script-name.sh
```

### Permission Error
```bash
# Fix file ownership
sudo chown -R fulexo:fulexo /opt/fulexo

# Fix permissions
sudo chmod -R 755 /opt/fulexo
```

### Environment File Not Found
```bash
# Check environment file
ls -la /etc/fulexo/fulexo.env

# Copy if exists
sudo cp /opt/fulexo/compose/.env /etc/fulexo/fulexo.env
```

## 📊 Script Status

### ✅ Working Scripts
- `quick-install.sh` - Complete installation
- `health-check.sh` - System health monitoring
- `backup.sh` - Automated backups
- `update-platform.sh` - Platform updates
- `fix-common-issues.sh` - Issue resolution

### 🔧 Maintenance Scripts
- `clear-cache.sh` - Cache management
- `cleanup-build.sh` - Build cleanup
- `migrate-database.sh` - Database migrations
- `monitor.sh` - System monitoring

### 🚀 Deployment Scripts
- `deploy.sh` - Production deployment
- `rollback.sh` - Rollback procedures
- `setup-production.sh` - Production setup

## 📞 Support

### Log Files
```bash
# Systemd logs
journalctl -u fulexo -f

# Docker logs
docker logs -f compose-api-1

# Script logs
tail -f /var/log/fulexo-alerts.log
```

### Debug Mode
```bash
# Run in debug mode
bash -x scripts/script-name.sh

# Verbose output
scripts/script-name.sh -v
```

---

**🎊 All scripts are ready to use!**