# SHA-256 추출 후 assetlinks.json 자동 반영
# 사용: powershell -ExecutionPolicy Bypass -File .\update-assetlinks.ps1
# (키스토어 비밀번호 한 번 입력)

$ErrorActionPreference = "Stop"
$twaDir = $PSScriptRoot
$repoRoot = Split-Path $twaDir -Parent
$assetlinksPath = Join-Path $repoRoot "frontend-app\public\.well-known\assetlinks.json"

if (-not (Test-Path "keystore.jks")) {
    Write-Host "twa\keystore.jks 가 없습니다. 먼저 .\create-keystore.cmd 를 실행하세요." -ForegroundColor Red
    exit 1
}

$keytool = $null
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\keytool.exe")) { $keytool = "$env:JAVA_HOME\bin\keytool.exe" }
if (-not $keytool) {
    $adopt = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($adopt -and (Test-Path "$($adopt.FullName)\bin\keytool.exe")) { $keytool = "$($adopt.FullName)\bin\keytool.exe" }
}
if (-not $keytool -and (Test-Path "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe")) { $keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" }
if (-not $keytool) { $keytool = (Get-Command keytool -ErrorAction SilentlyContinue).Source }

if (-not $keytool) {
    Write-Host "keytool을 찾을 수 없습니다. JDK를 설치하거나 PATH에 추가하세요." -ForegroundColor Red
    exit 1
}

$pass = Read-Host "키 저장소 비밀번호" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
$passPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) | Out-Null

Push-Location $twaDir
$out = & $keytool -list -v -keystore keystore.jks -alias wherehere -storepass $passPlain 2>&1
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "keytool 실패 (비밀번호 확인)." -ForegroundColor Red
    exit 1
}

$shaLine = $out | Select-String -Pattern "^\s*SHA256:\s*(.+)$" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }
if (-not $shaLine) {
    Write-Host "SHA256을 찾을 수 없습니다. keytool 출력:" -ForegroundColor Red
    Write-Host $out
    exit 1
}

$json = Get-Content $assetlinksPath -Raw -Encoding UTF8
$json = $json -replace '__FINGERPRINT_PLACEHOLDER__', $shaLine
[System.IO.File]::WriteAllText($assetlinksPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "SHA256 반영 완료: $shaLine" -ForegroundColor Green
Write-Host "수정된 파일: frontend-app\public\.well-known\assetlinks.json" -ForegroundColor Green
Write-Host "다음: git add & commit 후 푸시하여 Vercel에 배포하고, .\build.ps1 로 AAB 빌드하세요." -ForegroundColor Cyan
