# DigitalOcean Deployment Guide for Fulexo Platform

Bu kılavuz, Fulexo platformunu DigitalOcean droplet üzerine nasıl kuracağınızı adım adım anlatır.

## 📋 Gereksinimler

### Droplet Özellikleri
- **OS:** Ubuntu 22.04 LTS
- **RAM:** Minimum 4GB (8GB önerilir)
- **CPU:** 2+ vCPU
- **Disk:** 50GB+ SSD
- **Region:** Müşterilerinize en yakın bölge

### Domain Gereksinimleri
- 2 adet subdomain (A kaydı olarak droplet IP'sine yönlendirilmiş):
  - `api.yourdomain.com` - API servisi için
  - `app.yourdomain.com` - Web arayüzü için

## 🚀 Kurulum Adımları

### 1. Droplet Oluşturma

1. DigitalOcean panelinde yeni droplet oluşturun
2. Ubuntu 22.04 LTS seçin
3. En az 4GB RAM'li plan seçin
4. Datacenter bölgesini seçin
5. SSH key ekleyin (güvenlik için önerilir)
6. Droplet'ı oluşturun ve IP adresini not edin

### 2. Domain Ayarları

Domain yönetim panelinizde:
```
A Record: api.yourdomain.com -> [DROPLET_IP]
A Record: app.yourdomain.com -> [DROPLET_IP]
```

DNS yayılması için 5-30 dakika bekleyin.

### 3. Droplet'a Bağlanma

```bash
ssh root@[DROPLET_IP]
```

### 4. Otomatik Kurulum

Hazırladığımız script ile tüm kurulumu otomatik yapabilirsiniz:

```bash
# Script'leri indirin
git clone https://github.com/yourusername/fulexo.git /opt/fulexo
cd /opt/fulexo

# Kurulum scriptini çalıştırın
chmod +x scripts/setup-droplet.sh
./scripts/setup-droplet.sh
```

Script şunları otomatik yapacak:
- ✅ Sistem güncellemeleri
- ✅ Docker kurulumu
- ✅ Güvenlik duvarı yapılandırması
- ✅ Fail2ban kurulumu
- ✅ Uygulama kullanıcısı oluşturma
- ✅ Otomatik yedekleme kurulumu
- ✅ Monitoring kurulumu

### 5. Ortam Değişkenlerini Yapılandırma

Script otomatik olarak güvenli şifreler oluşturacak. Yine de kontrol edin:

```bash
nano /opt/fulexo/compose/.env
```

Önemli ayarlar:
```env
# Domain ayarları (ZORUNLU)
DOMAIN_API=api.yourdomain.com
DOMAIN_APP=app.yourdomain.com

# BaseLinker API (isteğe bağlı, sonra eklenebilir)
BASELINKER_API_KEY=your_baselinker_api_key

# Email ayarları (isteğe bağlı)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 6. SSL Sertifika Kurulumu

Domain ayarlarınız yapıldıktan sonra:

```bash
cd /opt/fulexo
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

Email adresinizi girmeniz istenecek (Let's Encrypt bildirimleri için).

### 7. Uygulamayı Başlatma

```bash
# Servisi başlat
systemctl start fulexo

# Durumu kontrol et
systemctl status fulexo

# Logları görüntüle
docker logs -f compose-api-1
```

### 8. İlk Kurulum

1. Tarayıcınızda `https://app.yourdomain.com` adresine gidin
2. Admin hesabı oluşturun
3. Tenant (kiracı) oluşturun
4. BaseLinker entegrasyonunu yapılandırın

## 🔧 Yönetim Komutları

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
```

### Docker Komutları
```bash
# Tüm container'ları listele
docker ps

# Logları görüntüle
docker logs -f compose-api-1
docker logs -f compose-web-1
docker logs -f compose-worker-1

# Container'a bağlan
docker exec -it compose-api-1 sh
```

### Veritabanı Yönetimi
```bash
# Veritabanına bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user fulexo_db

# Migration çalıştır
docker exec compose-api-1 npm run prisma:migrate:deploy

# Prisma Studio aç (SSH tüneli gerekir)
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

## 🔍 Monitoring ve Debugging

### Erişim URL'leri

Güvenlik nedeniyle bazı servisler sadece localhost'tan erişilebilir. SSH tüneli kullanın:

```bash
# SSH tüneli aç (local bilgisayarınızdan)
ssh -L 9000:localhost:9000 -L 9001:localhost:9001 -L 3001:localhost:3001 -L 9093:localhost:9093 -L 16686:localhost:16686 root@[DROPLET_IP]
```

Ardından tarayıcınızda:
- MinIO Console: http://localhost:9001
- Uptime Kuma: http://localhost:3001
- Alertmanager: http://localhost:9093
- Jaeger: http://localhost:16686

### Log Kontrolü
```bash
# Tüm servislerin logları
docker compose -f /opt/fulexo/compose/docker-compose.yml logs -f

# Belirli servis logu
docker logs -f compose-api-1 --tail 100

# Sistem logları
journalctl -u fulexo -f
```

### Performans İzleme
```bash
# Sistem kaynakları
htop

# Docker kaynak kullanımı
docker stats

# Disk kullanımı
df -h
```

## 🚨 Sorun Giderme

### SSL Sertifika Sorunları
```bash
# Sertifikaları kontrol et
certbot certificates

# Manuel yenileme
certbot renew --force-renewal

# Nginx yapılandırmasını test et
docker exec compose-nginx-1 nginx -t
```

### Container Başlamama Sorunu
```bash
# Detaylı log
docker compose -f /opt/fulexo/compose/docker-compose.yml up

# Tek container'ı başlat
docker compose -f /opt/fulexo/compose/docker-compose.yml up -d postgres
```

### Veritabanı Bağlantı Sorunu
```bash
# Postgres container durumu
docker ps | grep postgres

# Bağlantı testi
docker exec compose-api-1 npm run prisma:db:push
```

## 🔒 Güvenlik Önerileri

1. **SSH Güvenliği**
   ```bash
   # Root login'i devre dışı bırak
   sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
   
   # SSH portunu değiştir
   sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
   systemctl restart sshd
   ```

2. **Firewall Kuralları**
   ```bash
   # Sadece gerekli portları aç
   ufw status
   
   # MinIO ve monitoring portlarını kısıtla
   ufw delete allow 9000:9001/tcp
   ufw delete allow 3001/tcp
   ```

3. **Düzenli Güncellemeler**
   ```bash
   # Sistem güncellemeleri
   apt update && apt upgrade -y
   
   # Docker image güncellemeleri
   docker compose -f /opt/fulexo/compose/docker-compose.yml pull
   docker compose -f /opt/fulexo/compose/docker-compose.yml up -d
   ```

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. GitHub Issues'da arayın
3. Topluluk forumunda sorun
4. Dokümantasyonu gözden geçirin

---

**Not:** Bu dokümantasyon Fulexo v1.0.0 için hazırlanmıştır. Güncel sürüm için GitHub'ı kontrol edin.