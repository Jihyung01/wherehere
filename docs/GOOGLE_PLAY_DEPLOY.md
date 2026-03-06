# Google Play 배포 가이드 (WhereHere TWA)

TWA(Trusted Web Activity)로 패키징한 후 Google Play에 제출하는 절차입니다.

---

## 1. 사전 준비

| 항목 | 설명 |
|------|------|
| **Google Play 개발자 계정** | 한 번만 등록 (약 $25) — [Play Console](https://play.google.com/console) |
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **Java JDK 11+** | [adoptium.net](https://adoptium.net) |
| **Android SDK** | Android Studio 설치 또는 커맨드라인 도구 |
| **Bubblewrap** | `npm i -g @bubblewrap/cli` |

---

## 2. 키스토어 생성 (최초 1회)

### Windows – 가장 쉬운 방법 (실행 정책 무관)

**배치 파일(.cmd)** 은 PowerShell 실행 정책 영향을 받지 않습니다. JDK만 설치돼 있으면 됩니다.

```powershell
cd C:\Users\SAMSUNG\wherehere\twa
.\create-keystore.cmd
```

> **PowerShell 사용 시**: 현재 폴더의 파일을 실행하려면 반드시 `.\` 를 앞에 붙여야 합니다. (`create-keystore.cmd` 만 입력하면 "인식되지 않습니다" 오류가 납니다.)

- JDK가 **아직 없다면**: [Adoptium](https://adoptium.net) 에서 Windows x64 JDK 17 설치 → 설치 후 **CMD 창을 새로 연 뒤** 위 명령 다시 실행.
- "keytool을 찾을 수 없습니다"가 나오면: JDK 설치 경로(예: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot\bin\keytool.exe`)를 확인해 문서 아래 "경로로 직접 실행"을 따르세요.

---

### PowerShell 스크립트(.ps1) 사용 시 – "스크립트를 실행할 수 없습니다" 오류

PowerShell에서 `.\create-keystore.ps1` 실행 시 **실행 정책** 때문에 차단될 수 있습니다.

**해결 1 – 현재 사용자만 허용 (한 번만 실행)**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

이후 `.\create-keystore.ps1` 다시 실행.

**해결 2 – 이번 한 번만 우회**

```powershell
powershell -ExecutionPolicy Bypass -File .\create-keystore.ps1
```

**해결 3 – 배치 파일 사용 (권장)**  
위처럼 `create-keystore.cmd` 를 쓰면 실행 정책과 무관하게 동작합니다.

---

### Windows에서 `keytool`을 찾는 방법 (수동)

`keytool`은 **Java JDK**에 포함되어 있어, PATH에 없으면 `keytool` 이라고만 입력해도 인식되지 않습니다.

**JDK가 설치된 경로 예시**

- `C:\Program Files\Java\jdk-17\bin\keytool.exe`
- `C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot\bin\keytool.exe`
- `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe` (Android Studio 설치 시)

**경로를 알고 있을 때 – 전체 경로로 실행**

```powershell
cd C:\Users\SAMSUNG\wherehere\twa
& "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\keytool.exe" -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000
```

(위 경로는 예시이므로, 본인 PC의 JDK 폴더명에 맞게 수정하세요. `Eclipse Adoptium` 설치 시 버전 번호가 붙은 폴더가 생깁니다.)

---

**키스토어 생성 명령 (PATH에 Java가 있을 때)**

```powershell
cd twa
keytool -genkey -v -keystore keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000
```

- 비밀번호와 이름 등 입력 후 **keystore.jks**를 안전한 곳에 백업하세요. (분실 시 앱 업데이트 불가)

---

## 3. SHA-256 등록 (TWA 인증)

```powershell
keytool -list -v -keystore twa/keystore.jks -alias wherehere
```

출력에서 **SHA256:** 줄을 복사한 뒤,  
`frontend-app/public/.well-known/assetlinks.json` 안의  
`__FINGERPRINT_PLACEHOLDER__` 를 **콜론(:) 포함한 그대로** 교체합니다.

예: `AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78`

이후 **Vercel에 재배포**하여  
`https://wherehere-seven.vercel.app/.well-known/assetlinks.json` 이 새 값을 반환하도록 합니다.

---

## 4. TWA 빌드

```powershell
cd twa
.\build.ps1
```

또는 수동:

```powershell
cd twa
bubblewrap init --manifest https://wherehere-seven.vercel.app/manifest.webmanifest
bubblewrap build
```

생성물:
- **APK**: `twa/android/app/build/outputs/apk/release/app-release.apk` (직접 설치용)
- **AAB**: `twa/android/app/build/outputs/bundle/release/app-release.aab` (Play 제출용)

---

## 5. Google Play Console에서 앱 등록

1. [Play Console](https://play.google.com/console) 로그인 후 **앱 만들기** 선택.
2. **앱 이름**: WhereHere (동네 탐험)
3. **기본 앱 설정**: 앱/게임 선택, 무료/유료 선택.
4. **정책 및 약관** 동의 후 **앱 만들기**.

---

## 6. 스토어 등록정보 입력

- **앱 이름**: WhereHere - 동네 탐험
- **간단한 설명** (80자): 예) AI가 추천하는 오늘의 한 곳, 동네 정복 지도, 퀘스트로 XP 쌓기.
- **상세 설명** (4000자 이내): 기능 소개, 사용 방법 등.
- **앱 아이콘**: 512×512 PNG (프로젝트의 `frontend-app/public/app-icon.png` 또는 `/icons/icon-512.png` 사용).
- **기능 그래픽** (선택): 1024×500.
- **스크린샷**: 휴대폰 2장 이상 (최소 320px, 최대 3840px).

---

## 7. AAB 업로드 및 출시

1. **출시** → **프로덕션** (또는 **내부/비공개 테스트**로 먼저 테스트).
2. **새 버전 만들기** → **앱 번들 업로드**에서 위에서 만든 **app-release.aab** 선택.
3. **버전 이름**: 1.0.0 (또는 twa-manifest.json의 appVersionName과 맞춤).
4. **출시 노트** 작성 후 **다음** → **출시 검토** 제출.

---

## 8. 필수 정책 체크

- **개인정보처리방침 URL**: 앱/웹에 공개된 URL 필요.
- **앱 액세스**: 로그인 없이 사용 가능한지, 테스트 계정 필요 시 제공.
- **광고**: 광고 사용 시 “광고 포함” 선택.
- **콘텐츠 등급**: 설문 후 등급 받기.
- **타겟 연령/대상**: 설정.

---

## 9. 검토 후 배포

제출 후 보통 **몇 시간~며칠** 내에 검토됩니다.  
승인되면 선택한 트랙(내부/비공개/프로덕션)에 따라 스토어에 노출됩니다.

---

## 요약 체크리스트

- [ ] 키스토어 생성 및 백업
- [ ] assetlinks.json에 SHA-256 반영 후 Vercel 배포
- [ ] `twa/build.ps1` 또는 `bubblewrap build`로 AAB 생성
- [ ] Play Console 앱 등록 및 스토어 등록정보 입력
- [ ] AAB 업로드 후 출시 검토 제출
- [ ] 개인정보처리방침·콘텐츠 등급 등 정책 완료
