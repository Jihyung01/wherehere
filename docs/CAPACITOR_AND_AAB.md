# AAB가 뭔지, TWA vs Capacitor 빌드

## 1. 지금 Play Console에 올린 AAB가 뭔지

**AAB(App Bundle)** = Google Play에 앱을 올릴 때 쓰는 **패키지 형식**입니다.  
APK를 직접 올리는 게 아니라, AAB를 올리면 Play가 기기별로 최적화된 APK를 만들어 사용자에게 배포합니다.

지금 올리신 AAB는 **TWA(Trusted Web Activity) 빌드**입니다.

- **만든 곳**: `twa/` 폴더 (Bubblewrap CLI로 생성)
- **내용**: 작은 네이티브 껍데기 + **Chrome이 지정한 URL(wherehere-seven.vercel.app)을 전체 화면으로 여는 앱**
- **동작**: 앱을 실행하면 그냥 우리 **웹(Vercel 배포분)**이 뜹니다. 진짜 네이티브 기능(백그라운드 위치 추적 등)은 없습니다.
- **권한/기능**: Play Console에 보이는 `android.hardware.location` 등은 TWA manifest에 선언된 것일 뿐이고, 실제 위치 사용은 **웹 쪽(브라우저 API)**에서만 이뤄집니다. 그래서 **앱을 닫거나 백그라운드로 보내면 위치 추적이 안 됩니다.**

정리하면, **“AAB = 앱을 배포하는 포맷”**이고, **“지금 그 AAB = TWA로 만든, 웹만 띄우는 앱”**이라고 보시면 됩니다.

---

## 2. TWA vs Capacitor (하이브리드)

| | **TWA (지금)** | **Capacitor (추가된 옵션)** |
|--|----------------|----------------------------|
| **위치** | 웹(브라우저) API → 앱 켜 둔 상태에서만 | 네이티브 플러그인 → **백그라운드에서도** 가능 (Android 알림 표시) |
| **빌드** | `twa/` → `bubblewrap build` → AAB | `frontend-app/` → `npx cap sync` → Android Studio에서 AAB |
| **앱 내용** | URL만 열기 | 같은 URL 로드 + 네이티브 플러그인 사용 |
| **업데이트** | 웹만 수정하면 Vercel 배포 후 앱 재설치 없이 반영 | 웹만 수정 시 동일. 네이티브/플러그인만 바꾸면 새 AAB 제출 필요 |

Capacitor 앱도 **server.url**로 Vercel 주소를 쓰고 있어서, **웹 수정은 지금처럼 푸시 → Vercel 배포만 하면 되고**, 앱을 다시 올릴 필요는 없습니다.  
**백그라운드 위치**처럼 네이티브 기능을 쓰는 부분만 Capacitor AAB로 올리면 됩니다.

---

## 3. Capacitor AAB 빌드 절차 (같은 앱으로 올리려면)

앱 ID를 TWA와 동일하게 `app.vercel.wherehere_seven.twa`로 맞춰 두었기 때문에,  
Capacitor로 빌드한 AAB를 **기존 앱의 새 버전**으로 올리면 됩니다.

1. **필요한 것**: Node.js, Android Studio, JDK 11+

2. **프로젝트에서**  
   ```bash
   cd frontend-app
   npm run cap:sync
   npm run cap:android
   ```
   → Android Studio가 열리면, 상단에서 **Build → Generate Signed Bundle / APK** 선택 후 **Android App Bundle**로 서명해 AAB 생성.

3. **키스토어**  
   - TWA에서 쓰던 `twa/keystore.jks`를 그대로 쓰려면, Android Studio에서 같은 keystore 경로/비밀번호/alias를 지정하면 됩니다.  
   - 새로 만들 수도 있지만, **기존 앱을 “업데이트”로 올리려면 기존과 동일한 서명 키**를 써야 합니다.

4. **Play Console**  
   - 앱 선택 → **출시 → 프로덕션(또는 테스트 트랙)** → **새 버전 만들기**  
   - 이번에 만든 **Capacitor AAB**를 업로드하면, 기존에 올렸던 TWA AAB를 **같은 앱의 새 버전**으로 대체하게 됩니다.

이렇게 하면 **“지금 올린 AAB”와 같은 앱**이 되고, 단지 **그 다음 버전이 TWA가 아니라 Capacitor 빌드**인 것입니다.

---

## 4. 요약

- **지금 올린 AAB** = TWA로 만든, **웹만 띄우는 앱**입니다. 진짜 네이티브 앱이 아니라 “웹을 앱 포맷으로 감싼 것”입니다.
- **웹과 앱의 차이**는 “실행 환경”입니다. 웹은 브라우저 안에서만 동작해서 백그라운드 제약이 있고, (Capacitor 같은) 앱은 네이티브 플러그인을 쓸 수 있어서 백그라운드 위치 등이 가능합니다.
- **Capacitor를 쓰면** 같은 프로젝트에 **앱 프로젝트(android/)**가 추가된 것이고, **웹은 그대로 두고** 네이티브 기능만 플러그인으로 보강하는 형태입니다.  
  그래서 “지금 있는 걸 앱으로 바꾼다”기보다 **“지금 웹은 그대로 두고, 그걸 감싼 Capacitor 앱을 추가해서, 그걸로 AAB를 만들어 올린다”**라고 보시면 됩니다.
