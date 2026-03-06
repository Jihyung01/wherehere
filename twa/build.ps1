# WhereHere TWA build script (PowerShell)
# Prerequisites: Node.js, Java JDK 11+, Android SDK, bubblewrap-cli
#   npm i -g @bubblewrap/cli

$ErrorActionPreference = "Stop"
$twaDir = $PSScriptRoot
$manifestUrl = "https://wherehere-seven.vercel.app/manifest.webmanifest"

Push-Location $twaDir

# Bubblewrap: use npx if not in PATH (no global install needed)
$bubblewrap = Get-Command bubblewrap -ErrorAction SilentlyContinue
if (-not $bubblewrap) { $bubblewrap = Get-Command npx -ErrorAction SilentlyContinue; $bubblewrapArgs = @("--yes", "@bubblewrap/cli") } else { $bubblewrapArgs = @() }

# 1. Init Android project if not present
if (-not (Test-Path "android")) {
    Write-Host "Running bubblewrap init..."
    if (-not $bubblewrap) {
        Write-Host "Node/npx not found. Install Node.js from https://nodejs.org and run this script again." -ForegroundColor Red
        Pop-Location; exit 1
    }
    & $bubblewrap.Source @bubblewrapArgs init --manifest $manifestUrl
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
}

# 2. Check keystore
if (-not (Test-Path "keystore.jks")) {
    Write-Host ""
    Write-Host "ERROR: keystore.jks not found. Create it first:" -ForegroundColor Red
    Write-Host '  keytool -genkey -v -keystore twa/keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000'
    Write-Host ""
    Write-Host "Then update frontend-app/public/.well-known/assetlinks.json with your SHA-256:"
    Write-Host '  keytool -list -v -keystore twa/keystore.jks -alias wherehere'
    Write-Host "  Replace __FINGERPRINT_PLACEHOLDER__ with the SHA256 value (with colons)."
    Pop-Location
    exit 1
}

# 3. Build
Write-Host "Running bubblewrap build..."
if (-not $bubblewrap) {
    Write-Host "Node/npx not found. Install Node.js and run again." -ForegroundColor Red
    Pop-Location; exit 1
}
& $bubblewrap.Source @bubblewrapArgs build
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "Build succeeded. Outputs:" -ForegroundColor Green
    Write-Host "  APK: twa/android/app/build/outputs/apk/release/app-release.apk"
    Write-Host "  AAB: twa/android/app/build/outputs/bundle/release/app-release.aab  (for Play Store)"
}
exit $exitCode
