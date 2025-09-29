# Web uygulamasini port 3001'de baslat
Write-Host "Web uygulamasi port 3001'de baslatiliyor..." -ForegroundColor Yellow

# Web dizinine git
Set-Location "apps/web"

# Environment dosyasini hazirla (port 3001 icin)
$envContent = @"
NODE_ENV=development
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
PORT=3001
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -Force

Write-Host "Environment dosyasi hazirland: PORT=3001" -ForegroundColor Green
Write-Host "Web uygulamasi baslatiliyor (Port 3001)..." -ForegroundColor Green

# Port 3001'de başlat
$env:PORT = "3001"
npm run dev
