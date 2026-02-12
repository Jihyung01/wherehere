# Start Frontend Server
Write-Host "🚀 Starting WhereHere Frontend Server..." -ForegroundColor Cyan
Write-Host ""

# Check environment file
if (-Not (Test-Path "frontend-app\.env.local")) {
    Write-Host "❌ frontend-app\.env.local file not found!" -ForegroundColor Red
    Write-Host "   Please copy frontend-app\.env.local.example to frontend-app\.env.local and fill in the values" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green
Write-Host ""

# Navigate to frontend directory
Set-Location frontend-app

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencies OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Starting Next.js development server on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
npm run dev
