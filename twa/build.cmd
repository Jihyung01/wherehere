@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "MANIFEST_URL=https://wherehere-seven.vercel.app/manifest.webmanifest"

if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"

set "USE_NODE_NPX=0"
if exist "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" set "USE_NODE_NPX=1"
if "%USE_NODE_NPX%"=="1" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
    set "NPX_CLI=C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"
) else (
    set "NODE_EXE="
    set "NPX_CLI="
)

if not exist "app" if not exist "build.gradle" (
    echo Running bubblewrap init...
    if "%USE_NODE_NPX%"=="1" (
        "%NODE_EXE%" "%NPX_CLI%" --yes @bubblewrap/cli init --manifest %MANIFEST_URL%
    ) else (
        call npx --yes @bubblewrap/cli init --manifest %MANIFEST_URL%
    )
    if %ERRORLEVEL% neq 0 exit /b 1
)

if not exist "keystore.jks" (
    echo.
    echo ERROR: keystore.jks not found. Run create-keystore.cmd first.
    exit /b 1
)

echo Running bubblewrap build...
if "%USE_NODE_NPX%"=="1" (
    "%NODE_EXE%" "%NPX_CLI%" --yes @bubblewrap/cli build
) else (
    call npx --yes @bubblewrap/cli build
)
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo Build succeeded. Outputs:
echo   APK: twa\app\build\outputs\apk\release\app-release.apk
echo   AAB: twa\app\build\outputs\bundle\release\app-release.aab
exit /b 0
