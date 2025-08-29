# 🚀 Fulexo Platform - DigitalOcean Kurulum Rehberi

Bu rehber, Fulexo platformunu DigitalOcean sunucunuzda sıfırdan kurmanız için gereken tüm adımları detaylıca açıklar.

## 📋 Ön Gereksinimler

### DigitalOcean Droplet Özellikleri
- **İşletim Sistemi**: Ubuntu 22.04 LTS (önerilen)
- **RAM**: Minimum 4GB, önerilen 8GB
- **CPU**: Minimum 2 vCPU, önerilen 4 vCPU  
- **Disk**: Minimum 50GB SSD
- **Bölge**: Hedef kitlenize en yakın bölge (örn: Frankfurt, Amsterdam)

### Domain Gereksinimleri
İki adet subdomain'e ihtiyacınız var:
- `api.yourdomain.com` - API servisi için
- `panel.yourdomain.com` - Web arayüzü için

## 🔧 Adım Adım Kurulum

### 1. DigitalOcean Droplet Oluşturma

1. DigitalOcean paneline giriş yapın
2. **Create** → **Droplets** seçin
3. Aşağıdaki ayarları yapın:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Basic veya Regular (min $24/ay - 4GB RAM)
   - **Region**: Frankfurt veya Amsterdam (Türkiye'ye yakın)
   - **Additional Options**: 
     - ✅ Monitoring
     - ✅ IPv6
   - **Authentication**: SSH keys (güvenlik için önerilen)
   - **Hostname**: fulexo-prod
4. **Create Droplet** butonuna tıklayın
5. Droplet IP adresini not edin

### 2. DNS Ayarları

Domain sağlayıcınızın panelinden aşağıdaki DNS kayıtlarını ekleyin:

```
Tip: A Record
Name: api
Value: [DROPLET_IP_ADRESI]
TTL: 300

Tip: A Record  
Name: panel
Value: [DROPLET_IP_ADRESI]
TTL: 300
```

**Önemli**: DNS yayılması 5-30 dakika sürebilir. Devam etmeden önce bekleyin.

### 3. Droplet'e Bağlanma

```bash
# SSH ile bağlanın (IP adresinizi kullanın)
ssh root@[DROPLET_IP_ADRESI]
```

### 4. Otomatik Kurulum

Proje hazır kurulum script'i içeriyor. Bu script tüm kurulumu otomatik yapar:

```bash
# Proje deposunu klonlayın
git clone https://github.com/yourusername/panel.git /opt/fulexo
cd /opt/fulexo

# Kurulum script'ini çalıştırın
chmod +x scripts/setup-droplet.sh
./scripts/setup-droplet.sh
```

**Script ne yapar:**
- ✅ Sistem paketlerini günceller
- ✅ Docker ve Docker Compose kurar  
- ✅ Node.js 20 kurar
- ✅ Güvenlik ayarlarını yapar (UFW firewall, fail2ban)
- ✅ Uygulama kullanıcısı oluşturur
- ✅ Environment dosyasını `/etc/fulexo/fulexo.env` konumunda oluşturur
- ✅ Güvenli şifreler otomatik üretir
- ✅ Otomatik yedekleme ayarlar
- ✅ Systemd servisi oluşturur

### 5. Environment Değişkenlerini Yapılandırma

Script otomatik olarak `/etc/fulexo/fulexo.env` dosyası oluşturur ve güvenli şifreler üretir.

```bash
# Environment dosyasını düzenleyin
nano /etc/fulexo/fulexo.env
```

**Mutlaka değiştirmeniz gereken ayarlar:**

```env
# Domain ayarları (kendi domain'inizle değiştirin)
DOMAIN_API=api.yourdomain.com
DOMAIN_APP=panel.yourdomain.com

# App URL (email linkler için)
NEXT_PUBLIC_APP_URL=https://panel.yourdomain.com
```

**Diğer tüm şifreler script tarafından otomatik üretilir ve güvenlidir!**

**⚠️ ÖNEMLİ**: Environment dosyası `/etc/fulexo/fulexo.env` konumunda oluşturulur ve git'e commit edilmez. Bu sayede hassas bilgileriniz güvende kalır.

### 6. SSL Sertifikası Kurulumu

Domain ayarlarınızı yaptıktan sonra SSL sertifikalarını kurun:

```bash
cd /opt/fulexo
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

Email adresinizi girmeniz istenecek (Let's Encrypt bildirimleri için).

**Script ne yapar:**
- ✅ Let's Encrypt sertifikalarını alır
- ✅ Nginx yapılandırmasını günceller
- ✅ Otomatik yenileme ayarlar

### 7. Uygulamayı Başlatma

```bash
# Docker servilerini başlat
systemctl start fulexo

# Durum kontrolü
systemctl status fulexo

# Container'ların çalışıp çalışmadığını kontrol et
docker ps
```

### 8. Veritabanı Kurulumu

```bash
# API dizinine geç
cd /opt/fulexo/apps/api

# Veritabanı migration'larını çalıştır
sudo -u fulexo npm run prisma:migrate:deploy

# Varsayılan verileri yükle (admin kullanıcıları vs.)
sudo -u fulexo npm run prisma:seed
```

### 9. İlk Giriş ve Yapılandırma

1. Tarayıcınızda `https://panel.yourdomain.com` adresine gidin
2. Varsayılan admin hesabıyla giriş yapın:
   - **Email**: admin@example.com
   - **Şifre**: Admin123!

3. **ÖNEMLİ**: İlk girişten sonra tüm şifreleri değiştirin!

4. **Ayarlar** sayfasına gidin ve şunları yapılandırın:
   - **E-posta Ayarları**: SMTP bilgilerini girin ve test edin
   - **BaseLinker Entegrasyonu**: API anahtarınızı ekleyin
   - **Genel Ayarlar**: Şirket adı, destek e-postası vb.

## 🎯 Kurulum Sonrası Kontroller

### Servis Durumunu Kontrol Etme

```bash
# Tüm container'ları listele
docker ps

# API servisinin loglarını kontrol et
docker logs compose-api-1 -f

# Web servisinin loglarını kontrol et  
docker logs compose-web-1 -f

# Sistem kaynaklarını izle
htop
```

### Erişim URL'leri

- **Ana Uygulama**: https://panel.yourdomain.com
- **API Dokümantasyonu**: https://api.yourdomain.com/docs
- **API Health Check**: https://api.yourdomain.com/health

### Monitoring Erişimi (SSH Tüneli Gerekli)

Güvenlik nedeniyle monitoring araçları sadece localhost'tan erişilebilir:

```bash
# Local bilgisayarınızdan SSH tüneli açın
ssh -L 3002:localhost:3002 -L 9001:localhost:9001 -L 3001:localhost:3001 root@[DROPLET_IP]
```

Ardından tarayıcınızda:
- **Grafana**: http://localhost:3002 (admin/[otomatik_üretilen_şifre])
- **MinIO Console**: http://localhost:9001
- **Uptime Kuma**: http://localhost:3001

## 🔒 Güvenlik Önerileri

### 1. SSH Güvenliği
```bash
# Root login'i devre dışı bırak
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# SSH portunu değiştir (isteğe bağlı)
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# SSH servisini yeniden başlat
systemctl restart sshd
```

### 2. Monitoring Portlarını Kapat (Production)
```bash
# Monitoring portlarını sadece localhost'a kısıtla
ufw delete allow 9000:9001/tcp
ufw delete allow 3001/tcp
ufw delete allow 9093/tcp
ufw delete allow 16686/tcp
```

### 3. Düzenli Güncellemeler
```bash
# Sistem güncellemeleri (aylık)
apt update && apt upgrade -y

# Docker image güncellemeleri (haftalık)
cd /opt/fulexo/compose
docker compose pull
docker compose up -d --build
```

## 🔄 Yönetim Komutları

### Servis Yönetimi
```bash
# Başlat
systemctl start fulexo

# Durdur
systemctl stop fulexo

# Yeniden başlat
systemctl restart fulexo

# Durum kontrolü
systemctl status fulexo

# Otomatik başlatmayı kontrol et
systemctl is-enabled fulexo
```

### Veritabanı Yönetimi
```bash
# Veritabanına bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user fulexo

# Migration çalıştır
docker exec compose-api-1 npm run prisma:migrate:deploy

# Prisma Studio (SSH tüneli gerekir)
docker exec compose-api-1 npx prisma studio
```

### Yedekleme
```bash
# Manuel yedek al
/opt/fulexo/scripts/backup.sh

# Yedekleri listele
ls -la /opt/fulexo/backups/

# Otomatik yedekleme zamanını kontrol et
crontab -u fulexo -l
```

## 🐛 Sorun Giderme

### Container Başlamıyor
```bash
# Detaylı logları görüntüle
docker logs compose-api-1
docker logs compose-web-1
docker logs compose-postgres-1

# Environment değişkenlerini kontrol et
docker exec compose-api-1 env | grep DATABASE

# Container'ı yeniden başlat
docker restart compose-api-1
```

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL durumunu kontrol et
docker logs compose-postgres-1

# Veritabanına manuel bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user fulexo

# Migration durumunu kontrol et
docker exec compose-api-1 npx prisma migrate status
```

### SSL Sertifika Sorunları
```bash
# Sertifikaları kontrol et
certbot certificates

# Manuel yenileme
certbot renew --force-renewal

# Nginx config'ini test et
docker exec compose-nginx-1 nginx -t

# Nginx'i yeniden başlat
docker restart compose-nginx-1
```

### Port Erişim Sorunları
```bash
# Firewall durumunu kontrol et
ufw status

# Port dinleme durumunu kontrol et
netstat -tlnp | grep :443
netstat -tlnp | grep :80

# DNS çözümlemeyi test et
nslookup api.yourdomain.com
nslookup panel.yourdomain.com
```

## 📊 Performans Optimizasyonu

### PostgreSQL Tuning (8GB RAM için)
```bash
# PostgreSQL config düzenle
docker exec -it compose-postgres-1 bash
vi /var/lib/postgresql/data/postgresql.conf

# Önerilen ayarlar:
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 16MB
max_connections = 200
```

### Docker Resource Limits
`compose/docker-compose.yml` dosyasında resource limit'leri ayarlayın:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
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
docker compose build --no-cache
docker compose up -d

# Migration'ları çalıştır (gerekirse)
docker exec compose-api-1 npm run prisma:migrate:deploy
```

## 🆘 Acil Durum Komutları

### Tüm Servisleri Yeniden Başlat
```bash
systemctl restart fulexo
```

### Logları Canlı İzle
```bash
# Tüm servisler
docker compose -f /opt/fulexo/compose/docker-compose.yml logs -f

# Sadece API
docker logs compose-api-1 -f --tail 100

# Sadece Web
docker logs compose-web-1 -f --tail 100
```

### Disk Alanı Temizliği
```bash
# Docker temizliği
docker system prune -af

# Log temizliği
journalctl --vacuum-time=7d

# Eski yedekleri sil (30 günden eski)
find /opt/fulexo/backups/ -type f -mtime +30 -delete
```

## 📞 Destek ve Kaynaklar

### Yararlı Dosyalar
- **API Dokümantasyonu**: `https://api.yourdomain.com/docs`
- **Güvenlik Kılavuzu**: `plan/Security-Guidelines.md`
- **Performans Optimizasyonu**: `plan/Performance-Optimization.md`
- **Felaket Kurtarma Planı**: `plan/Disaster-Recovery-Plan.md`

### Varsayılan Kullanıcı Hesapları
Seed script'i çalıştırdıktan sonra şu hesaplarla giriş yapabilirsiniz:

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@example.com | Admin123! |
| Staff | staff@example.com | Staff123! |
| Customer Admin | customer.admin@example.com | Customer123! |
| Customer | customer@example.com | Customer123! |

**⚠️ ÖNEMLİ**: İlk girişten sonra tüm şifreleri mutlaka değiştirin!

### Monitoring Dashboard'ları
- **Sistem Metrikleri**: Grafana'da önceden yapılandırılmış dashboard'lar
- **API Performansı**: Prometheus metrikleri
- **Log Analizi**: Loki ile merkezi log toplama
- **Uptime Monitoring**: Uptime Kuma ile servis izleme

## ✅ Kurulum Kontrol Listesi

- [ ] Droplet oluşturuldu ve SSH erişimi sağlandı
- [ ] DNS kayıtları eklendi ve yayılması beklendi
- [ ] `setup-droplet.sh` script'i çalıştırıldı
- [ ] Environment değişkenleri düzenlendi (domain'ler)
- [ ] SSL sertifikaları kuruldu
- [ ] Uygulama başlatıldı (`systemctl start fulexo`)
- [ ] Veritabanı migration'ları çalıştırıldı
- [ ] Seed data yüklendi
- [ ] İlk admin girişi yapıldı
- [ ] Şifreler değiştirildi
- [ ] BaseLinker API token'ı eklendi
- [ ] Email ayarları yapılandırıldı
- [ ] Monitoring portları güvenlik için kısıtlandı

## 🎉 Kurulum Tamamlandı!

Kurulum başarıyla tamamlandıktan sonra:

1. **Panel**: `https://panel.yourdomain.com` adresinden erişebilirsiniz
2. **API**: `https://api.yourdomain.com/docs` adresinden API dokümantasyonunu görüntüleyebilirsiniz
3. **Monitoring**: SSH tüneli ile monitoring araçlarına erişebilirsiniz

**Destek için**: Sorun yaşarsanız log dosyalarını kontrol edin ve GitHub issues bölümünde arayın.

---

**Hazırlayan**: Fulexo Development Team  
**Versiyon**: 1.0.0  
**Son Güncelleme**: Ocak 2025
