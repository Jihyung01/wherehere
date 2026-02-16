# Visits API Test Script

Write-Host "=== Visits API Test ===" -ForegroundColor Cyan
Write-Host ""

# 1. Test fetching visits
Write-Host "1. Fetching visits for user-demo-001..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001" -Method Get
    
    Write-Host "Total visits: $($response.total_count)" -ForegroundColor Green
    Write-Host ""
    
    if ($response.visits.Count -gt 0) {
        Write-Host "Recent visits:" -ForegroundColor Cyan
        foreach ($visit in $response.visits) {
            Write-Host "  - $($visit.place_name)" -ForegroundColor White
            Write-Host "    Category: $($visit.category)" -ForegroundColor Gray
            Write-Host "    Duration: $($visit.duration_minutes) min" -ForegroundColor Gray
            Write-Host "    XP: +$($visit.xp_earned)" -ForegroundColor Green
            Write-Host ""
        }
    } else {
        Write-Host "  No visits yet." -ForegroundColor Yellow
        Write-Host "  Please run CREATE_VISITS_TABLE.sql in Supabase." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
