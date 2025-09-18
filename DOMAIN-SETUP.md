# 🌐 Fulexo Platform - Domain Kurulum Rehberi

## 📋 Domain Konfigürasyonu

### **Domain'ler:**
- **Panel**: `panel.fulexo.com`
- **API**: `api.fulexo.com`  
- **Monitoring**: `monitor.fulexo.com`

---

## 🚀 Hızlı Kurulum

### **1. DNS Ayarları**
```bash
# A kayıtları (sunucu IP'nizi yazın)
panel.fulexo.com    A    YOUR_SERVER_IP
api.fulexo.com      A    YOUR_SERVER_IP
monitor.fulexo.com  A    YOUR_SERVER_IP
```

### **2. SSL Sertifikası Kurulumu**
```bash
# SSL sertifikalarını oluştur
./scripts/setup-ssl.sh

# Seçenekler:
# 1) Self-signed (test için)
# 2) Let's Encrypt (production)
# 3) Let's Encrypt Staging (test)
```

### **3. Uygulamayı Başlatma**
```bash
# Production modunda başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs -f
```

---

## ✅ Kurulum Sonrası Kontroller

### **1. Domain Erişim Testi**
```bash
# API testi
curl -k https://api.fulexo.com/health

# Panel testi  
curl -k https://panel.fulexo.com

# Monitoring testi
curl -k https://monitor.fulexo.com
```

### **2. SSL Sertifika Kontrolü**
```bash
# Sertifika detaylarını kontrol et
openssl x509 -in ssl/panel.fulexo.com.crt -text -noout
openssl x509 -in ssl/api.fulexo.com.crt -text -noout
```

---

## 🔧 Sorun Giderme

### **Domain Erişilemiyor**
1. DNS propagasyonunu kontrol edin (24 saat sürebilir)
2. Firewall ayarlarını kontrol edin
3. Nginx container'ının çalıştığını kontrol edin

### **SSL Sertifika Hatası**
1. Sertifika dosyalarının doğru konumda olduğunu kontrol edin
2. Dosya izinlerini kontrol edin (600 key, 644 crt)
3. Let's Encrypt rate limit'ini kontrol edin

### **Nginx Hatası**
1. Konfigürasyon dosyasını kontrol edin
2. Container loglarını inceleyin
3. Port çakışması olup olmadığını kontrol edin

---

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin: `docker-compose logs`
2. Health check yapın: `./scripts/health-check.sh`
3. SSL durumunu kontrol edin: `./scripts/setup-ssl.sh`

**Kurulum tamamlandı! 🎉**