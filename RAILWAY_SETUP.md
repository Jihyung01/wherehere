# 🚂 Railway 백엔드 배포 가이드

## 현재 상황
Railway 새 프로젝트 생성 화면에서 선택 필요

---

## ✅ 단계별 설정

### 1. "GitHub Repository" 선택

스크린샷에 보이는 항목 중:
- ✅ **GitHub Repository** 선택 (첫 번째 옵션)
- ❌ Database (나중에 자동 연결됨)
- ❌ Template (필요 없음)
- ❌ Docker Image (필요 없음)
- ❌ Function (필요 없음)
- ❌ Bucket (필요 없음)
- ❌ Empty Project (필요 없음)

### 2. GitHub Repository 연결

1. "GitHub Repository" 클릭
2. GitHub 계정 연결 (처음이면 권한 승인)
3. Repository 검색: `wherehere`
4. `Jihyung01/wherehere` 선택
5. **"Deploy Now"** 클릭

### 3. 배포 시작

Railway가 자동으로:
- ✅ 코드 가져오기
- ✅ Python 감지
- ✅ 의존성 설치 시도
- ⚠️ 하지만 에러 발생 (Root Directory 미설정)

### 4. Root Directory 설정

배포가 시작되면:

1. 프로젝트 대시보드에서 서비스 클릭
2. **Settings** 탭 클릭
3. "Source" 섹션에서:
   - **Root Directory** 찾기
   - 입력란에 `backend` 입력
   - 자동 저장됨

### 5. 환경 변수 추가

1. **Variables** 탭 클릭
2. **RAW Editor** 버튼 클릭
3. `DEPLOYMENT_SECRETS.txt` 파일 열기
4. "RAILWAY RAW EDITOR용" 섹션 **전체 복사**
5. Railway RAW Editor에 **붙여넣기**
6. **Update Variables** 클릭

**복사할 내용** (`DEPLOYMENT_SECRETS.txt`에서):
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
ALLOWED_ORIGINS=https://wherehere-vert.vercel.app,https://*.vercel.app
```

### 6. 재배포

환경 변수 저장 후:
1. **Deployments** 탭 클릭
2. 최신 배포가 자동으로 시작됨
3. 로그 확인하면서 대기 (2-3분)

### 7. 배포 URL 확인

배포 완료 후:
1. **Settings** 탭
2. "Domains" 섹션
3. 생성된 URL 복사 (예: `https://wherehere-backend-production.up.railway.app`)
4. **이 URL을 메모장에 저장!** (Vercel에서 사용)

### 8. Health Check

브라우저에서:
```
https://your-railway-url.railway.app/health
```

예상 응답:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🔄 Vercel 환경 변수 업데이트

Railway URL을 확인한 후:

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. `NEXT_PUBLIC_API_URL` 찾기
4. **Edit** 클릭
5. Railway URL 입력 (끝에 `/` 없이!)
6. **Save** 클릭
7. **Deployments** → **Redeploy**

---

## 📋 체크리스트

### Railway 설정
- [ ] "GitHub Repository" 선택
- [ ] `Jihyung01/wherehere` 연결
- [ ] Root Directory: `backend` 설정
- [ ] 환경 변수 13개 추가
- [ ] 배포 성공 확인
- [ ] URL 복사

### Vercel 업데이트
- [ ] Root Directory: `frontend-app` 설정
- [ ] `NEXT_PUBLIC_API_URL` 업데이트 (Railway URL)
- [ ] 재배포

### Railway CORS 업데이트
- [ ] `ALLOWED_ORIGINS`에 Vercel URL 추가
- [ ] 재배포

---

## 🐛 문제 해결

### "Build failed"
→ Root Directory가 `backend`로 설정되었는지 확인

### "Module not found"
→ `requirements.txt`가 `backend/` 폴더에 있는지 확인

### "Port binding failed"
→ 환경 변수가 모두 추가되었는지 확인

### Health check 실패
→ 환경 변수 값이 정확한지 확인 (`DEPLOYMENT_SECRETS.txt` 참고)

---

## 📸 스크린샷 가이드

### 1단계: GitHub Repository 선택
```
[GitHub Repository] ← 이것 클릭
Database
Template
Docker Image
Function
Bucket
Empty Project
```

### 2단계: Repository 선택
```
Search: wherehere
→ Jihyung01/wherehere [Deploy Now]
```

### 3단계: Settings
```
Settings 탭
→ Source
→ Root Directory: backend
```

### 4단계: Variables
```
Variables 탭
→ RAW Editor
→ (환경 변수 붙여넣기)
→ Update Variables
```

---

## ✅ 완료!

Railway 백엔드 배포 완료 후:
- ✅ URL: `https://xxx.railway.app`
- ✅ Health check: `/health` 접속 가능
- ✅ Vercel에서 이 URL 사용

---

**GitHub Repository → backend 폴더 → 환경 변수 → 배포!** 🚀
