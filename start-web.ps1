# Web uygulamasini baslat
Write-Host "Web uygulamasi baslatiliyor..." -ForegroundColor Yellow

# Web dizinine git
Set-Location "apps/web"

# Bagimliliklari kontrol et
if (!(Test-Path "node_modules")) {
    Write-Host "Bagimliliklar yukleniyor..." -ForegroundColor Yellow
    npm install
}

# Environment dosyasini hazirla
$envContent = @"
NODE_ENV=development
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "Web uygulamasi baslatiliyor (Port 3001)..." -ForegroundColor Green
$env:PORT=3001; npm run dev