# Fulexo Platform Starter Script
# Bu script tüm servisleri localhost'ta başlatır
# Kullanım: .\start-fulexo.ps1

Write-Host "🚀 Fulexo Platform Başlatılıyor..." -ForegroundColor Green

# 1. Docker servislerini kontrol et ve başlat
Write-Host "`n📦 Docker servislerini kontrol ediliyor..." -ForegroundColor Yellow
Set-Location "compose"
$dockerServices = docker compose ps --services --filter "status=running"
if ($dockerServices -notcontains "postgres" -or $dockerServices -notcontains "valkey" -or $dockerServices -notcontains "minio") {
    Write-Host "Docker servisleri başlatılıyor..." -ForegroundColor Yellow
    docker compose up -d postgres valkey minio
    Start-Sleep -Seconds 10
}
else {
    Write-Host "✅ Docker servisleri zaten çalışıyor" -ForegroundColor Green
}
Set-Location ".."

# 2. API bağımlılıklarını yükle ve başlat
Write-Host "`n🔧 API servisi hazırlanıyor..." -ForegroundColor Yellow
Set-Location "apps/api"
if (!(Test-Path "node_modules")) {
    Write-Host "API bağımlılıkları yükleniyor..." -ForegroundColor Yellow
    npm install
}

# Prisma generate
npx prisma generate

Write-Host "API servisi başlatılıyor (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 3. Web bağımlılıklarını yükle ve başlat
Write-Host "`n🌐 Web uygulaması hazırlanıyor..." -ForegroundColor Yellow
Set-Location "apps/web"
if (!(Test-Path "node_modules")) {
    Write-Host "Web bağımlılıkları yükleniyor..." -ForegroundColor Yellow
    npm install
}

Write-Host "Web uygulaması başlatılıyor (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 4. Worker bağımlılıklarını yükle ve başlat
Write-Host "`n⚙️ Worker servisi hazırlanıyor..." -ForegroundColor Yellow
Set-Location "apps/worker"
if (!(Test-Path "node_modules")) {
    Write-Host "Worker bağımlılıkları yükleniyor..." -ForegroundColor Yellow
    npm install
}

Write-Host "Worker servisi başlatılıyor (Port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-WindowStyle", "Normal", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
Set-Location "../.."

# 5. Servislerin başlamasını bekle
Write-Host "`n⏳ Servisler başlatılıyor... (30 saniye bekleniyor)" -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 6. Servis durumlarını kontrol et
Write-Host "`n🔍 Servis durumları kontrol ediliyor..." -ForegroundColor Yellow

# API Health Check
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
    Write-Host "✅ API Servisi: Çalışıyor (Port 3000)" -ForegroundColor Green
    Write-Host "   📋 API Docs: http://localhost:3000/docs" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API Servisi: Yanıt vermiyor (Port 3000)" -ForegroundColor Red
}

# Web App Check
try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 10
    Write-Host "✅ Web Uygulaması: Çalışıyor (Port 3001)" -ForegroundColor Green
    Write-Host "   🌐 Panel: http://localhost:3001" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Web Uygulaması: Yanıt vermiyor (Port 3001)" -ForegroundColor Red
}

# Worker Check (port kontrolü)
$workerPort = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($workerPort) {
    Write-Host "✅ Worker Servisi: Çalışıyor (Port 3002)" -ForegroundColor Green
} else {
    Write-Host "❌ Worker Servisi: Yanıt vermiyor (Port 3002)" -ForegroundColor Red
}

# Docker Services Check
Write-Host "`n🐳 Docker Servisleri:" -ForegroundColor Yellow
Write-Host "   📊 PostgreSQL: http://localhost:5433" -ForegroundColor Cyan
Write-Host "   🔴 Redis: localhost:6380" -ForegroundColor Cyan
Write-Host "   📁 MinIO: http://localhost:9001" -ForegroundColor Cyan

Write-Host "`n🎉 Fulexo Platform başlatma tamamlandı!" -ForegroundColor Green
Write-Host "`n📋 Giriş Bilgileri:" -ForegroundColor Yellow
Write-Host "   👤 Admin: admin@fulexo.com / admin123" -ForegroundColor White
Write-Host "   👥 Customer: customer@fulexo.com / customer123" -ForegroundColor White

Write-Host "`n🌐 Ana Panel: http://localhost:3001" -ForegroundColor Magenta -BackgroundColor Black
Write-Host "📚 API Dokümantasyonu: http://localhost:3000/docs" -ForegroundColor Magenta -BackgroundColor Black

Write-Host "`nServisleri durdurmak icin tum PowerShell pencerelerini kapatabilirsiniz." -ForegroundColor Gray
