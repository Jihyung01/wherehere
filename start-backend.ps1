# Start Backend Server
Write-Host "🚀 Starting WhereHere Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Check environment file
if (-Not (Test-Path "backend\.env")) {
    Write-Host "❌ backend\.env file not found!" -ForegroundColor Red
    Write-Host "   Please copy backend\.env.example to backend\.env and fill in the values" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location backend

# Check if venv exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "📦 Activating virtual environment..." -ForegroundColor Yellow
    .\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️  Virtual environment not found" -ForegroundColor Yellow
    Write-Host "   If you get ModuleNotFoundError, create venv:" -ForegroundColor Gray
    Write-Host "   python -m venv venv" -ForegroundColor Gray
    Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "   pip install -r requirements.txt" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "🎯 Starting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Blue
Write-Host "💚 Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
python main.py
