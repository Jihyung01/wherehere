# WhereHere Development Server Startup Script
# Run this script to start both frontend and backend servers

Write-Host "🚀 Starting WhereHere Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

# Check frontend dependencies
if (-Not (Test-Path "frontend-app\node_modules")) {
    Write-Host "⚠️  Frontend dependencies not installed. Running npm install..." -ForegroundColor Yellow
    Set-Location frontend-app
    npm install
    Set-Location ..
} else {
    Write-Host "✅ Frontend dependencies OK" -ForegroundColor Green
}

# Check backend dependencies
Write-Host "⚠️  Checking backend dependencies..." -ForegroundColor Yellow
Write-Host "   (If packages are missing, run: pip install -r backend\requirements.txt)" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 Starting servers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will run on: http://localhost:8000" -ForegroundColor Blue
Write-Host "Frontend will run on: http://localhost:3000" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  IMPORTANT: Open TWO separate terminals and run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Magenta
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python main.py" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Magenta
Write-Host "  cd frontend-app" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use the individual scripts:" -ForegroundColor Yellow
Write-Host "  .\start-backend.ps1" -ForegroundColor White
Write-Host "  .\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
