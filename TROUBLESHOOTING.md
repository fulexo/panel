# 🐛 Troubleshooting Guide

## 🚨 Common Issues

### Database Connection Failed
```bash
# Check PostgreSQL status
docker logs compose-postgres-1

# Test database connection
docker compose exec postgres psql -U postgres -d fulexo -c "SELECT 1;"

# Check database URL
echo $DATABASE_URL

# Restart database
docker compose restart postgres
```

### API Service Not Working
```bash
# Check API logs
docker logs compose-api-1

# Check API health
curl http://localhost:3001/health

# Restart API service
docker compose restart api

# Check environment variables
docker compose exec api env | grep -E "(DATABASE|JWT|REDIS)"
```

### Web Interface Not Loading
```bash
# Check web service logs
docker logs compose-web-1

# Check port conflicts
lsof -i :3000

# Test web service
curl http://localhost:3000

# Restart web service
docker compose restart web
```

### WooCommerce Sync Issues
```bash
# Check worker logs
docker logs compose-worker-1 | grep sync

# Test WooCommerce connection
curl -X POST http://localhost:3001/stores/test-connection

# Check sync status
curl http://localhost:3001/stores/sync-status

# Restart worker
docker compose restart worker
```

### Authentication Problems
```bash
# Check JWT configuration
docker compose exec api node -e "console.log(process.env.JWT_SECRET)"

# Check auth logs
docker logs compose-api-1 | grep -i "auth\|login\|2fa"

# Clear authentication cache
docker compose exec valkey redis-cli FLUSHDB

# Test authentication
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'
```

### Redis Cache Issues
```bash
# Check Redis status
docker logs compose-valkey-1

# Test Redis connection
docker compose exec valkey redis-cli ping

# Clear all cache
docker compose exec valkey redis-cli FLUSHALL

# Check Redis memory usage
docker compose exec valkey redis-cli INFO memory
```

## 🔧 Quick Fixes

### Restart All Services
```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart [service-name]

# Force restart with rebuild
docker compose up -d --force-recreate
```

### Clear Cache and Logs
```bash
# Clear Redis cache
docker compose exec valkey redis-cli FLUSHALL

# Clear Docker logs
docker system prune -f

# Clear application logs
docker compose exec api rm -rf /app/logs/*
```

### Database Maintenance
```bash
# Run database migrations
cd apps/api && npm run prisma:migrate

# Reset database (WARNING: Data loss)
cd apps/api && npm run prisma:reset

# Backup database
docker compose exec postgres pg_dump -U postgres fulexo > backup_$(date +%F).sql

# Restore database
docker compose exec -T postgres psql -U postgres fulexo < backup_file.sql
```

### Environment Issues
```bash
# Check environment variables
docker compose exec api env | grep -E "(DATABASE|JWT|REDIS|NODE_ENV)"

# Validate environment file
./scripts/validate-env.sh

# Regenerate environment
cp .env.example .env
# Edit .env with your values
```

## 🔍 Diagnostic Commands

### System Health Check
```bash
# Run comprehensive health check
./scripts/health-check.sh

# Check service status
docker compose ps

# Check resource usage
docker stats

# Check disk space
df -h
```

### Network Diagnostics
```bash
# Check port availability
netstat -tulpn | grep -E ":(3000|3001|5432|6379)"

# Test internal connectivity
docker compose exec api ping postgres
docker compose exec api ping valkey

# Check DNS resolution
docker compose exec api nslookup postgres
```

### Log Analysis
```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f [service-name]

# Search logs for errors
docker compose logs | grep -i error

# Follow logs in real-time
docker compose logs -f --tail=100
```

## 🚨 Critical Issues

### Complete System Failure
```bash
# Stop all services
docker compose down

# Remove all containers and volumes
docker compose down -v --remove-orphans

# Clean Docker system
docker system prune -a -f

# Rebuild and start
docker compose up -d --build
```

### Data Corruption
```bash
# Stop services
docker compose down

# Restore from backup
./scripts/restore.sh --backup-file=backup_file.sql

# Start services
docker compose up -d
```

### Security Breach
```bash
# Immediate lockdown
docker compose down

# Change all passwords
./scripts/change-passwords.sh

# Audit logs
./scripts/security-audit.sh

# Restore from clean backup
./scripts/restore.sh --clean
```

## 📊 Performance Issues

### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services
docker compose restart

# Check for memory leaks
docker compose exec api node --inspect=0.0.0.0:9229
```

### Slow Database Queries
```bash
# Check database performance
docker compose exec postgres psql -U postgres -d fulexo -c "SELECT * FROM pg_stat_activity;"

# Analyze slow queries
docker compose exec postgres psql -U postgres -d fulexo -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### API Timeout Issues
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# Check rate limiting
docker compose exec valkey redis-cli KEYS "rl:*"

# Check connection pool
docker compose exec api node -e "console.log(process.env.DATABASE_URL)"
```

## 🔧 Maintenance Tasks

### Regular Maintenance
```bash
# Daily health check
./scripts/health-check.sh

# Weekly backup
./scripts/backup.sh --full

# Monthly log rotation
./scripts/rotate-logs.sh

# Quarterly security audit
./scripts/security-audit.sh
```

### Update Procedures
```bash
# Update application
git pull origin main
docker compose build
docker compose up -d

# Update dependencies
npm update
docker compose build --no-cache
docker compose up -d

# Update system packages
apt update && apt upgrade -y
```

## 📞 Support Escalation

### Before Contacting Support
1. **Check logs** for error messages
2. **Run health check** script
3. **Document the issue** with steps to reproduce
4. **Gather system information** (OS, Docker version, etc.)

### Information to Provide
- Error messages and logs
- Steps to reproduce the issue
- System configuration
- Recent changes made
- Screenshots or videos if applicable

### Contact Information
- **GitHub Issues**: https://github.com/fulexo/panel/issues
- **Email Support**: support@fulexo.com
- **Emergency**: +1-XXX-XXX-XXXX

## 📋 Troubleshooting Checklist

### Basic Checks
- [ ] All services are running (`docker compose ps`)
- [ ] No port conflicts (`netstat -tulpn`)
- [ ] Sufficient disk space (`df -h`)
- [ ] Memory usage is normal (`docker stats`)
- [ ] Network connectivity is working

### Application Checks
- [ ] Database connection is working
- [ ] Redis cache is accessible
- [ ] API endpoints are responding
- [ ] Web interface is loading
- [ ] Authentication is working

### Advanced Checks
- [ ] Logs show no critical errors
- [ ] Performance metrics are normal
- [ ] Security headers are present
- [ ] SSL certificates are valid
- [ ] Backup system is working

---

**Last Updated**: 2024 | **Version**: 1.0.0 | **Status**: Production Ready