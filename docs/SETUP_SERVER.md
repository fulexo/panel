# Sunucuda Kurulum ve Aktivasyon Talimatları

## Gereksinimler
- Ubuntu 22.04+ (root veya sudo)
- Docker Engine 26+, Docker Compose v2
- DNS A kayıtları: `api.example.com`, `app.example.com`

## 1) Sistem Hazırlığı
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# oturumu yeniden açın veya: newgrp docker
```

## 2) Repo ve Dizine Geçiş
```bash
cd /workspace/fulexo
```

## 3) Ortam Değişkenleri
`compose/.env` dosyasını düzenleyin:
- `POSTGRES_PASSWORD`, `S3_SECRET_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY` değerlerini güçlü şekilde değiştirin
- `DOMAIN_API` ve `DOMAIN_APP` alanlarını kendi domainleriniz ile güncelleyin

## 4) Servisleri Ayağa Kaldırma
```bash
cd compose
docker compose up -d --build
```

## 5) MinIO
- http://SUNUCU_IP:9001 ile giriş yapın (root user: env'deki `S3_ACCESS_KEY`)
- `fulexo-cache` bucket oluşturun

## 6) TLS Sertifikaları
```bash
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot || true
sudo certbot --nginx -d api.example.com -d app.example.com --non-interactive --agree-tos -m no-reply@example.com
```

## 7) Sağlık Kontrolleri
- `https://api.example.com/health` → `{"status":"ok"}`
- `https://api.example.com/docs` → Swagger UI

## 8) İzleme
- Prometheus metrikleri: API `/metrics`, Worker `:3001/metrics`
- Alertmanager, Grafana, Loki/Promtail konteynerleri compose ile gelmektedir

## 9) Güncellemeler
```bash
cd /workspace/fulexo/compose
docker compose pull
docker compose up -d --build
```

## 10) Yedekleme İpuçları
- PostgreSQL için günlük `pg_dump` ve/veya WAL-G + MinIO kullanın (bkz. Disaster-Recovery-Plan)
- Konfig dosyalarını düzenli olarak yedekleyin