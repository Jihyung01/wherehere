# WhereHere TWA (Trusted Web Activity) — Android 앱

## 개요
Bubblewrap CLI를 이용해 PWA를 Google Play Store용 Android APK/AAB로 패키징합니다.
Chrome Custom Tab이 아닌 TWA로 실행되므로 브라우저 UI가 전혀 표시되지 않습니다.

---

## 사전 요구사항

| 도구 | 버전 | 설치 |
|---|---|---|
| Node.js | 18 이상 | https://nodejs.org |
| Java JDK | 11 이상 | https://adoptium.net |
| Android SDK | API 31+ | Android Studio 설치 |
| Bubblewrap CLI | latest | `npm i -g @bubblewrap/cli` |

---

## 1단계: Bubblewrap으로 Android 프로젝트 생성

```bash
cd twa/
bubblewrap init --manifest https://wherehere-seven.vercel.app/manifest.webmanifest
```

> `twa-manifest.json`이 이미 있으므로 대화형 질문 없이 바로 진행됩니다.

생성 후 디렉토리 구조:
```
twa/
  android/          ← 생성된 Android 프로젝트
  twa-manifest.json
  keystore.jks      ← 서명 키스토어 (생성 후 절대 삭제 금지)
```

---

## 2단계: 키스토어 생성 (최초 1회)

```bash
keytool -genkey -v \
  -keystore keystore.jks \
  -alias wherehere \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

⚠️ keystore.jks는 .gitignore에 포함되어 있습니다. 안전한 곳에 별도 백업하세요.

---

## 3단계: SHA-256 핑거프린트 추출 → assetlinks.json 업데이트

```bash
keytool -list -v -keystore keystore.jks -alias wherehere
```

출력에서 `SHA256:` 행을 찾아 복사한 뒤,
`frontend-app/public/.well-known/assetlinks.json`의 `__FINGERPRINT_PLACEHOLDER__`를 교체합니다.

**형식 예시:**
```
AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78
```

교체 후 Vercel에 배포해야 `https://wherehere-seven.vercel.app/.well-known/assetlinks.json`이 올바른 값을 반환합니다.

---

## 4단계: 빌드

```bash
cd twa/
bubblewrap build
```

결과물:
- `android/app/build/outputs/apk/release/app-release.apk` — 직접 설치용
- `android/app/build/outputs/bundle/release/app-release.aab` — Play Store 제출용

---

## 5단계: 검증 (선택)

Digital Asset Links가 올바르게 연결됐는지 확인:

```
https://digitalassetlinks.googleapis.com/v1/statements:list
  ?source.web.site=https://wherehere-seven.vercel.app
  &relation=delegate_permission/common.handle_all_urls
```

응답에 `com.wherehere.app`과 올바른 핑거프린트가 보이면 성공입니다.

---

## 아이콘 URL 목록 (자동 생성됨)

| URL | 크기 |
|---|---|
| `/icons/icon-512.png` | 512×512 (앱 아이콘, maskable) |
| `/icons/icon-192.png` | 192×192 |
| `/icons/icon-96.png` | 96×96 (shortcuts) |

Next.js `app/icons/[...params]/route.tsx`가 자동으로 생성·서빙합니다.

---

## Play Store 제출 체크리스트

- [ ] `assetlinks.json` 핑거프린트 교체 완료
- [ ] Vercel 배포 후 `/.well-known/assetlinks.json` 접근 확인
- [ ] `bubblewrap build` 성공 → `.aab` 생성 확인
- [ ] Google Play Console에서 새 앱 등록
- [ ] 내부 테스트 → 비공개 테스트 → 공개 출시 순으로 진행
