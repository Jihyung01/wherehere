# WhereHere TWA - 키스토어 생성 스크립트 (Windows)
# keytool이 PATH에 없을 때 자주 쓰는 경로에서 찾아 실행합니다.

$ErrorActionPreference = "Stop"
$twaDir = $PSScriptRoot

function Find-Keytool {
    # 1) PATH
    $kt = Get-Command keytool -ErrorAction SilentlyContinue
    if ($kt) { return $kt.Source }

    # 2) JAVA_HOME
    $jh = $env:JAVA_HOME
    if ($jh) {
        $path = Join-Path $jh "bin\keytool.exe"
        if (Test-Path $path) { return $path }
    }

    # 3) Program Files - Java
    $javaDirs = Get-ChildItem "C:\Program Files\Java" -Directory -ErrorAction SilentlyContinue
    foreach ($d in $javaDirs) {
        $path = Join-Path $d.FullName "bin\keytool.exe"
        if (Test-Path $path) { return $path }
    }

    # 4) Eclipse Adoptium
    $adopt = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue
    foreach ($d in $adopt) {
        $path = Join-Path $d.FullName "bin\keytool.exe"
        if (Test-Path $path) { return $path }
    }

    # 5) Android Studio JBR
    $asJbr = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
    if (Test-Path $asJbr) { return $asJbr }

    return $null
}

Push-Location $twaDir

$keytool = Find-Keytool
if (-not $keytool) {
    Write-Host ""
    Write-Host "keytool을 찾을 수 없습니다. Java JDK가 필요합니다." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. JDK 설치: https://adoptium.net 에서 Windows x64 JDK 17 LTS 다운로드"
    Write-Host "2. 설치 시 'Add to PATH' 옵션 체크"
    Write-Host "3. PowerShell을 닫았다가 다시 연 뒤 이 스크립트를 다시 실행하세요."
    Write-Host ""
    Write-Host "또는 JDK를 설치한 뒤 아래처럼 전체 경로로 실행할 수 있습니다:"
    Write-Host '  & "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot\bin\keytool.exe" -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000'
    Write-Host ""
    Pop-Location
    exit 1
}

Write-Host "keytool 사용: $keytool"
Write-Host ""

& $keytool -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=WhereHere, O=WhereHere, C=KR"
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "키스토어가 생성되었습니다: twa\keystore.jks" -ForegroundColor Green
    Write-Host "다음: SHA-256을 assetlinks.json에 등록하세요."
    Write-Host "  .\create-keystore.ps1  대신 아래 명령으로 SHA-256 확인:"
    Write-Host "  & `"$keytool`" -list -v -keystore keystore.jks -alias wherehere"
    Write-Host "  출력에서 'SHA256:' 줄을 복사해 frontend-app/public/.well-known/assetlinks.json 의 __FINGERPRINT_PLACEHOLDER__ 를 교체하세요."
}
exit $exitCode
