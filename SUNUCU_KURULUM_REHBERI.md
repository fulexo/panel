# 🚀 Fulexo Platform - Sunucu Kurulum Rehberi

## 📋 Sunucu Durumu Analizi

Sunucunuzun mevcut durumu:
- **OS**: Ubuntu 22.04.4 LTS
- **RAM**: 3.8 GB (2.6 GB boş)
- **Disk**: 35 GB SSD (32 GB boş)
- **IP**: 164.90.167.249
- **Docker**: ❌ Kurulu değil
- **Firewall**: ❌ UFW devre dışı
- **Güvenlik**: ⚠️ Brute force saldırıları tespit edildi

## 🔧 Kurulum Öncesi Hazırlık

### 1. Güvenlik İyileştirmeleri (ÖNEMLİ!)

Sunucunuzda güvenlik açıkları tespit edildi. Önce bunları düzeltin:

```bash
# 1. Güvenlik kurulumu
chmod +x scripts/setup-security.sh
./scripts/setup-security.sh

# 2. Swap alanı ekleme
chmod +x scripts/setup-swap.sh
./scripts/setup-swap.sh

# 3. Sudo kullanıcısı oluşturma (root yerine)
chmod +x scripts/create-sudo-user.sh
./scripts/create-sudo-user.sh
```

### 2. DNS Kayıtları

Domain'lerinizi sunucu IP'sine yönlendirin:
- `api.fulexo.com` → `164.90.167.249`
- `panel.fulexo.com` → `164.90.167.249`

## 🚀 Kurulum Seçenekleri

### Seçenek 1: Tam Otomatik Kurulum (Önerilen)

```bash
# Root olarak giriş yapın
ssh root@164.90.167.249

# Repository'yi klonlayın
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo

# Tam otomatik kurulum
chmod +x scripts/install-fulexo-complete.sh
./scripts/install-fulexo-complete.sh
```

### Seçenek 2: Adım Adım Kurulum

```bash
# 1. Güvenlik kurulumu
chmod +x scripts/setup-security.sh
./scripts/setup-security.sh

# 2. Swap kurulumu
chmod +x scripts/setup-swap.sh
./scripts/setup-swap.sh

# 3. Sistem kurulumu
chmod +x scripts/setup-droplet.sh
./scripts/setup-droplet.sh

# 4. SSL kurulumu
chmod +x scripts/setup-ssl-fulexo.sh
./scripts/setup-ssl-fulexo.sh

# 5. Tam kurulum
chmod +x scripts/complete-setup.sh
./scripts/complete-setup.sh
```

## 📊 Kurulum Sonrası Kontroller

### 1. Servis Durumu
```bash
# Fulexo servisi
systemctl status fulexo

# Docker container'ları
docker ps

# Firewall durumu
ufw status
```

### 2. Erişim Testleri
```bash
# API testi
curl -k https://api.fulexo.com/health

# Web testi
curl -k https://panel.fulexo.com

# SSL testi
openssl s_client -connect api.fulexo.com:443 -servername api.fulexo.com
```

### 3. Log Kontrolleri
```bash
# API logları
docker logs -f compose-api-1

# Web logları
docker logs -f compose-web-1

# Nginx logları
docker logs -f compose-nginx-1
```

## 🔐 Güvenlik Kontrolleri

### 1. Firewall Durumu
```bash
# UFW durumu
ufw status verbose

# Açık portlar
netstat -tlnp
```

### 2. Fail2ban Durumu
```bash
# Fail2ban durumu
systemctl status fail2ban

# Engellenen IP'ler
fail2ban-client status sshd
```

### 3. SSH Güvenliği
```bash
# SSH durumu
systemctl status ssh

# SSH logları
tail -f /var/log/auth.log
```

## 🎯 Erişim Bilgileri

### Web Panel
- **URL**: https://panel.fulexo.com
- **Email**: fulexo@fulexo.com
- **Şifre**: Adem_123*

### API
- **URL**: https://api.fulexo.com
- **Docs**: https://api.fulexo.com/docs

### Monitoring (SSH Tüneli Gerekli)
```bash
# Grafana
ssh -L 3002:localhost:3002 root@164.90.167.249
# http://localhost:3002

# MinIO
ssh -L 9001:localhost:9001 root@164.90.167.249
# http://localhost:9001

# Uptime Kuma
ssh -L 3001:localhost:3001 root@164.90.167.249
# http://localhost:3001
```

## 🛠️ Yönetim Komutları

### Servis Yönetimi
```bash
# Servis başlat
systemctl start fulexo

# Servis durdur
systemctl stop fulexo

# Servis yeniden başlat
systemctl restart fulexo

# Servis durumu
systemctl status fulexo
```

### Docker Yönetimi
```bash
# Container'ları listele
docker ps

# Container'ları yeniden başlat
docker compose -f /opt/fulexo/compose/docker-compose.yml restart

# Logları görüntüle
docker logs -f compose-api-1
```

### Backup
```bash
# Manuel backup
/opt/fulexo/scripts/backup.sh

# Backup durumu
ls -la /opt/fulexo/backups/
```

## ⚠️ Önemli Uyarılar

### 1. Güvenlik
- Root kullanıcısını devre dışı bırakın
- SSH key'inizi güvenli yerde saklayın
- Firewall'ı sürekli aktif tutun
- Fail2ban'ı izleyin

### 2. Performans
- Swap alanını kontrol edin
- Disk alanını izleyin
- RAM kullanımını takip edin
- Log dosyalarını temizleyin

### 3. Yedekleme
- Düzenli backup alın
- Backup dosyalarını test edin
- Yedekleri farklı sunucuda saklayın

## 🆘 Sorun Giderme

### 1. Servis Başlamıyor
```bash
# Logları kontrol et
journalctl -u fulexo -f

# Docker durumu
docker ps -a

# Disk alanı
df -h
```

### 2. SSL Sorunları
```bash
# Certbot durumu
certbot certificates

# Nginx konfigürasyonu
nginx -t

# SSL testi
openssl s_client -connect api.fulexo.com:443
```

### 3. Veritabanı Sorunları
```bash
# PostgreSQL durumu
docker exec -it compose-postgres-1 psql -U fulexo_user -d fulexo

# Migration durumu
cd /opt/fulexo/apps/api
npm run prisma:migrate:status
```

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Servis durumunu kontrol edin
3. Disk alanını kontrol edin
4. Network bağlantısını test edin

---

**🎊 Kurulum başarıyla tamamlandı!**

Fulexo Platform artık sunucunuzda çalışıyor. Güvenli ve verimli kullanım için yukarıdaki kontrolleri düzenli olarak yapın.