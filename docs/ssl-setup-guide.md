# SSL Kurulum Rehberi - Fulexo Platform

## 🔐 Hızlı SSL Kurulumu

Fulexo platformu için SSL sertifikalarını kurmak oldukça basit. İşte adım adım yapmanız gerekenler:

## 📋 Ön Gereksinimler

1. **Domain DNS Ayarları Tamamlanmış Olmalı:**
   ```
   A Record: api.fulexo.com → [DROPLET_IP]
   A Record: panel.fulexo.com → [DROPLET_IP]
   ```

2. **Portlar Açık Olmalı:**
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

## 🚀 Kurulum Adımları

### 1. Sunucuya Bağlanın
```bash
ssh root@[DROPLET_IP]
```

### 2. Proje Dizinine Gidin
```bash
cd /opt/fulexo
```

### 3. SSL Kurulum Scriptini Çalıştırın
```bash
./scripts/setup-ssl-fulexo.sh
```

### 4. E-posta Adresinizi Girin
Script size Let's Encrypt bildirimleri için bir e-posta adresi soracak. Geçerli bir e-posta adresi girin.

### 5. Kurulum Tamamlandı!
Script otomatik olarak:
- ✅ Certbot'u kurar/günceller
- ✅ SSL sertifikalarını alır
- ✅ Nginx'i yapılandırır
- ✅ Otomatik yenileme ayarlar
- ✅ Servisleri yeniden başlatır

## 🔍 Kontrol ve Test

### SSL Sertifikalarını Kontrol Etme
```bash
certbot certificates
```

### Otomatik Yenileme Timer'ını Kontrol
```bash
systemctl status certbot-renewal.timer
```

### Manuel SSL Yenileme
```bash
certbot renew
```

### HTTPS Bağlantısını Test Etme
```bash
# API endpoint
curl -I https://api.fulexo.com/health

# Panel
curl -I https://panel.fulexo.com
```

## 🚨 Sorun Giderme

### "Failed to obtain certificate" Hatası

1. **DNS Kayıtlarını Kontrol Edin:**
   ```bash
   nslookup api.fulexo.com
   nslookup panel.fulexo.com
   ```
   Çıktıda droplet IP'nizi görmelisiniz.

2. **Portların Açık Olduğunu Kontrol Edin:**
   ```bash
   sudo ufw status
   ```

3. **Nginx'in Çalışmadığından Emin Olun:**
   ```bash
   docker ps | grep nginx
   # Eğer çalışıyorsa durdurun:
   docker compose -f /opt/fulexo/compose/docker-compose.yml down
   ```

### DNS Propagasyon Bekleme

DNS kayıtlarınız yeni ise, yayılması için 5-30 dakika bekleyin. Kontrol için:
```bash
dig api.fulexo.com
dig panel.fulexo.com
```

### Sertifika Yenileme Sorunları

Otomatik yenileme çalışmıyorsa:
```bash
# Manuel yenileme
/opt/fulexo/scripts/renew-ssl.sh

# Timer'ı yeniden başlat
systemctl restart certbot-renewal.timer
```

## 🔄 SSL Sertifikası Yenileme

SSL sertifikaları 90 gün geçerlidir ve otomatik olarak yenilenir. Sistem:
- Günde 2 kez (00:00 ve 12:00) yenileme kontrolü yapar
- Sertifika süresinin 30 günden azı kaldıysa otomatik yeniler
- Yenileme başarılı olursa Nginx'i otomatik olarak yeniden yükler

## 📊 SSL Durumu İzleme

### Sertifika Süresini Kontrol
```bash
echo | openssl s_client -servername api.fulexo.com -connect api.fulexo.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Let's Encrypt Rate Limits

Let's Encrypt'in bazı limitleri vardır:
- Domain başına haftada 50 sertifika
- IP başına saatte 5 başarısız deneme
- Hesap başına saatte 300 yeni sipariş

Normal kullanımda bu limitlere takılmazsınız.

## 🛡️ Güvenlik Önerileri

1. **SSL Labs Testi:**
   https://www.ssllabs.com/ssltest/ adresinden domain'lerinizi test edin.

2. **HSTS Header Kontrolü:**
   ```bash
   curl -I https://api.fulexo.com | grep -i strict
   ```

3. **Güvenlik Başlıklarını Kontrol:**
   https://securityheaders.com adresinden kontrol yapın.

## 📞 Yardım

SSL kurulumunda sorun yaşıyorsanız:
1. Script çıktısındaki hata mesajlarını kontrol edin
2. `/var/log/letsencrypt/` dizinindeki logları inceleyin
3. GitHub Issues'da arayın veya yeni issue açın

---

**Not:** Bu dokümantasyon Fulexo platform SSL kurulumu için hazırlanmıştır. Güncel bilgiler için GitHub repository'sini kontrol edin.