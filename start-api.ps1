# API servisini baslat
Write-Host "API servisi baslatiliyor..." -ForegroundColor Yellow

# API dizinine git
Set-Location "apps/api"

# Bagimliliklari kontrol et
if (!(Test-Path "node_modules")) {
    Write-Host "API bagimliliklari yukleniyor..." -ForegroundColor Yellow
    npm install
}

# Prisma generate
Write-Host "Prisma client generate ediliyor..." -ForegroundColor Yellow
npx prisma generate

# Environment dosyasini kontrol et
if (!(Test-Path "../../.env")) {
    Write-Host "HATA: .env dosyasi bulunamadi!" -ForegroundColor Red
    exit 1
}

Write-Host "API servisi baslatiliyor (Port 3000)..." -ForegroundColor Green
Write-Host "API Docs: http://localhost:3000/docs" -ForegroundColor Cyan
Write-Host "Health Check: http://localhost:3000/health" -ForegroundColor Cyan

# API servisini başlat
$env:PORT=3000; npm run dev
