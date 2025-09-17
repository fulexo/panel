# 🚀 Fulexo Production Management Guide

Bu dokümantasyon, Fulexo projesinin production ortamında kolayca güncellenmesi ve yönetilmesi için gerekli tüm bilgileri içerir.

## 📋 Hızlı Başlangıç

### İlk Kurulum
```bash
# Production ortamını kur
./scripts/setup-production.sh

# Environment dosyasını düzenle
nano .env

# Servisleri başlat
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 Güncelleme Komutları

### 1. Hızlı Güncelleme (Önerilen)
```bash
# Küçük değişiklikler için en hızlı yöntem
./scripts/quick-update.sh

# Backup olmadan güncelleme
./scripts/quick-update.sh --no-backup
```

### 2. Tam Güncelleme
```bash
# Tam backup ile güncelleme
./scripts/master-update.sh

# Maintenance modu ile güncelleme
./scripts/master-update.sh --maintenance

# Backup olmadan güncelleme
./scripts/master-update.sh --no-backup
```

### 3. Hot Reload (Servis Bazlı)
```bash
# Sadece API'yi güncelle
./scripts/hot-reload.sh --api

# Sadece Web'i güncelle
./scripts/hot-reload.sh --web

# Sadece Worker'ı güncelle
./scripts/hot-reload.sh --worker

# Tüm servisleri güncelle
./scripts/hot-reload.sh --all
```

## 🧹 Cache Temizleme

```bash
# Tüm cache'leri temizle
./scripts/clear-cache.sh --all

# Sadece frontend cache'ini temizle
./scripts/clear-cache.sh --frontend

# Sadece backend cache'ini temizle
./scripts/clear-cache.sh --backend

# Sadece database cache'ini temizle
./scripts/clear-cache.sh --database
```

## 💾 Backup ve Geri Yükleme

```bash
# Tam backup oluştur
./scripts/backup.sh --full

# Sadece database backup'ı
./scripts/backup.sh --database-only

# Sadece kod backup'ı
./scripts/backup.sh --code-only

# Mevcut backup'ları listele
./scripts/rollback.sh

# Belirli bir backup'a geri dön
./scripts/rollback.sh fulexo_backup_20241201_143022
```

## 🔍 Monitoring ve Sağlık Kontrolü

```bash
# Tek seferlik sağlık kontrolü
./scripts/health-check.sh

# Detaylı sağlık kontrolü
./scripts/health-check.sh --verbose

# Sürekli monitoring
./scripts/monitor.sh --continuous

# Email alert ile monitoring
./scripts/monitor.sh --continuous --alert-email=admin@example.com
```

## 🐳 Docker Komutları

### Servis Yönetimi
```bash
# Servisleri başlat
docker-compose -f docker-compose.prod.yml up -d

# Servisleri durdur
docker-compose -f docker-compose.prod.yml down

# Servisleri yeniden başlat
docker-compose -f docker-compose.prod.yml restart

# Belirli bir servisi yeniden başlat
docker-compose -f docker-compose.prod.yml restart api
```

### Log Görüntüleme
```bash
# Tüm servislerin logları
docker-compose -f docker-compose.prod.yml logs -f

# Belirli bir servisin logları
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f worker
```

### Container Yönetimi
```bash
# Çalışan container'ları listele
docker-compose -f docker-compose.prod.yml ps

# Container durumunu kontrol et
docker ps

# Container'a bağlan
docker exec -it fulexo-api bash
docker exec -it fulexo-web bash
```

## 🔧 Sorun Giderme

### Servis Çalışmıyor
```bash
# Servis durumunu kontrol et
docker-compose -f docker-compose.prod.yml ps

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs [service-name]

# Servisi yeniden başlat
docker-compose -f docker-compose.prod.yml restart [service-name]
```

### Database Sorunları
```bash
# Database'e bağlan
docker exec -it fulexo-postgres psql -U postgres -d fulexo

# Database'i sıfırla
docker exec -it fulexo-api npx prisma db push --force-reset

# Migration çalıştır
docker exec -it fulexo-api npx prisma migrate deploy
```

### Cache Sorunları
```bash
# Redis cache'ini temizle
docker exec -it fulexo-redis redis-cli FLUSHALL

# Tüm cache'leri temizle
./scripts/clear-cache.sh --all
```

### Build Sorunları
```bash
# No-cache ile yeniden build et
docker-compose -f docker-compose.prod.yml build --no-cache

# Tüm cache'leri temizle ve yeniden build et
./scripts/clear-cache.sh --all
docker-compose -f docker-compose.prod.yml build --no-cache
```

## 📊 Performans Optimizasyonu

### Docker Optimizasyonu
```bash
# Kullanılmayan image'ları temizle
docker image prune -f

# Kullanılmayan volume'ları temizle
docker volume prune -f

# Tüm Docker cache'ini temizle
docker system prune -f
```

### Sistem Optimizasyonu
```bash
# Disk kullanımını kontrol et
df -h

# Memory kullanımını kontrol et
free -h

# CPU kullanımını kontrol et
top
```

## 🔐 Güvenlik

### Environment Variables
```bash
# .env dosyasını güvenli hale getir
chmod 600 .env

# Backup dosyalarını güvenli hale getir
chmod 700 /var/backups/fulexo
```

### SSL Sertifikası
```bash
# Let's Encrypt ile SSL kurulumu
sudo certbot --nginx -d yourdomain.com

# Sertifika yenileme
sudo certbot renew
```

## 📈 Monitoring Endpoints

- **API Health**: http://localhost:3000/api/health
- **Web App**: http://localhost:3001
- **Worker Health**: http://localhost:3002/health
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 🚨 Acil Durum Prosedürleri

### Servis Tamamen Çöktü
```bash
# Hızlı geri yükleme
./scripts/rollback.sh

# Servisleri yeniden başlat
docker-compose -f docker-compose.prod.yml up -d
```

### Database Kaybı
```bash
# Son backup'tan geri yükle
./scripts/rollback.sh [backup-name]

# Database'i yeniden oluştur
docker exec -it fulexo-api npx prisma db push
```

### Disk Dolu
```bash
# Eski logları temizle
sudo find /var/log -name "*.log" -mtime +7 -delete

# Docker cache'ini temizle
docker system prune -a -f

# Eski backup'ları temizle
find /var/backups/fulexo -mtime +30 -delete
```

## 📝 Log Dosyaları

- **Deployment Logs**: `/var/log/fulexo/deploy.log`
- **Application Logs**: `./logs/`
- **Docker Logs**: `docker-compose -f docker-compose.prod.yml logs`

## 🔄 Otomatik Güncelleme (Cron)

```bash
# Günlük backup
0 2 * * * /path/to/fulexo/scripts/backup.sh --full

# Haftalık cache temizleme
0 3 * * 0 /path/to/fulexo/scripts/clear-cache.sh --all

# Saatlik monitoring
0 * * * * /path/to/fulexo/scripts/monitor.sh
```

## 📞 Destek

Sorun yaşadığınızda:

1. **Logları kontrol edin**: `docker-compose -f docker-compose.prod.yml logs`
2. **Sağlık kontrolü yapın**: `./scripts/health-check.sh`
3. **Backup'tan geri yükleyin**: `./scripts/rollback.sh`
4. **Cache'leri temizleyin**: `./scripts/clear-cache.sh --all`

---

**Not**: Bu komutları production ortamında çalıştırmadan önce mutlaka test ortamında deneyin!