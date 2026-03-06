@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "KEYTOOL="
if defined JAVA_HOME (
  if exist "%JAVA_HOME%\bin\keytool.exe" set "KEYTOOL=%JAVA_HOME%\bin\keytool.exe"
)
if defined KEYTOOL goto :found
for /d %%D in ("C:\Program Files\Java\jdk*") do (
  if exist "%%D\bin\keytool.exe" set "KEYTOOL=%%D\bin\keytool.exe" & goto :found
)
for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk*") do (
  if exist "%%D\bin\keytool.exe" set "KEYTOOL=%%D\bin\keytool.exe" & goto :found
)
if exist "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" set "KEYTOOL=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

:found
if "%KEYTOOL%"=="" (
  echo.
  echo keytool을 찾을 수 없습니다. Java JDK가 필요합니다.
  echo.
  echo 1. https://adoptium.net 에서 Windows x64 JDK 17 LTS 설치
  echo 2. 설치 시 "Add to PATH" 체크 후, CMD/PowerShell을 새로 열고 다시 실행
  echo.
  echo 또는 JDK가 다른 경로에 있다면:
  echo   "C:\Program Files\Java\jdk-17\bin\keytool.exe" -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000
  echo.
  exit /b 1
)

echo keytool 사용: %KEYTOOL%
echo.
"%KEYTOOL%" -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=WhereHere, O=WhereHere, C=KR"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo 키스토어 생성됨: twa\keystore.jks
echo 다음: SHA-256 확인 후 assetlinks.json 에 등록하세요.
echo   "%KEYTOOL%" -list -v -keystore keystore.jks -alias wherehere
echo   출력의 SHA256: 값을 frontend-app\public\.well-known\assetlinks.json 의 __FINGERPRINT_PLACEHOLDER__ 에 넣으세요.
exit /b 0
