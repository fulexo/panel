# Fulexo Platform - DigitalOcean Kurulum Dokümantasyonu

## 🚀 Genel Bakış

Fulexo, BaseLinker entegrasyonları için geliştirilmiş, multi-tenant destekli, gelişmiş güvenlik özelliklerine sahip self-hosted bir platformdur.

### Proje Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                │
│                    SSL/TLS, Rate Limiting, WAF               │
└─────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐       ┌────────▼────────┐      ┌────────▼────────┐
│   Next.js Web  │       │   NestJS API    │      │   BullMQ Worker │
│   (Frontend)   │       │    (Backend)    │      │     (Jobs)      │
└────────────────┘       └─────────────────┘      └─────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
    ┌──────────────┬──────────────┼──────────────┬──────────────┐
    │              │              │              │              │
┌───▼────┐   ┌────▼────┐   ┌─────▼────┐   ┌────▼────┐   ┌─────▼────┐
│Postgres│   │ Valkey  │   │  MinIO   │   │Prometheus│   │  Loki    │
│  (DB)  │   │ (Cache) │   │(Storage) │   │(Metrics) │   │  (Logs)  │
└────────┘   └─────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Ana Bileşenler

1. **API (NestJS)**: Backend servisi
2. **Web (Next.js)**: Frontend arayüzü
3. **Worker**: Arka plan işleri için BullMQ
4. **PostgreSQL**: Ana veritabanı
5. **Valkey (Redis fork)**: Cache ve queue yönetimi
6. **MinIO**: S3 uyumlu dosya depolama
7. **Monitoring Stack**: Prometheus, Grafana, Loki, Jaeger
8. **Nginx**: Reverse proxy ve SSL yönetimi

## 📋 Sistem Gereksinimleri

### DigitalOcean Droplet Özellikleri
- **İşletim Sistemi**: Ubuntu 22.04 LTS
- **RAM**: Minimum 4GB, önerilen 8GB
- **CPU**: Minimum 2 vCPU, önerilen 4 vCPU
- **Disk**: Minimum 40GB SSD
- **Bölge**: Hedef kitlenize en yakın bölge

### Yazılım Gereksinimleri
- Docker Engine 26+
- Docker Compose v2
- Node.js 20+ (development için)
- Git

## 🔧 Adım Adım Kurulum

### 1. DigitalOcean Droplet Oluşturma

1. DigitalOcean paneline giriş yapın
2. "Create" → "Droplets" seçin
3. Aşağıdaki ayarları yapın:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Regular (min $24/mo - 4GB RAM)
   - **Region**: Frankfurt veya Amsterdam (Türkiye'ye yakın)
   - **Additional Options**: 
     - ✅ Monitoring
     - ✅ IPv6
   - **Authentication**: SSH keys (güvenlik için önerilen)
   - **Hostname**: fulexo-prod

### 2. DNS Ayarları

Domain sağlayıcınızdan aşağıdaki A kayıtlarını ekleyin:

```
api.yourdomain.com    →  Droplet_IP_Adresi
panel.yourdomain.com  →  Droplet_IP_Adresi
```

DNS yayılması için 5-30 dakika bekleyin.

### 3. Droplet'e Bağlanma

```bash
ssh root@droplet_ip_adresi
```

### 4. Otomatik Kurulum Script'ini Çalıştırma

Proje hazır kurulum script'i içeriyor. Bu script:
- Sistem paketlerini günceller
- Docker ve Docker Compose kurar
- Güvenlik ayarlarını yapar (UFW, fail2ban)
- Kullanıcı ve dizinleri oluşturur
- Otomatik yedekleme ayarlar

```bash
# Script'i indirin ve çalıştırın
wget https://raw.githubusercontent.com/yourusername/fulexo/main/scripts/setup-droplet.sh
chmod +x setup-droplet.sh
./setup-droplet.sh
```

### 5. Proje Dosyalarını Yükleme

Script otomatik olarak GitHub'dan klonlar. Manuel yüklemek isterseniz:

```bash
cd /opt/fulexo
git clone https://github.com/yourusername/fulexo.git .
chown -R fulexo:fulexo /opt/fulexo
```

### 6. Environment Değişkenlerini Yapılandırma

Script otomatik olarak `/etc/fulexo/fulexo.env` dosyası oluşturur ve güvenli şifreler üretir.

```bash
# Env dosyasını düzenleyin
nano /etc/fulexo/fulexo.env
```

Önemli değişkenler:

```env
# Domain ayarları
DOMAIN_API=api.yourdomain.com
DOMAIN_APP=panel.yourdomain.com

# BaseLinker API Token (BaseLinker panelinden alın)
BASELINKER_TOKEN=your_baselinker_api_token

# Email ayarları (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Diğer şifreler otomatik üretilir
```

### 7. Veritabanı Kurulumu

```bash
cd /opt/fulexo/apps/api

# Bağımlılıkları yükle
npm install

# Prisma client oluştur
npm run prisma:generate

# Veritabanı migration'larını çalıştır
npm run prisma:migrate:deploy

# Seed data yükle (varsayılan kullanıcılar)
npm run prisma:seed
```

### 8. SSL Sertifikası Kurulumu

Proje SSL kurulum script'i içeriyor:

```bash
cd /opt/fulexo
./scripts/setup-ssl-fulexo.sh
```

Email adresinizi girin ve script otomatik olarak:
- Let's Encrypt sertifikalarını alır
- Nginx yapılandırmasını günceller
- Otomatik yenileme ayarlar

### 9. Servisleri Başlatma

```bash
# Systemd servisi ile başlat
systemctl start fulexo

# Durumu kontrol et
systemctl status fulexo

# Otomatik başlatmayı etkinleştir
systemctl enable fulexo
```

### 10. Servisleri Kontrol Etme

```bash
# Tüm container'ları listele
docker ps

# Logları kontrol et
docker logs compose-api-1 -f
docker logs compose-web-1 -f

# Sistem kaynaklarını izle
htop
```

## 🔒 Güvenlik Ayarları

### Firewall (UFW)
Script otomatik olarak UFW'yi yapılandırır:
- SSH (22)
- HTTP (80)
- HTTPS (443)
- MinIO (9000-9001) - Production'da kısıtlanmalı
- Monitoring portları - Production'da kısıtlanmalı

### Fail2ban
SSH brute force saldırılarına karşı otomatik olarak kurulur.

### SSH Güvenliği

```bash
# Root login'i devre dışı bırak
nano /etc/ssh/sshd_config
# PermitRootLogin no

# SSH servisini yeniden başlat
systemctl restart sshd
```

## 🎯 Kurulum Sonrası

### 1. İlk Giriş

Varsayılan kullanıcılar (seed script'ten):

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@example.com | Admin123! |
| Staff | staff@example.com | Staff123! |
| Customer Admin | customer.admin@example.com | Customer123! |
| Customer | customer@example.com | Customer123! |

**ÖNEMLİ**: İlk girişten sonra tüm şifreleri değiştirin!

### 2. BaseLinker Entegrasyonu

1. Admin paneline giriş yapın
2. Settings → Integrations → BaseLinker
3. API Token'ı girin
4. Test butonuna basarak bağlantıyı kontrol edin
5. Sync ayarlarını yapılandırın

### 3. Monitoring Erişimi

- **Grafana**: http://droplet-ip:3002 (admin/GrafanaAdmin2025!)
- **MinIO Console**: http://droplet-ip:9001
- **Uptime Kuma**: http://droplet-ip:3001
- **Jaeger**: http://droplet-ip:16686

Production'da bu portları kapatın ve SSH tüneli kullanın:

```bash
# SSH tüneli ile Grafana'ya erişim
ssh -L 3002:localhost:3002 fulexo@droplet-ip
```

### 4. Yedekleme Kontrolü

Script otomatik yedekleme ayarlar (günlük 02:00):

```bash
# Manuel yedekleme
/opt/fulexo/scripts/backup.sh

# Yedekleri kontrol et
ls -la /opt/fulexo/backups/

# Cron job'ları kontrol et
crontab -u fulexo -l
```

## 📊 Performans Optimizasyonu

### 1. PostgreSQL Tuning

```bash
# PostgreSQL yapılandırması
docker exec -it compose-postgres-1 bash
vi /var/lib/postgresql/data/postgresql.conf

# Önerilen ayarlar (4GB RAM için):
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 10MB
```

### 2. Docker Resource Limits

`docker-compose.yml` dosyasında resource limit'leri ayarlayın:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### 3. Nginx Optimizasyonu

Nginx config'de worker process sayısını CPU sayısına göre ayarlayın.

## 🐛 Sorun Giderme

### Container başlamıyor

```bash
# Logları kontrol et
docker logs compose-api-1

# Environment değişkenlerini kontrol et
docker exec compose-api-1 env | grep DATABASE

# Container'ı yeniden başlat
docker restart compose-api-1
```

### Veritabanı bağlantı hatası

```bash
# PostgreSQL durumunu kontrol et
docker logs compose-postgres-1

# Veritabanına manuel bağlan
docker exec -it compose-postgres-1 psql -U fulexo -d fulexo
```

### SSL sertifika sorunları

```bash
# Sertifikaları kontrol et
certbot certificates

# Manuel yenileme
certbot renew --force-renewal

# Nginx config'i kontrol et
nginx -t
```

## 🔄 Güncelleme Prosedürü

```bash
cd /opt/fulexo

# Yedek al
./scripts/backup.sh

# Güncellemeleri çek
sudo -u fulexo git pull

# Container'ları yeniden oluştur
cd compose
docker compose build
docker compose up -d

# Migration'ları çalıştır
docker exec compose-api-1 npm run prisma:migrate:deploy
```

## 📞 Destek ve Kaynaklar

- Proje dokümantasyonu: `/workspace/docs/`
- API dokümantasyonu: https://api.yourdomain.com/docs
- Güvenlik kılavuzu: `/workspace/plan/Security-Guidelines.md`
- Performans optimizasyonu: `/workspace/plan/Performance-Optimization.md`

## ⚠️ Önemli Notlar

1. **Güvenlik**: Production'da monitoring portlarını kapatın
2. **Yedekleme**: Düzenli yedekleme kontrolü yapın
3. **Monitoring**: Grafana dashboard'ları kurun
4. **Updates**: Sistem ve Docker güncellemelerini takip edin
5. **Logs**: Log rotation'ın çalıştığından emin olun

---

Bu dokümantasyon, Fulexo platformunun DigitalOcean üzerinde başarılı bir şekilde kurulması için gereken tüm adımları içermektedir. Kurulum sırasında herhangi bir sorunla karşılaşırsanız, log dosyalarını kontrol edin ve gerekirse destek alın.