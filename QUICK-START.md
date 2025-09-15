# 🚀 Fulexo Platform - Hızlı Başlangıç

Bu rehber, Fulexo Platform'u en hızlı şekilde kurmanız için gerekli adımları içerir.

## ⚡ 5 Dakikada Kurulum

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

### 4. Kurulum Tamamlandı! 🎉
- Panel: `https://panel.yourdomain.com`
- API: `https://api.yourdomain.com`
- Admin: `fulexo@fulexo.com` / `Adem_123*`

## 📋 Kurulum Sırasında Sorulacak Bilgiler

1. **API Domain**: `api.yourdomain.com`
2. **Panel Domain**: `panel.yourdomain.com`
3. **Admin Email**: `your-email@domain.com` (Let's Encrypt için)

## 🔧 Kurulum Sonrası

### Platform Durumunu Kontrol Edin
```bash
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

### Health Check Yapın
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

## 🌐 Erişim URL'leri

- **Panel**: `https://panel.yourdomain.com`
- **API**: `https://api.yourdomain.com`
- **API Docs**: `https://api.yourdomain.com/docs`

## 👤 Admin Giriş Bilgileri

- **Email**: `fulexo@fulexo.com`
- **Şifre**: `Adem_123*`

## 📊 Monitoring (SSH Tüneli Gerekli)

- **Grafana**: `http://localhost:3002`
- **MinIO**: `http://localhost:9001`
- **Uptime Kuma**: `http://localhost:3001`

## 🔧 Yönetim Komutları

```bash
# Servis durumu
sudo systemctl status fulexo

# Servis başlat
sudo systemctl start fulexo

# Servis durdur
sudo systemctl stop fulexo

# Logları görüntüle
docker logs -f compose-api-1

# Health check
./scripts/health-check.sh

# Sorun giderme
./scripts/fix-common-issues.sh
```

## 📋 Sonraki Adımlar

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

## 🐛 Sorun Giderme

### Platform Çalışmıyor
```bash
# Sorun giderme script'ini çalıştır
chmod +x scripts/fix-common-issues.sh
./scripts/fix-common-issues.sh

# Health check yap
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### SSL Sertifikası Alınamıyor
```bash
# DNS kayıtlarını kontrol edin
nslookup api.yourdomain.com
nslookup panel.yourdomain.com

# Port 80'in boş olduğundan emin olun
sudo netstat -tlnp | grep :80
```

### Database Bağlantı Hatası
```bash
# PostgreSQL container'ını kontrol et
docker logs compose-postgres-1

# Database'e bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user -d fulexo
```

## 📞 Destek

### Log Dosyaları
```bash
# Systemd logları
journalctl -u fulexo -f

# Docker logları
docker logs -f compose-api-1
docker logs -f compose-web-1
docker logs -f compose-postgres-1
```

### Debug Modu
```bash
# Debug modunda çalıştır
bash -x scripts/script-name.sh
```

---

**🎊 Kurulum tamamlandı! Fulexo Platform'unuz kullanıma hazır.**