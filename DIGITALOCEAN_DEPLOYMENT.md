# Fulexo Platform - DigitalOcean Kurulum Kılavuzu

## 🚀 Hızlı Başlangıç

Bu kılavuz, Fulexo platformunu DigitalOcean droplet'inize kurmanız için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

### DigitalOcean Droplet Özellikleri
- **Minimum:** 4GB RAM, 2 vCPU, 80GB SSD
- **Önerilen:** 8GB RAM, 4 vCPU, 160GB SSD
- **İşletim Sistemi:** Ubuntu 22.04 LTS

### Domain Gereksinimleri
- API için bir subdomain (örn: api.siteniz.com)
- Web UI için bir subdomain (örn: app.siteniz.com)
- Domain'lerin A kayıtları droplet IP'nize yönlendirilmiş olmalı

## 🛠️ Kurulum Adımları

### 1. Droplet'e Bağlanma

```bash
ssh root@DROPLET_IP_ADRESI
```

### 2. Proje Dosyalarını İndirme

```bash
# Git kurulumu
apt update && apt install -y git

# Projeyi klonlama
cd /opt
git clone https://github.com/kullaniciadi/fulexo.git
cd fulexo
```

### 3. Otomatik Kurulum Script'ini Çalıştırma

```bash
# Kurulum script'ini çalıştır
./deploy.sh
```

Bu script şunları yapacak:
- Sistem güncellemelerini yükler
- Docker ve Docker Compose'u kurar
- Node.js 20'yi yükler
- Güvenlik duvarını yapılandırır
- Gerekli dizinleri oluşturur
- Systemd servisi kurar

### 4. Environment Dosyasını Düzenleme

Script tamamlandıktan sonra, `.env` dosyasını düzenlemeniz gerekiyor:

```bash
nano /opt/fulexo/compose/.env
```

Aşağıdaki değerleri güncellleyin:

```env
# Database - Güçlü şifreler kullanın
POSTGRES_PASSWORD=güçlü_bir_şifre_buraya

# MinIO - Güvenli access/secret key'ler
S3_ACCESS_KEY=en_az_20_karakterlik_key
S3_SECRET_KEY=en_az_40_karakterlik_secret

# JWT - 256 bit (32 byte) rastgele string
JWT_SECRET=32_byte_uzunluğunda_güvenli_bir_anahtar

# Encryption - 32 byte AES-256 key
ENCRYPTION_KEY=32_byte_uzunluğunda_başka_bir_anahtar

# Domain'ler
DOMAIN_API=api.siteniz.com
DOMAIN_APP=app.siteniz.com

# Email (isteğe bağlı)
SMTP_HOST=smtp.gmail.com
SMTP_USER=email@gmail.com
SMTP_PASS=uygulama_şifresi
```

### 5. Database Kurulumu

```bash
cd /opt/fulexo/apps/api

# Bağımlılıkları yükle
npm install

# Prisma client oluştur
npm run prisma:generate

# Database migration'ları çalıştır
npm run prisma:migrate

# İlk verileri yükle
npm run prisma:seed
```

### 6. Docker Container'ları Başlatma

```bash
cd /opt/fulexo/compose
docker compose up -d

# Durumu kontrol et
docker compose ps
```

### 7. SSL Sertifikası Kurulumu

Domain'lerinizin DNS kayıtları droplet'e yönlendikten sonra:

```bash
cd /opt/fulexo
./setup-ssl.sh
```

Script size domain ve email bilgilerinizi soracak.

### 8. Gelişmiş Güvenlik Ayarları (İsteğe Bağlı)

Ek güvenlik önlemleri için:

```bash
cd /opt/fulexo
./secure-server.sh
```

⚠️ **UYARI:** Bu script SSH'ı sadece key authentication'a ayarlar. Çalıştırmadan önce SSH key'inizi eklediğinizden emin olun!

## 🔐 SSH Key Ekleme (Güvenlik Script'inden Önce)

```bash
# Yerel bilgisayarınızda (droplet'te değil)
ssh-copy-id root@DROPLET_IP

# Veya manuel olarak
mkdir -p ~/.ssh
echo "ssh-rsa AAAAB3... sizin_public_key" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 🎯 Kurulum Sonrası

### Erişim Adresleri

- **API:** https://api.siteniz.com
- **API Dokümantasyonu:** https://api.siteniz.com/docs
- **Web Uygulaması:** https://app.siteniz.com
- **Grafana:** http://DROPLET_IP:3002 (admin/GrafanaAdmin2025!)
- **MinIO Console:** http://DROPLET_IP:9001
- **Uptime Kuma:** http://DROPLET_IP:3003

### Varsayılan Kullanıcılar

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@example.com | Admin123! |
| Staff | staff@example.com | Staff123! |
| Customer Admin | customer.admin@example.com | Customer123! |
| Customer | customer@example.com | Customer123! |

⚠️ **ÖNEMLİ:** İlk girişten sonra tüm şifreleri değiştirin!

## 🔧 Bakım ve Yönetim

### Log Kontrolü

```bash
# Tüm servislerin logları
docker compose logs -f

# Belirli bir servisin logu
docker compose logs -f api
docker compose logs -f web
```

### Yedekleme

```bash
# Database yedeği
docker compose exec postgres pg_dump -U fulexo fulexo > backup_$(date +%F).sql

# MinIO yedeği
docker compose exec minio mc mirror /data /backup/minio
```

### Servis Yönetimi

```bash
# Servisleri durdur
systemctl stop fulexo

# Servisleri başlat
systemctl start fulexo

# Servisleri yeniden başlat
systemctl restart fulexo

# Servis durumu
systemctl status fulexo
```

### Güncelleme

```bash
cd /opt/fulexo
git pull origin main
docker compose down
docker compose build
docker compose up -d
```

## 🚨 Sorun Giderme

### Container'lar başlamıyor

```bash
# Log kontrolü
docker compose logs

# Port çakışması kontrolü
netstat -tulpn | grep -E '(80|443|3000|3001)'
```

### Database bağlantı hatası

```bash
# PostgreSQL durumu
docker compose logs postgres

# Bağlantı testi
docker compose exec postgres psql -U fulexo -d fulexo -c "SELECT 1"
```

### SSL sertifika sorunları

```bash
# Sertifika durumu
certbot certificates

# Manuel yenileme
certbot renew --force-renewal
```

## 📞 Destek

Sorun yaşarsanız:
1. `/var/log/fulexo-*.log` dosyalarını kontrol edin
2. `docker compose logs` ile hata mesajlarını inceleyin
3. GitHub Issues'da sorun bildirin

## 🔒 Güvenlik Önerileri

1. **Düzenli Güncellemeler:** Sistemi ve container'ları düzenli güncelleyin
2. **Güçlü Şifreler:** Tüm servislerde güçlü, benzersiz şifreler kullanın
3. **Firewall:** Sadece gerekli portları açık tutun
4. **Backup:** Düzenli yedekleme yapın
5. **Monitoring:** Grafana dashboard'larını takip edin
6. **2FA:** Admin kullanıcılar için 2FA'yı aktifleştirin

---

**Başarılı bir kurulum dileriz!** 🎉