# Kakao 장소 데이터 수집 실행 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Kakao Place Data Collection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. API 키 확인
$envFile = "..\backend\.env"
if (!(Test-Path $envFile)) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create backend/.env file first" -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch "KAKAO_REST_API_KEY=\w+") {
    Write-Host "Error: KAKAO_REST_API_KEY not set in .env" -ForegroundColor Red
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Please add your Kakao API key to backend/.env:" -ForegroundColor Yellow
    Write-Host "KAKAO_REST_API_KEY=your_api_key_here" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Get your API key from: https://developers.kakao.com/" -ForegroundColor Cyan
    exit 1
}

Write-Host "API Key: Found" -ForegroundColor Green
Write-Host ""

# 2. Python 스크립트 실행
Write-Host "Starting data collection..." -ForegroundColor Yellow
Write-Host "This may take 10-15 minutes..." -ForegroundColor Yellow
Write-Host ""

python collect_kakao_places.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Collection Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Check Supabase dashboard for new places" -ForegroundColor White
    Write-Host "2. Test API: powershell -File ..\test_api.ps1" -ForegroundColor White
    Write-Host "3. Open frontend: http://localhost:3003" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Error: Collection failed" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
}
