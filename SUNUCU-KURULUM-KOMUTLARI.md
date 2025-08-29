# 🚀 Fulexo Sunucu Kurulum Komutları

## 📋 Kurulum Bilgileri
- **Sunucu IP**: 164.90.167.249
- **Domain'ler**: panel.fulexo.com, api.fulexo.com
- **SSL Email**: fulexo@fulexo.com
- **Admin Email**: fulexo@fulexo.com
- **Admin Şifre**: Adem_123*

## 🔧 Kurulum Komutları

Sunucuya SSH ile bağlandıktan sonra aşağıdaki komutları sırasıyla çalıştırın:

### 1. Sunucuya Bağlanma
```bash
ssh root@164.90.167.249
```

### 2. Proje Klonlama ve Kurulum
```bash
# Projeyi klonla
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo

# Setup script'ini çalıştır
chmod +x scripts/setup-droplet.sh
./scripts/setup-droplet.sh
```

### 3. Domain Yapılandırması
```bash
# Environment dosyasını düzenle
nano /etc/fulexo/fulexo.env

# Bu satırları bulup değiştir:
# DOMAIN_API=api.fulexo.com
# DOMAIN_APP=panel.fulexo.com
# NEXT_PUBLIC_APP_URL=https://panel.fulexo.com
```

### 4. SSL Sertifikası Kurulumu
```bash
cd /opt/fulexo
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh

# Email sorduğunda: fulexo@fulexo.com
```

### 5. Servisleri Başlatma
```bash
# Docker servisleri başlat
systemctl start fulexo

# Durum kontrol et
systemctl status fulexo
docker ps
```

### 6. Veritabanı Kurulumu
```bash
# API dizinine geç
cd /opt/fulexo/apps/api

# Dependencies yükle
npm install

# Veritabanı migration'ları
npm run prisma:migrate:deploy

# Seed data yükle
npm run prisma:seed
```

### 7. Admin Kullanıcısını Özelleştirme
```bash
# PostgreSQL'e bağlan
docker exec -it compose-postgres-1 psql -U fulexo_user fulexo

# Admin kullanıcısını güncelle
UPDATE "User" SET email = 'fulexo@fulexo.com' WHERE email = 'admin@example.com';

# Şifreyi değiştir (bcrypt hash)
# Önce hash oluştur
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('Adem_123*', 10));"

# Çıkan hash'i kullanarak şifreyi güncelle
UPDATE "User" SET "passwordHash" = '[HASH_BURAYA]' WHERE email = 'fulexo@fulexo.com';

# Çık
\q
```

### 8. Son Kontroller
```bash
# Kurulum doğrulama
chmod +x scripts/validate-deployment.sh
./scripts/validate-deployment.sh

# Servis durumunu kontrol et
curl -k https://api.fulexo.com/health
curl -k https://panel.fulexo.com

# Logları kontrol et
docker logs compose-api-1 --tail 50
docker logs compose-web-1 --tail 50
```

## 🎯 Kurulum Sonrası

### Giriş Bilgileri
- **URL**: https://panel.fulexo.com
- **Email**: fulexo@fulexo.com  
- **Şifre**: Adem_123*

### Monitoring Erişimi (SSH Tüneli)
```bash
# Local bilgisayarınızdan
ssh -L 3002:localhost:3002 -L 9001:localhost:9001 root@164.90.167.249
```
- **Grafana**: http://localhost:3002
- **MinIO**: http://localhost:9001

### İlk Yapılandırma
1. Admin paneline giriş yap
2. Settings → BaseLinker → API token'ınızı ekleyin
3. Settings → Email → SMTP ayarlarınızı yapın

## 🔧 Sorun Giderme Komutları

### Container Durumu
```bash
docker ps -a
docker logs compose-api-1
docker logs compose-nginx-1
```

### Servis Yeniden Başlatma
```bash
systemctl restart fulexo
docker compose -f /opt/fulexo/compose/docker-compose.yml restart
```

### SSL Sorunları
```bash
certbot certificates
nginx -t
```

---

Bu komutları sırasıyla çalıştırdıktan sonra sisteminiz tamamen hazır olacak! 🎉
