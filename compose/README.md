# Compose Directory

Bu dizin Docker Compose yapılandırmasını içerir.

## Environment Dosyası Kurulumu

### Otomatik Kurulum (Önerilen)
```bash
# Setup script'i environment dosyasını otomatik oluşturur
./scripts/setup-droplet.sh
```

### Manuel Kurulum
```bash
# Template dosyasından kopyala
cp env-template .env

# Kendi değerlerinizle düzenleyin
nano .env
```

## ⚠️ Önemli Notlar

1. **Environment dosyası git'e commit edilmez** - Bu güvenlik içindir
2. **Production'da** environment dosyası `/etc/fulexo/fulexo.env` konumunda saklanır
3. **Template dosyası** (`env-template`) git'e commit edilir ve güncel tutulur
4. **Hassas bilgiler** asla git'e commit edilmemelidir

## Dosya Yapısı

```
compose/
├── env-template          # Environment şablonu (git'e commit edilir)
├── .env                  # Gerçek environment (git'e commit edilmez)
├── docker-compose.yml    # Ana compose dosyası
├── nginx/                # Nginx yapılandırması
├── prometheus/           # Prometheus yapılandırması
└── ...                   # Diğer servis yapılandırmaları
```

## Docker Compose Kullanımı

```bash
# Servisleri başlat
docker compose up -d

# Durumu kontrol et
docker compose ps

# Logları görüntüle
docker compose logs -f

# Servisleri durdur
docker compose down
```
