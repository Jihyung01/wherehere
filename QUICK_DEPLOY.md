# ⚡ 빠른 배포 가이드 (5분 완성)

MVP를 빠르게 배포하고 피드백 받기 위한 최소 단계입니다.

---

## 🎯 배포 순서 (꼭 이 순서대로!)

### 1️⃣ 백엔드 배포 (Railway) - 3분

1. **Railway 가입**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - `Jihyung01/wherehere` 선택

3. **Root Directory 설정**
   - Settings → Service
   - Root Directory: `backend`
   - Save

4. **환경 변수 추가**
   - Variables 탭 클릭
   - "RAW Editor" 클릭
   - 아래 내용 **전체 복사** 후 붙여넣기:

```
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_api_key_here
KAKAO_REST_API_KEY=your_kakao_rest_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://wherehere.vercel.app,https://*.vercel.app
```

5. **배포 URL 확인**
   - Settings → Domains
   - 생성된 URL 복사 (예: `https://wherehere-backend-production.up.railway.app`)
   - **이 URL을 메모장에 저장!** (다음 단계에서 사용)

6. **Health Check**
   - 브라우저에서 `https://your-url.railway.app/health` 접속
   - `{"status": "healthy"}` 확인

---

### 2️⃣ 프론트엔드 배포 (Vercel) - 2분

1. **Vercel 가입**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 Import**
   - "Add New..." → "Project"
   - `Jihyung01/wherehere` 선택
   - **Root Directory**: `frontend-app` (중요!)
   - Framework: Next.js (자동 감지)

3. **환경 변수 추가**
   - "Environment Variables" 섹션에서:

**Variable 1:**
```
Name: NEXT_PUBLIC_KAKAO_MAP_KEY
Value: YOUR_KAKAO_JAVASCRIPT_KEY_HERE
```

**Variable 2:**
```
Name: NEXT_PUBLIC_API_URL
Value: https://your-backend-url.railway.app
```
(위에서 복사한 Railway URL 붙여넣기, 끝에 `/` 없이!)

4. **Deploy 클릭**
   - 2-3분 대기
   - 배포 완료!

5. **URL 확인**
   - Vercel이 제공한 URL 클릭 (예: `https://wherehere.vercel.app`)

---

## ✅ 배포 완료 확인

### 1. 프론트엔드 접속
`https://wherehere.vercel.app` 접속

### 2. 콘솔 확인 (F12)
에러 없이 로딩되는지 확인

### 3. 기능 테스트
- 메인 페이지 로딩 ✅
- 추천 장소 표시 ✅
- 퀘스트 수락 ✅
- 체크인 → 리뷰 → XP 획득 ✅

---

## 🐛 에러 발생 시

### "Failed to fetch recommendations"
**원인**: 백엔드 URL 잘못 입력

**해결**:
1. Vercel Dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` 확인
3. Railway URL과 일치하는지 확인
4. 끝에 `/` 없는지 확인
5. Redeploy

### "Kakao Map not loading"
**원인**: JavaScript 키 대신 REST API 키 사용

**해결**:
1. https://developers.kakao.com/console/app
2. JavaScript 키 복사 (REST API 키 아님!)
3. Vercel 환경 변수 업데이트
4. Redeploy

### CORS 에러
**원인**: 백엔드에서 프론트엔드 URL 허용 안 됨

**해결**:
1. Railway Dashboard → Variables
2. `ALLOWED_ORIGINS`에 Vercel URL 추가
3. 예: `https://wherehere.vercel.app,https://*.vercel.app`
4. Redeploy

---

## 📱 피드백 받기

### 공유할 링크
```
https://wherehere.vercel.app
```

### 테스트 계정
```
User ID: user-demo-001
```

### 피드백 요청 사항
1. 첫 인상 (UI/UX)
2. 추천 장소가 유용한가?
3. 퀘스트 완료 플로우가 직관적인가?
4. 개선이 필요한 부분
5. 가장 마음에 드는 기능

---

## 🔄 업데이트 배포

코드 수정 후:

```bash
git add .
git commit -m "feat: 피드백 반영"
git push origin main
```

→ Vercel과 Railway가 자동으로 재배포!

---

## 📊 모니터링

### Vercel Analytics
- Dashboard → Analytics
- 방문자 수, 성능 지표 확인

### Railway Logs
- Dashboard → Deployments → Logs
- 백엔드 에러 확인

---

## 🎉 완료!

- ✅ 백엔드: Railway
- ✅ 프론트엔드: Vercel
- ✅ 데이터베이스: Supabase
- ✅ MVP 배포 완료!

**이제 피드백을 받고 개선하세요!** 🚀

---

## 📞 추가 도움

자세한 가이드:
- `VERCEL_DEPLOYMENT.md` - 상세 배포 가이드
- `VERCEL_ENV_VARIABLES.md` - 환경 변수 상세 설명

문제 발생 시:
- Railway 문서: https://docs.railway.app
- Vercel 문서: https://vercel.com/docs
