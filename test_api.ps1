$body = @{
    role_type = "explorer"
    current_location = @{
        latitude = 37.5665
        longitude = 126.9780
    }
    user_level = 5
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/recommendations" -Method Post -Body $body -ContentType "application/json"

Write-Host "=== Recommendations Test ===" -ForegroundColor Green
Write-Host "Data Source: $($response.data_source)"
Write-Host "Total Candidates: $($response.total_candidates)"
Write-Host ""

foreach ($rec in $response.recommendations) {
    Write-Host "Place: $($rec.name)" -ForegroundColor Yellow
    Write-Host "  Distance: $($rec.distance_meters)m"
    Write-Host "  Score: $($rec.score)"
    Write-Host "  Category: $($rec.category)"
    Write-Host ""
}
