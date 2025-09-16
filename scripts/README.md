# Fulexo Platform - Script'ler

Bu dizin, Fulexo Platform'un kurulumu, yönetimi ve bakımı için gerekli script'leri içerir.

## 📋 Script Listesi

### 🚀 Kurulum Script'leri

#### `quick-install.sh`
**Hızlı kurulum script'i (Önerilen)**
- Tüm kurulumu tek seferde yapar
- Domain bilgilerini sorar
- SSL kurulumu dahil
- Veritabanı setup'ı dahil
- Admin kullanıcısı oluşturma dahil

```bash
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

#### `install-from-scratch.sh`
**Temel kurulum script'i**
- Sunucuyu sıfırdan kurar
- Docker, Node.js, gerekli paketleri kurar
- Environment dosyası oluşturur
- Systemd servisi oluşturur

```bash
chmod +x scripts/install-from-scratch.sh
./scripts/install-from-scratch.sh
```

#### `complete-setup.sh`
**Tam kurulum script'i**
- SSL sertifikalarını kurar
- Veritabanını kurar
- Admin kullanıcısını oluşturur
- Health check yapar

```bash
chmod +x scripts/complete-setup.sh
./scripts/complete-setup.sh
```

### 🔧 Yönetim Script'leri

#### `health-check.sh`
**Platform sağlık kontrolü**
- Servis durumunu kontrol eder
- Container durumunu kontrol eder
- Database bağlantısını kontrol eder
- API/Web servislerini test eder
- SSL sertifikalarını kontrol eder

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

#### `quick-start.sh`
**Hızlı başlangıç script'i**
- Kurulum sonrası hızlı başlangıç
- Servisleri kontrol eder ve başlatır
- Platform durumunu gösterir

```bash
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

#### `update-platform.sh`
**Platform güncelleme script'i**
- Repository'yi günceller
- Dependencies'leri günceller
- Database migration'ları çalıştırır
- Servisleri yeniden başlatır

```bash
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh
```

#### `fix-common-issues.sh`
**Yaygın sorunları düzeltme script'i**
- Docker servisini kontrol eder
- Disk alanını temizler
- Container'ları yeniden başlatır
- Database/Redis bağlantısını düzeltir
- Nginx yapılandırmasını kontrol eder

```bash
chmod +x scripts/fix-common-issues.sh
./scripts/fix-common-issues.sh
```

### 🔐 Güvenlik Script'leri

#### `setup-ssl-fulexo.sh`
**SSL sertifika kurulum script'i**
- Let's Encrypt sertifikalarını kurar
- Otomatik yenileme yapılandırır
- Nginx yapılandırmasını günceller

```bash
chmod +x scripts/setup-ssl-fulexo.sh
./scripts/setup-ssl-fulexo.sh
```

### 💾 Backup Script'leri

#### `backup-restore.sh`
**Backup ve restore script'i**
- Platform verilerini yedekler
- Belirtilen yedekten geri yükler
- Yedekleri listeler
- Eski yedekleri temizler

```bash
# Backup oluştur
chmod +x scripts/backup-restore.sh
./scripts/backup-restore.sh backup

# Yedekleri listele
./scripts/backup-restore.sh list

# Geri yükle
./scripts/backup-restore.sh restore /opt/fulexo/backups/db_20240115_143022.sql.gz

# Eski yedekleri temizle
./scripts/backup-restore.sh cleanup
```

#### `backup.sh`
**Otomatik backup script'i**
- Database'i yedekler
- Volume'ları yedekler
- Eski yedekleri temizler
- Cron job olarak çalışır

### 📊 Monitoring Script'leri

#### `setup-monitoring.sh`
**Monitoring kurulum script'i**
- Grafana dashboard'larını oluşturur
- Prometheus alert kurallarını günceller
- Log rotation yapılandırır
- Monitoring script'leri oluşturur

```bash
chmod +x scripts/setup-monitoring.sh
./scripts/setup-monitoring.sh
```

#### `system-metrics.sh`
**Sistem metrikleri toplama script'i**
- CPU kullanımını toplar
- Memory kullanımını toplar
- Disk kullanımını toplar
- Load average'ı toplar

#### `send-alert.sh`
**Alert gönderme script'i**
- Email alert'leri gönderir
- Webhook alert'leri gönderir
- Log dosyasına yazar

### 👤 Kullanıcı Script'leri

#### `create-admin-user.js`
**Admin kullanıcısı oluşturma script'i**
- Varsayılan admin kullanıcısını oluşturur
- Eski admin kullanıcısını temizler
- Tenant oluşturur

```bash
cd /opt/fulexo/apps/api
sudo -u fulexo node /opt/fulexo/scripts/create-admin-user.js
```

## 🔧 Kullanım Örnekleri

### Yeni Kurulum
```bash
# 1. Repository'yi klonla
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo

# 2. Hızlı kurulum
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

### Mevcut Kurulumu Güncelleme
```bash
# 1. Platform'u güncelle
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh

# 2. Health check yap
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Sorun Giderme
```bash
# 1. Yaygın sorunları düzelt
chmod +x scripts/fix-common-issues.sh
./scripts/fix-common-issues.sh

# 2. Health check yap
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Backup/Restore
```bash
# 1. Backup oluştur
chmod +x scripts/backup-restore.sh
./scripts/backup-restore.sh backup

# 2. Yedekleri listele
./scripts/backup-restore.sh list

# 3. Geri yükle (gerekirse)
./scripts/backup-restore.sh restore /path/to/backup/file
```

## 📋 Cron Job'ları

Script'ler otomatik olarak şu cron job'ları oluşturur:

```bash
# System metrics (her 5 dakikada)
*/5 * * * * root /opt/fulexo/scripts/system-metrics.sh

# Health check (her 10 dakikada)
*/10 * * * * root /opt/fulexo/scripts/health-check.sh

# Backup (günlük saat 02:00)
0 2 * * * fulexo /opt/fulexo/scripts/backup.sh
```

## 🐛 Sorun Giderme

### Script Çalışmıyor
```bash
# Execute permission ver
chmod +x scripts/script-name.sh

# Root olarak çalıştır
sudo ./scripts/script-name.sh
```

### Permission Hatası
```bash
# Dosya sahipliğini düzelt
sudo chown -R fulexo:fulexo /opt/fulexo

# Permission'ları düzelt
sudo chmod -R 755 /opt/fulexo
```

### Environment Dosyası Bulunamıyor
```bash
# Environment dosyasını kontrol et
ls -la /etc/fulexo/fulexo.env

# Varsa kopyala
sudo cp /opt/fulexo/compose/.env /etc/fulexo/fulexo.env
```

## 📞 Destek

### Log Dosyaları
```bash
# Systemd logları
journalctl -u fulexo -f

# Docker logları
docker logs -f compose-api-1

# Script logları
tail -f /var/log/fulexo-alerts.log
```

### Debug Modu
```bash
# Debug modunda çalıştır
bash -x scripts/script-name.sh

# Verbose output
scripts/script-name.sh -v
```

---

**🎊 Tüm script'ler kullanıma hazır!**