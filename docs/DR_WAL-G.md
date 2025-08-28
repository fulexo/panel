# WAL-G + MinIO (S3) Yedekleme Şablonu

## Docker ortam değişkenleri (postgres konteyneri için)
```
WALG_S3_PREFIX=s3://minio-primary/postgres/
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=CHANGE_ME
AWS_ENDPOINT=http://minio:9000
AWS_S3_FORCE_PATH_STYLE=true
WALG_S3_SSE=aws:kms
PGUSER=fulexo
PGPASSWORD=CHANGE_ME
PGDATABASE=fulexo
```

## Tam Yedek
```bash
wal-g backup-push /var/lib/postgresql/data
```

## WAL Arşivleme
- `postgresql.conf` içinde `archive_mode=on`, `archive_command='wal-g wal-push %p'`.

## Geri Yükleme (PITR)
```bash
export WALG_S3_PREFIX=s3://minio-primary/postgres/
wal-g backup-fetch /var/lib/postgresql/data LATEST
wal-g wal-fetch LATEST /var/lib/postgresql/data/pg_wal
```

## Plan
- Günlük tam yedek, 6 saatte bir artımsal.
- 30 gün tutma; offsite MinIO mirror.

## Test
- Aylık staging geri yükleme tatbikatı.
```