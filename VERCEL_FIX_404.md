# 🔧 Vercel 404 에러 해결

## 문제
`https://wherehere-vert.vercel.app` 접속 시 404 NOT_FOUND 에러

## 원인
Root Directory가 설정되지 않아서 Vercel이 `frontend-app` 폴더를 찾지 못함

## 해결 방법

### 1. Vercel Dashboard 접속
https://vercel.com/dashboard

### 2. 프로젝트 선택
`wherehere-vert` 클릭

### 3. Settings로 이동
상단 메뉴에서 **Settings** 클릭

### 4. General 설정
왼쪽 메뉴에서 **General** 클릭

### 5. Root Directory 설정
"Root Directory" 섹션에서:
- **Edit** 버튼 클릭
- 입력란에 `frontend-app` 입력
- **Save** 클릭

### 6. 재배포
- 상단 메뉴에서 **Deployments** 클릭
- 최신 배포 옆 **...** (점 3개) 클릭
- **Redeploy** 선택
- **Redeploy** 버튼 클릭

### 7. 배포 완료 대기 (2-3분)
빌드 로그를 확인하면서 대기

### 8. 접속 확인
`https://wherehere-vert.vercel.app` 다시 접속

---

## ⚠️ 경고 메시지 (무시해도 됨)

스크린샷에 보이는 경고:
```
This key, which is prefixed with NEXT_PUBLIC_ and includes the term KEY, 
might expose sensitive information to the browser.
```

**의미**: `NEXT_PUBLIC_KAKAO_MAP_KEY`가 브라우저에 노출될 수 있다는 경고

**무시해도 되는 이유**:
1. ✅ 카카오 JavaScript 키는 **브라우저에서 사용하도록 설계됨**
2. ✅ 도메인 제한으로 보안 설정 가능
3. ✅ `NEXT_PUBLIC_` 접두사는 의도적으로 클라이언트 노출용

**추가 보안 (선택)**:
카카오 개발자 콘솔에서 도메인 제한 설정:
1. https://developers.kakao.com/console/app
2. 앱 선택 → 플랫폼 → Web
3. 사이트 도메인: `https://wherehere-vert.vercel.app` 추가

---

## ✅ 정상 작동 확인

배포 완료 후:
1. `https://wherehere-vert.vercel.app` 접속
2. 메인 페이지가 보이면 성공!
3. F12 콘솔에서 에러 확인

---

**Root Directory 설정만 하면 해결됩니다!** 🚀
