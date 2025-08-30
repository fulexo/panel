# Fulexo Server Configuration Backup

Bu klasör sunucudaki kritik konfigürasyon ve backup dosyalarını içerir.

## Dosya Yapısı

### Konfigürasyon Dosyaları
- `etc-fulexo/` - Environment variables
- `nginx/` - Nginx konfigürasyonları
- `ssl-certs/` - SSL sertifika bilgileri
- `docker-compose-active.yml` - Aktif Docker Compose konfigürasyonu

### Backup Dosyaları
- `databases/` - PostgreSQL database backupları
- `cron-jobs/` - Cron job konfigürasyonları

### Sistem Bilgileri
- `system-info.txt` - Sistem özellikleri, disk, RAM
- `network-config.txt` - Network ayarları
- `docker-*.txt` - Docker container/volume/image listesi
- `*-services.txt` - Çalışan ve hatalı servisler
- `installed-packages.txt` - Yüklü paketler

## Güncellenme
Bu dosyalar otomatik olarak güncellenip Git'e commit edilir.

Güncellenme tarihi: $(date)
