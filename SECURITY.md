# Güvenlik

## 🔐 Temel Güvenlik Özellikleri

- **Multi-tenant**: Her müşteri için veri izolasyonu
- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **2FA**: İki faktörlü kimlik doğrulama
- **AES-256-GCM**: Veri şifreleme
- **Rate Limiting**: API kötüye kullanım koruması

## 🛡️ Güvenlik Yapılandırması

### Environment Variables
```bash
# Güçlü şifreler kullanın
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-32-character-encryption-key
POSTGRES_PASSWORD=strong-password-here
```

### SSL/TLS
```bash
# SSL sertifikası kurulumu
sudo certbot --nginx -d your-domain.com
```

## 🔍 Güvenlik Kontrolleri

### Health Check
```bash
# Güvenlik durumu kontrolü
./scripts/health-check.sh
```

### Log Monitoring
```bash
# Güvenlik loglarını izleme
docker logs -f compose-api-1 | grep -i "auth\|security\|error"
```

## ⚠️ Önemli Notlar

- Production'da güçlü şifreler kullanın
- SSL sertifikalarını düzenli güncelleyin
- Log dosyalarını düzenli kontrol edin
- Backup'ları şifreleyin