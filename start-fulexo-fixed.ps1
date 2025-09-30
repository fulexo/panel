# Fulexo Platform Starter Script
# Bu script tum servisleri localhost'ta baslatir

Write-Host "Fulexo Platform Baslatiliyor..." -ForegroundColor Green

# 1. Docker servislerini kontrol et ve baslat
Write-Host "`nDocker servislerini kontrol ediliyor..." -ForegroundColor Yellow
Set-Location "compose"
$dockerServices = docker compose ps --services --filter "status=running"
if ($dockerServices -notcontains "postgres" -or $dockerServices -notcontains "valkey" -or $dockerServices -notcontains "minio") {
    Write-Host "Docker servisleri baslatiliyor..." -ForegroundColor Yellow
    docker compose up -d postgres valkey minio
    Start-Sleep -Seconds 10
}
else {
    Write-Host "Docker servisleri zaten calisiyor" -ForegroundColor Green
}
Set-Location ".."

# 2. API bagimliliklarini yukle ve baslat
Write-Host "`nAPI servisi hazirlaniyor..." -ForegroundColor Yellow
Set-Location "apps/api"
if (!(Test-Path "node_modules")) {
    Write-Host "API bagimliliklari yukleniyor..." -ForegroundColor Yellow
    npm install
}

# Prisma generate
npx prisma generate

Write-Host "API servisi baslatiliyor (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 3. Web bagimliliklarini yukle ve baslat
Write-Host "`nWeb uygulamasi hazirlaniyor..." -ForegroundColor Yellow
Set-Location "apps/web"
if (!(Test-Path "node_modules")) {
    Write-Host "Web bagimliliklari yukleniyor..." -ForegroundColor Yellow
    npm install
}

Write-Host "Web uygulamasi baslatiliyor (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 4. Worker bagimliliklarini yukle ve baslat
Write-Host "`nWorker servisi hazirlaniyor..." -ForegroundColor Yellow
Set-Location "apps/worker"
if (!(Test-Path "node_modules")) {
    Write-Host "Worker bagimliliklari yukleniyor..." -ForegroundColor Yellow
    npm install
}

Write-Host "Worker servisi baslatiliyor (Port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 5. Servislerin baslamasini bekle
Write-Host "`nServisler baslatiliyor... (30 saniye bekleniyor)" -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 6. Servis durumlarini kontrol et
Write-Host "`nServis durumlari kontrol ediliyor..." -ForegroundColor Yellow

# API Health Check
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
    Write-Host "API Servisi: Calisiyor (Port 3000)" -ForegroundColor Green
    Write-Host "   API Docs: http://localhost:3000/docs" -ForegroundColor Cyan
} catch {
    Write-Host "API Servisi: Yanit vermiyor (Port 3000)" -ForegroundColor Red
}

# Web App Check
try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 10
    Write-Host "Web Uygulamasi: Calisiyor (Port 3001)" -ForegroundColor Green
    Write-Host "   Panel: http://localhost:3001" -ForegroundColor Cyan
} catch {
    Write-Host "Web Uygulamasi: Yanit vermiyor (Port 3001)" -ForegroundColor Red
}

# Worker Check (port kontrolu)
$workerPort = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($workerPort) {
    Write-Host "Worker Servisi: Calisiyor (Port 3002)" -ForegroundColor Green
} else {
    Write-Host "Worker Servisi: Yanit vermiyor (Port 3002)" -ForegroundColor Red
}

# Docker Services Check
Write-Host "`nDocker Servisleri:" -ForegroundColor Yellow
Write-Host "   PostgreSQL: http://localhost:5433" -ForegroundColor Cyan
Write-Host "   Redis: localhost:6380" -ForegroundColor Cyan
Write-Host "   MinIO: http://localhost:9001" -ForegroundColor Cyan

Write-Host "`nFulexo Platform baslatma tamamlandi!" -ForegroundColor Green
Write-Host "`nGiris Bilgileri:" -ForegroundColor Yellow
Write-Host "   Admin: admin@fulexo.com / admin123" -ForegroundColor White
Write-Host "   Customer: customer@fulexo.com / customer123" -ForegroundColor White

Write-Host "`nAna Panel: http://localhost:3001" -ForegroundColor Magenta -BackgroundColor Black
Write-Host "API Dokumantasyonu: http://localhost:3000/docs" -ForegroundColor Magenta -BackgroundColor Black

Write-Host "`nServisleri durdurmak icin tum PowerShell pencerelerini kapatabilirsiniz." -ForegroundColor Gray
