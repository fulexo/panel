# Web Uygulaması Başlatıcı
# Kullanım: .\start-web.ps1
Write-Host "🌐 Web uygulaması başlatılıyor..." -ForegroundColor Yellow

# Web dizinine git
Set-Location "apps/web"

# Bağımlılıkları kontrol et
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Bağımlılıklar yükleniyor..." -ForegroundColor Yellow
    npm install
}

# Environment dosyasini hazirla
$envContent = @"
NODE_ENV=development
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "🚀 Web uygulaması başlatılıyor (Port 3001)..." -ForegroundColor Green
Write-Host "🌐 Panel: http://localhost:3001" -ForegroundColor Cyan
$env:PORT=3001; npm run dev