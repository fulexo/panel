# Simple API Compatibility Test
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000/api"

Write-Host "=== API COMPATIBILITY TEST ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "Step 1: Authentication..." -ForegroundColor Yellow
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $loginJson = '{"email":"admin@fulexo.com","password":"demo123"}'
    $login = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginJson -WebSession $session -UseBasicParsing
    Write-Host "Success: Authenticated" -ForegroundColor Green
} catch {
    Write-Host "Failed: Authentication error" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Testing Endpoints..." -ForegroundColor Yellow
Write-Host ""

# Define endpoints
$endpoints = @(
    "/auth/me",
    "/users",
    "/tenants",
    "/products",
    "/orders",
    "/orders/stats/summary",
    "/customers",
    "/inventory/approvals",
    "/inventory/stock-levels",
    "/stores",
    "/shipments",
    "/returns",
    "/billing/invoices",
    "/calendar/events",
    "/support/tickets",
    "/reports/dashboard",
    "/settings",
    "/woo/stores",
    "/search?q=test",
    "/requests",
    "/inbound/shipments",
    "/invoices",
    "/health"
)

$success = 0
$failed = 0
$warning = 0

foreach ($path in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$path" -WebSession $session -UseBasicParsing -TimeoutSec 5
        $success++
        Write-Host "OK    $path" -ForegroundColor Green
    } catch {
        $code = 0
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
        
        if ($code -eq 404 -or $code -eq 400) {
            $warning++
            Write-Host "WARN  $path (status: $code)" -ForegroundColor Yellow
        } else {
            $failed++
            Write-Host "FAIL  $path (status: $code)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total:    $($endpoints.Count)" -ForegroundColor White
Write-Host "Success:  $success" -ForegroundColor Green
Write-Host "Warnings: $warning" -ForegroundColor Yellow
Write-Host "Failed:   $failed" -ForegroundColor Red
Write-Host ""

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}

