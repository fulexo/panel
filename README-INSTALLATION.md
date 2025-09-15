# Fulexo Platform - Kurulum Rehberi

Bu rehber, Fulexo Platform'u sıfırdan sunucunuza kurmanız için gerekli tüm adımları içerir.

## 📋 Gereksinimler

### Minimum Sistem Gereksinimleri
- **OS**: Ubuntu 22.04+ (önerilen)
- **RAM**: 4GB (8GB önerilen)
- **Disk**: 20GB boş alan
- **CPU**: 2 core (4 core önerilen)
- **Network**: Statik IP adresi

### Domain Gereksinimleri
- API domain (örn: `api.yourdomain.com`)
- Panel domain (örn: `panel.yourdomain.com`)
- DNS A kayıtları sunucu IP'sine yönlendirilmeli

## 🚀 Hızlı Kurulum (Önerilen)

### 1. Sunucuya Bağlanın
```bash
ssh root@your-server-ip
```

### 2. Repository'yi Klonlayın
```bash
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo
```

### 3. Hızlı Kurulum Script'ini Çalıştırın
```bash
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

Script sırasında size şu bilgiler sorulacak:
- API Domain (örn: `api.yourdomain.com`)
- Panel Domain (örn: `panel.yourdomain.com`)
- Admin Email (Let's Encrypt için)

### 4. Kurulum Tamamlandı! 🎉
- Panel: `https://panel.yourdomain.com`
- API: `https://api.yourdomain.com`
- Admin: `fulexo@fulexo.com` / `Adem_123*`

## 🔧 Adım Adım Kurulum

### 1. Temel Kurulum
```bash
chmod +x scripts/install-from-scratch.sh
./scripts/install-from-scratch.sh
```

### 2. DNS Kayıtlarını Yapılandırın
```bash
# Sunucu IP'nizi öğrenin
curl -s ifconfig.me

# DNS kayıtlarınızı yapılandırın:
# api.yourdomain.com -> YOUR_SERVER_IP
# panel.yourdomain.com -> YOUR_SERVER_IP
```

### 3. SSL Sertifikalarını Kurun
```bash
chmod +x scripts/setup-ssl-fulexo.sh
./scripts/setup-ssl-fulexo.sh
```

### 4. Tam Kurulumu Tamamlayın
```bash
chmod +x scripts/complete-setup.sh
./scripts/complete-setup.sh
```

## 📊 Platform Yönetimi

### Servis Komutları
```bash
# Servis durumu
sudo systemctl status fulexo

# Servis başlat
sudo systemctl start fulexo

# Servis durdur
sudo systemctl stop fulexo

# Servis yeniden başlat
sudo systemctl restart fulexo
```

### Log Görüntüleme
```bash
# API logları
docker logs -f compose-api-1

# Tüm servis logları
docker compose -f /opt/fulexo/compose/docker-compose.yml logs

# Belirli bir servis
docker logs -f compose-postgres-1
```

### Health Check
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Platform Güncelleme
```bash
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh
```

## 🔐 Güvenlik

### Firewall Yapılandırması
```bash
# Mevcut kuralları görüntüle
sudo ufw status

# Yeni kural ekle
sudo ufw allow from 192.168.1.0/24 to any port 22

# Kural sil
sudo ufw delete allow 80
```

### SSL Sertifika Yenileme
```bash
# Manuel yenileme
sudo certbot renew

# Otomatik yenileme durumu
sudo systemctl status certbot-renewal.timer
```

### Backup
```bash
# Manuel backup
sudo -u fulexo /opt/fulexo/scripts/backup.sh

# Backup dizini
ls -la /opt/fulexo/backups/
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

#### 1. Servis Başlamıyor
```bash
# Servis durumunu kontrol et
sudo systemctl status fulexo

# Logları kontrol et
journalctl -u fulexo -f

# Container'ları kontrol et
docker ps -a
```

#### 2. SSL Sertifikası Alınamıyor
```bash
# Port 80'in boş olduğundan emin olun
sudo netstat -tlnp | grep :80

# DNS propagation kontrol edin
nslookup api.yourdomain.com
nslookup panel.yourdomain.com

# Firewall'u kontrol edin
sudo ufw status
```

#### 3. Database Bağlantı Hatası
```bash
# PostgreSQL container'ını kontrol et
docker logs compose-postgres-1

# Database'e bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user -d fulexo
```

#### 4. API Çalışmıyor
```bash
# API container'ını kontrol et
docker logs compose-api-1

# API health check
curl -k https://api.yourdomain.com/health
```

### Log Dosyaları
```bash
# Systemd logları
journalctl -u fulexo -f

# Docker logları
docker logs -f compose-api-1
docker logs -f compose-web-1
docker logs -f compose-worker-1

# Nginx logları
docker logs -f compose-nginx-1
```

## 📈 Monitoring

### Grafana Erişimi
```bash
# SSH tüneli ile erişim
ssh -L 3002:localhost:3002 root@your-server-ip

# Tarayıcıda açın
http://localhost:3002
```

### MinIO Console
```bash
# SSH tüneli ile erişim
ssh -L 9001:localhost:9001 root@your-server-ip

# Tarayıcıda açın
http://localhost:9001
```

## 🔄 Güncelleme

### Platform Güncelleme
```bash
# Otomatik güncelleme
chmod +x scripts/update-platform.sh
./scripts/update-platform.sh
```

### Manuel Güncelleme
```bash
# Servisleri durdur
sudo systemctl stop fulexo

# Repository'yi güncelle
cd /opt/fulexo
sudo -u fulexo git pull

# Dependencies güncelle
cd apps/api
sudo -u fulexo npm install
sudo -u fulexo npm run prisma:generate

# Database migration
sudo -u fulexo npm run prisma:migrate:deploy

# Servisleri başlat
sudo systemctl start fulexo
```

## 📞 Destek

### Dokümantasyon
- [API Dokümantasyonu](https://api.yourdomain.com/docs)
- [GitHub Repository](https://github.com/fulexo/panel)

### Log Toplama
```bash
# Sorun raporu için log toplama
mkdir -p /tmp/fulexo-logs
cd /tmp/fulexo-logs

# Systemd logları
journalctl -u fulexo --no-pager > systemd.log

# Docker logları
docker logs compose-api-1 > api.log
docker logs compose-web-1 > web.log
docker logs compose-postgres-1 > postgres.log

# Container durumu
docker ps -a > containers.txt

# Disk kullanımı
df -h > disk-usage.txt

# Memory kullanımı
free -h > memory-usage.txt

# Log dosyalarını sıkıştır
tar -czf fulexo-logs-$(date +%Y%m%d).tar.gz *.log *.txt
```

## 🎯 Sonraki Adımlar

1. **Admin Paneline Giriş Yapın**
   - URL: `https://panel.yourdomain.com`
   - Email: `fulexo@fulexo.com`
   - Şifre: `Adem_123*`

2. **SMTP Ayarlarını Yapılandırın**
   - Settings → Email → SMTP Configuration

3. **WooCommerce Mağazalarını Ekleyin**
   - Stores → Add New Store

4. **Kullanıcıları Yönetin**
   - Users → Create New User

5. **Monitoring'i Yapılandırın**
   - Grafana dashboard'larını özelleştirin
   - Alert'leri yapılandırın

---

**🎊 Kurulum tamamlandı! Fulexo Platform'unuz kullanıma hazır.**