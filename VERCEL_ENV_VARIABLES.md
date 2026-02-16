# 🔐 Vercel 환경 변수 설정 가이드

복사해서 Vercel Dashboard에 하나씩 붙여넣으세요.

---

## 📍 Vercel 환경 변수 설정 위치

1. Vercel Dashboard 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables**
4. 아래 변수들을 하나씩 추가

---

## 🎯 프론트엔드 환경 변수 (Vercel)

### Variable 1: NEXT_PUBLIC_KAKAO_MAP_KEY

**Name:**
```
NEXT_PUBLIC_KAKAO_MAP_KEY
```

**Value:** (카카오 개발자 콘솔에서 JavaScript 키 복사)
```
0f130fcd4ff2babc753292f02db9a27d
```

**어디서 가져오나요?**
1. https://developers.kakao.com/console/app 접속
2. 앱 선택
3. "앱 키" 탭
4. **JavaScript 키** 복사 (REST API 키 아님!)

**Environment:** Production, Preview, Development (모두 체크)

---

### Variable 2: NEXT_PUBLIC_API_URL

**Name:**
```
NEXT_PUBLIC_API_URL
```

**Value:** (백엔드 배포 후 URL 입력)
```
https://your-backend-url.com
```

**예시:**
- Railway: `https://wherehere-backend-production.up.railway.app`
- Render: `https://wherehere-backend.onrender.com`
- Fly.io: `https://wherehere-backend.fly.dev`

**⚠️ 주의:**
- 끝에 `/` 붙이지 마세요
- `http://localhost:8000` 사용 금지

**Environment:** Production, Preview, Development (모두 체크)

---

## 🚂 백엔드 환경 변수 (Railway/Render/Fly.io)

### Variable 1: DATABASE_URL

**Name:**
```
DATABASE_URL
```

**Value:** (Supabase Dashboard에서 복사)
```
your_supabase_database_url
```

---

### Variable 2: SUPABASE_URL

**Name:**
```
SUPABASE_URL
```

**Value:** (Supabase Dashboard에서 복사)
```
your_supabase_project_url
```

---

### Variable 3: SUPABASE_SERVICE_ROLE_KEY

**Name:**
```
SUPABASE_SERVICE_ROLE_KEY
```

**Value:** (Supabase Dashboard에서 복사)
```
your_supabase_service_role_key
```

---

### Variable 4: SUPABASE_JWT_SECRET

**Name:**
```
SUPABASE_JWT_SECRET
```

**Value:** (Supabase Dashboard에서 복사)
```
your_supabase_jwt_secret
```

---

### Variable 5: ANTHROPIC_API_KEY

**Name:**
```
ANTHROPIC_API_KEY
```

**Value:** (실제 Anthropic API 키 입력)
```
your_anthropic_api_key_here
```

---

### Variable 6: KAKAO_REST_API_KEY

**Name:**
```
KAKAO_REST_API_KEY
```

**Value:** (Kakao Developers에서 복사)
```
your_kakao_rest_api_key
```

---

### Variable 7: OPENWEATHER_API_KEY

**Name:**
```
OPENWEATHER_API_KEY
```

**Value:** (OpenWeatherMap에서 복사)
```
your_openweather_api_key
```

---

### Variable 8: SECRET_KEY

**Name:**
```
SECRET_KEY
```

**Value:** (강력한 랜덤 문자열 생성)
```
your_secret_key_here
```

---

### Variable 9: ALGORITHM

**Name:**
```
ALGORITHM
```

**Value:**
```
HS256
```

---

### Variable 10: ACCESS_TOKEN_EXPIRE_MINUTES

**Name:**
```
ACCESS_TOKEN_EXPIRE_MINUTES
```

**Value:**
```
30
```

---

### Variable 11: ENVIRONMENT

**Name:**
```
ENVIRONMENT
```

**Value:**
```
production
```

---

### Variable 12: DEBUG

**Name:**
```
DEBUG
```

**Value:**
```
False
```

---

### Variable 13: ALLOWED_ORIGINS

**Name:**
```
ALLOWED_ORIGINS
```

**Value:** (프론트엔드 배포 후 URL 업데이트)
```
https://wherehere.vercel.app,https://*.vercel.app
```

**⚠️ 중요:**
- 프론트엔드 배포 완료 후 실제 URL로 업데이트하세요
- 여러 URL은 쉼표(,)로 구분
- 공백 없이 입력

---

## 📋 체크리스트

### Vercel (프론트엔드)
- [ ] `NEXT_PUBLIC_KAKAO_MAP_KEY` 추가
- [ ] `NEXT_PUBLIC_API_URL` 추가 (백엔드 URL)
- [ ] 모든 변수에 Production, Preview, Development 체크
- [ ] Deploy 버튼 클릭

### Railway/Render (백엔드)
- [ ] `DATABASE_URL` 추가
- [ ] `SUPABASE_URL` 추가
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 추가
- [ ] `SUPABASE_JWT_SECRET` 추가
- [ ] `ANTHROPIC_API_KEY` 추가
- [ ] `KAKAO_REST_API_KEY` 추가
- [ ] `OPENWEATHER_API_KEY` 추가
- [ ] `SECRET_KEY` 추가
- [ ] `ALGORITHM` 추가
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES` 추가
- [ ] `ENVIRONMENT` 추가
- [ ] `DEBUG` 추가
- [ ] `ALLOWED_ORIGINS` 추가 (프론트엔드 URL)
- [ ] Deploy 버튼 클릭

---

## 🔄 배포 순서

1. **백엔드 먼저 배포** (Railway/Render)
   - 환경 변수 13개 모두 추가
   - 배포 완료 후 URL 확인 (예: `https://xxx.railway.app`)

2. **프론트엔드 배포** (Vercel)
   - `NEXT_PUBLIC_API_URL`에 백엔드 URL 입력
   - `NEXT_PUBLIC_KAKAO_MAP_KEY` 추가
   - 배포

3. **백엔드 CORS 업데이트**
   - `ALLOWED_ORIGINS`에 프론트엔드 URL 추가
   - 재배포

---

## 🧪 배포 후 테스트

### 1. 백엔드 Health Check
브라우저에서:
```
https://your-backend-url.com/health
```

예상 응답:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. 프론트엔드 환경 변수 확인
브라우저 콘솔 (F12):
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

예상 출력: `https://your-backend-url.com`

### 3. API 연결 테스트
```javascript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/recommendations?latitude=37.5665&longitude=126.9780&radius=3000`)
  .then(r => r.json())
  .then(console.log)
```

---

## ❌ 자주 하는 실수

### 1. NEXT_PUBLIC_ 접두사 빠뜨림
❌ `KAKAO_MAP_KEY`
✅ `NEXT_PUBLIC_KAKAO_MAP_KEY`

### 2. 백엔드 URL 끝에 슬래시
❌ `https://backend.com/`
✅ `https://backend.com`

### 3. JavaScript 키 대신 REST API 키 사용
❌ REST API 키 (백엔드용)
✅ JavaScript 키 (프론트엔드용)

### 4. localhost URL 사용
❌ `http://localhost:8000`
✅ `https://your-backend.railway.app`

### 5. CORS 설정 누락
백엔드 `ALLOWED_ORIGINS`에 프론트엔드 URL 꼭 추가!

---

## 📞 도움이 필요하면

- Vercel 문서: https://vercel.com/docs
- Railway 문서: https://docs.railway.app
- Supabase 문서: https://supabase.com/docs

---

**성공적인 배포를 기원합니다! 🚀**
