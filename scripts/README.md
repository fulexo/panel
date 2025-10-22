# Operational Scripts

Note: Prefer `memory-bank/runbooks.md` for operator workflows. This page lists script inventory only.

**Last Updated:** October 13, 2025  
**Status:** ✅ All scripts tested and verified

Bu dizindeki scriptler Docker Compose tabanlı Fulexo kurulumu için güncel tutulmaktadır. Çoğu script hem geliştirme (`--dev`) hem de üretim (`--prod`) yığınlarıyla çalışacak şekilde parametreler içerir. `scripts/common.sh` dosyası ortak değişkenleri ve yardımcı fonksiyonları sağlar.

> **Not**: Scriptler varsayılan olarak repository kökünü `PROJECT_ROOT` olarak kabul eder. Farklı bir Compose dosyası veya proje adı kullanıyorsanız `COMPOSE_FILE` ve `COMPOSE_PROJECT_NAME` ortam değişkenlerini ayarlayabilirsiniz.

## Script kataloğu

| Script | Amaç | Durum | Önemli notlar |
| --- | --- | --- | --- |
| `backup.sh` | Kod, PostgreSQL, Redis ve MinIO verilerini yedekler. | Güncel | `backups/` dizinine tarih bazlı klasörler oluşturur. `--dev` bayrağı ile geliştirme yığını hedeflenebilir. |
| `backup-restore.sh` | Yedekleri listeler, temizler ve geri yükler. | Güncel | `restore latest --prod` ile en güncel yedeği üretime uygular. |
| `clear-cache.sh` | Next.js, NestJS ve worker cache dizinlerini temizler. | Güncel | Paket bazında temizlik için `--frontend`, `--backend`, `--worker` bayraklarını kullanın. |
| `cleanup-build.sh` | Build çıktıları ve isteğe bağlı Docker cache'lerini temizler. | Güncel | `--with-docker` eklenirse `docker system prune` çağrılır. |
| `deploy.sh` | Git'ten güncelleme alır, yedek oluşturur ve Compose yığınını yeniden başlatır. | Güncel | `--skip-backup` ile yedek aşaması atlanabilir. Başarısız sağlık kontrolünde `rollback.sh` çağrılır. |
| `fix-common-issues.sh` | Bağımlılıkları yeniden yükler, isteğe bağlı migration ve restart yapar. | Güncel | `--migrate` Prisma migration'larını çalıştırır. |
| `health-check.sh` | API, web, worker ve Karrio servislerinin sağlık durumunu kontrol eder. | Güncel | `--quiet` çıktılarını azaltır; dönüş kodu CI'larda kullanılabilir. |
| `install-from-scratch.sh` | Yeni Ubuntu sunucusunu Docker ve temel güvenlik için hazırlar. | Güncel | Root yetkisi ister; varsayılan kullanıcı `fulexo`. |
| `migrate-database.sh` | Prisma client oluşturur ve migrations uygular. | Güncel | `--generate-only` sadece client üretir. |
| `monitor.sh` | Compose servisleri ve Docker kaynak kullanımını görüntüler. | Güncel | `--continuous` ile belirli aralıklarla tekrarlar. |
| `quick-install.sh` | Sıfırdan kurulum, güvenlik ve dağıtımı zincirler. | Güncel | Root olarak çalıştırılmalı; son adımda uygulamayı hedef kullanıcıyla dağıtır. |
| `rollback.sh` | Belirtilen yedekten geri dönüş yapar. | Güncel | `rollback.sh latest --prod` en güncel yedeği uygular. |
| `setup-monitoring.sh` | Prometheus, Alertmanager, Loki ve Promtail konfigurasyonlarını hedef dizine kopyalar. | Güncel | Varsayılan hedef `/opt/fulexo/monitoring`. |
| `setup-production.sh` | Systemd servisi oluşturarak üretim Compose yığınını yönetir. | Güncel | `--service-name` ve `--compose` bayraklarıyla özelleştirilebilir. |
| `setup-security.sh` | UFW, Fail2ban ve unattended-upgrades ile temel güvenlik sağlar. | Güncel | `--skip-swap` bayrağı swap oluşturmayı atlar. |
| `setup-ssl.sh` | Nginx için self-signed TLS sertifikaları üretir. | Güncel | `--domain` zorunludur; isteğe bağlı `--api-domain`. |
| `update-platform.sh` | Kodu günceller, bağımlılıkları yükler ve yığını yeniden başlatır. | Güncel | `--migrate` migration çalıştırır. |

## Öneriler

- Scriptleri çalıştırmadan önce `.env` dosyanızın güncel olduğundan emin olun.
- Root gerektiren scriptler (`setup-security.sh`, `setup-production.sh` vb.) sudo ile çalıştırılmalıdır.
- Üretim ortamında `backup.sh` ile düzenli yedek oluşturmayı bir cron job'a bağlayın.
- CI/CD süreçlerinde `health-check.sh --quiet` dönüş kodu hızlı doğrulama için kullanılabilir.
- Scriptler çıktıları Türkçe olarak loglar; otomasyon senaryolarında sadece çıkış kodunu değerlendirmek yeterlidir.
