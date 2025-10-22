# Backend-Frontend API Compatibility Test Script
# Tests all API endpoints and documents compatibility

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000/api"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n=== FULEXO PLATFORM - API COMPATIBILITY TEST ===`n" -ForegroundColor Cyan

# Step 1: Login and get session
Write-Host "Step 1: Authenticating..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@fulexo.com"
        password = "demo123"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -WebSession $session `
        -UseBasicParsing

    Write-Host "✓ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Define all endpoints to test
$endpoints = @(
    # Auth endpoints
    @{Method="GET"; Path="/auth/me"; Category="Auth"; Description="Get current user"},
    
    # Users endpoints
    @{Method="GET"; Path="/users"; Category="Users"; Description="List users"},
    @{Method="GET"; Path="/users/stats"; Category="Users"; Description="User statistics"},
    
    # Tenants endpoints
    @{Method="GET"; Path="/tenants"; Category="Tenants"; Description="List tenants"},
    @{Method="GET"; Path="/tenants/current"; Category="Tenants"; Description="Get current tenant"},
    
    # Products endpoints
    @{Method="GET"; Path="/products"; Category="Products"; Description="List products"},
    @{Method="GET"; Path="/products?limit=10"; Category="Products"; Description="List products limited"},
    
    # Orders endpoints
    @{Method="GET"; Path="/orders"; Category="Orders"; Description="List orders"},
    @{Method="GET"; Path="/orders/stats/summary"; Category="Orders"; Description="Order statistics"},
    @{Method="GET"; Path="/orders/pending-approvals"; Category="Orders"; Description="Pending order approvals"},
    
    # Customers endpoints
    @{Method="GET"; Path="/customers"; Category="Customers"; Description="List customers"},
    
    # Inventory endpoints
    @{Method="GET"; Path="/inventory/approvals"; Category="Inventory"; Description="Inventory approvals"},
    @{Method="GET"; Path="/inventory/stock-levels"; Category="Inventory"; Description="Stock levels"},
    
    # Stores endpoints
    @{Method="GET"; Path="/stores"; Category="Stores"; Description="List stores"},
    
    # Shipments endpoints
    @{Method="GET"; Path="/shipments"; Category="Shipments"; Description="List shipments"},
    @{Method="GET"; Path="/shipments/carriers"; Category="Shipments"; Description="List carriers"},
    
    # Returns endpoints
    @{Method="GET"; Path="/returns"; Category="Returns"; Description="List returns"},
    
    # Billing endpoints
    @{Method="GET"; Path="/billing/invoices"; Category="Billing"; Description="List invoices"},
    @{Method="GET"; Path="/billing/invoices/stats"; Category="Billing"; Description="Invoice statistics"},
    
    # Calendar endpoints
    @{Method="GET"; Path="/calendar/events"; Category="Calendar"; Description="List events"},
    
    # Support endpoints
    @{Method="GET"; Path="/support/tickets"; Category="Support"; Description="List tickets"},
    @{Method="GET"; Path="/support/tickets/stats"; Category="Support"; Description="Ticket statistics"},
    
    # Reports endpoints
    @{Method="GET"; Path="/reports/dashboard"; Category="Reports"; Description="Dashboard reports"},
    @{Method="GET"; Path="/reports/sales"; Category="Reports"; Description="Sales reports"},
    @{Method="GET"; Path="/reports/inventory"; Category="Reports"; Description="Inventory reports"},
    
    # Settings endpoints
    @{Method="GET"; Path="/settings"; Category="Settings"; Description="Get settings"},
    @{Method="GET"; Path="/settings/carriers"; Category="Settings"; Description="Carrier settings"},
    @{Method="GET"; Path="/settings/notifications"; Category="Settings"; Description="Notification settings"},
    
    # Woo endpoints
    @{Method="GET"; Path="/woo/stores"; Category="WooCommerce"; Description="List WooCommerce stores"},
    
    # Health endpoints
    @{Method="GET"; Path="/health"; Category="System"; Description="Health check"},
    @{Method="GET"; Path="/metrics"; Category="System"; Description="Metrics"},
    
    # Monitoring endpoints
    @{Method="GET"; Path="/monitoring/health"; Category="Monitoring"; Description="System health"},
    @{Method="GET"; Path="/monitoring/logs"; Category="Monitoring"; Description="System logs"},
    
    # Search endpoint
    @{Method="GET"; Path="/search?q=test"; Category="Search"; Description="Global search"},
    
    # Requests endpoints
    @{Method="GET"; Path="/requests"; Category="Requests"; Description="List requests"},
    
    # Inbound endpoints
    @{Method="GET"; Path="/inbound/shipments"; Category="Inbound"; Description="List inbound shipments"},
    
    # Invoices endpoints
    @{Method="GET"; Path="/invoices"; Category="Invoices"; Description="List invoices"},
    
    # Policy endpoints
    @{Method="GET"; Path="/policy/return"; Category="Policy"; Description="Return policy"},
    @{Method="GET"; Path="/policy/shipping"; Category="Policy"; Description="Shipping policy"},
    
    # File upload endpoints
    @{Method="GET"; Path="/file-upload/files"; Category="FileUpload"; Description="List files"}
)

# Step 3: Test all endpoints
Write-Host "`nStep 2: Testing $($endpoints.Count) API endpoints...`n" -ForegroundColor Yellow

$results = @()
$categoryStats = @{}

foreach ($endpoint in $endpoints) {
    $uri = "$baseUrl$($endpoint.Path)"
    $result = @{
        Category = $endpoint.Category
        Method = $endpoint.Method
        Path = $endpoint.Path
        Description = $endpoint.Description
        Status = ""
        StatusCode = 0
        ResponseTime = 0
        Error = ""
    }
    
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $uri `
            -Method $endpoint.Method `
            -WebSession $session `
            -UseBasicParsing `
            -TimeoutSec 10
        $sw.Stop()
        
        $result.StatusCode = $response.StatusCode
        $result.ResponseTime = $sw.ElapsedMilliseconds
        $result.Status = "✓ Success"
        
        Write-Host "✓ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path)" -ForegroundColor Green
        
    } catch {
        $sw.Stop()
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        
        $result.StatusCode = $statusCode
        $result.ResponseTime = $sw.ElapsedMilliseconds
        $result.Error = $_.Exception.Message
        
        if ($statusCode -eq 404) {
            $result.Status = "⚠ Not Found"
            Write-Host "⚠ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path) - 404" -ForegroundColor Yellow
        } elseif ($statusCode -eq 400) {
            $result.Status = "⚠ Bad Request"
            Write-Host "⚠ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path) - 400 (might need params)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            $result.Status = "✗ Unauthorized"
            Write-Host "✗ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path) - $statusCode" -ForegroundColor Red
        } elseif ($statusCode -eq 500) {
            $result.Status = "✗ Server Error"
            Write-Host "✗ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path) - 500" -ForegroundColor Red
        } else {
            $result.Status = "✗ Error"
            Write-Host "✗ $($endpoint.Category.PadRight(15)) $($endpoint.Method.PadRight(6)) $($endpoint.Path) - $statusCode" -ForegroundColor Red
        }
    }
    
    $results += $result
    
    # Update category stats
    if (-not $categoryStats.ContainsKey($endpoint.Category)) {
        $categoryStats[$endpoint.Category] = @{Total=0; Success=0; Warning=0; Error=0}
    }
    $categoryStats[$endpoint.Category].Total++
    if ($result.StatusCode -ge 200 -and $result.StatusCode -lt 300) {
        $categoryStats[$endpoint.Category].Success++
    } elseif ($result.StatusCode -eq 404 -or $result.StatusCode -eq 400) {
        $categoryStats[$endpoint.Category].Warning++
    } else {
        $categoryStats[$endpoint.Category].Error++
    }
}

# Step 4: Generate summary report
Write-Host "`n=== TEST SUMMARY ===`n" -ForegroundColor Cyan

$totalTests = $results.Count
$successTests = ($results | Where-Object { $_.StatusCode -ge 200 -and $_.StatusCode -lt 300 }).Count
$warningTests = ($results | Where-Object { $_.StatusCode -eq 404 -or $_.StatusCode -eq 400 }).Count
$errorTests = ($results | Where-Object { $_.StatusCode -ge 401 -and $_.StatusCode -ne 404 -and $_.StatusCode -ne 400 }).Count

Write-Host "Total Endpoints Tested: $totalTests" -ForegroundColor White
$successPct = [math]::Round($successTests/$totalTests*100, 1)
$warningPct = [math]::Round($warningTests/$totalTests*100, 1)
$errorPct = [math]::Round($errorTests/$totalTests*100, 1)
Write-Host "Successful (200-299):   $successTests ($successPct%)" -ForegroundColor Green
Write-Host "Warnings (400, 404):    $warningTests ($warningPct%)" -ForegroundColor Yellow
Write-Host "Errors (401, 403, 500): $errorTests ($errorPct%)" -ForegroundColor Red

Write-Host "`n=== CATEGORY BREAKDOWN ===`n" -ForegroundColor Cyan

foreach ($category in $categoryStats.Keys | Sort-Object) {
    $stats = $categoryStats[$category]
    $successRate = if ($stats.Total -gt 0) { [math]::Round($stats.Success/$stats.Total*100, 1) } else { 0 }
    
    $color = "Green"
    if ($successRate -lt 50) { $color = "Red" }
    elseif ($successRate -lt 80) { $color = "Yellow" }
    
    Write-Host "$($category.PadRight(20)) Total: $($stats.Total.ToString().PadLeft(2))  Success: $($stats.Success.ToString().PadLeft(2))  Warning: $($stats.Warning.ToString().PadLeft(2))  Error: $($stats.Error.ToString().PadLeft(2))  ($successRate percent)" -ForegroundColor $color
}

# Step 5: Export results to JSON
$outputFile = "test-results/api-compatibility-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportData = @{
    TestDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Summary = @{
        TotalTests = $totalTests
        SuccessTests = $successTests
        WarningTests = $warningTests
        ErrorTests = $errorTests
        SuccessRate = [math]::Round($successTests/$totalTests*100, 2)
    }
    CategoryStats = $categoryStats
    DetailedResults = $results
}

$reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`n✓ Detailed results exported to: $outputFile" -ForegroundColor Green

# Step 6: Performance analysis
Write-Host "`n=== PERFORMANCE ANALYSIS ===`n" -ForegroundColor Cyan

$avgResponseTime = ($results | Measure-Object -Property ResponseTime -Average).Average
$maxResponseTime = ($results | Measure-Object -Property ResponseTime -Maximum).Maximum
$minResponseTime = ($results | Where-Object { $_.ResponseTime -gt 0 } | Measure-Object -Property ResponseTime -Minimum).Minimum

Write-Host "Average Response Time: $([math]::Round($avgResponseTime, 2)) ms"
Write-Host "Min Response Time:     $([math]::Round($minResponseTime, 2)) ms"
Write-Host "Max Response Time:     $([math]::Round($maxResponseTime, 2)) ms"

$slowEndpoints = $results | Where-Object { $_.ResponseTime -gt 1000 } | Sort-Object -Property ResponseTime -Descending
if ($slowEndpoints.Count -gt 0) {
    Write-Host "`n⚠ Slow endpoints (>1000ms):" -ForegroundColor Yellow
    foreach ($slow in $slowEndpoints) {
        Write-Host "  $($slow.Path) - $($slow.ResponseTime) ms" -ForegroundColor Yellow
    }
}

Write-Host "`n=== TEST COMPLETE ===`n" -ForegroundColor Cyan

# Return exit code based on critical errors
if ($errorTests -gt 0) {
    exit 1
} else {
    exit 0
}

