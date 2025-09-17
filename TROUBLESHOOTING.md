# Sorun Giderme

## 🚨 Yaygın Sorunlar

### Database Bağlantı Hatası
```bash
# PostgreSQL durumunu kontrol et
docker logs compose-postgres-1

# Bağlantıyı test et
docker compose exec postgres psql -U postgres -d fulexo -c "SELECT 1;"
```

### API Çalışmıyor
```bash
# API loglarını kontrol et
docker logs compose-api-1

# Servisi yeniden başlat
docker compose restart api
```

### Web Arayüzü Açılmıyor
```bash
# Web servisini kontrol et
docker logs compose-web-1

# Port çakışması kontrol et
lsof -i :3001
```

## 🔧 Hızlı Çözümler

### Servisleri Yeniden Başlat
```bash
docker compose restart
```

### Cache Temizle
```bash
docker compose exec valkey redis-cli FLUSHALL
```

### Logları Temizle
```bash
docker system prune -f
```

## 📞 Destek

Sorun devam ederse:
1. Log dosyalarını kontrol edin
2. `./scripts/health-check.sh` çalıştırın
3. GitHub'da issue oluşturun