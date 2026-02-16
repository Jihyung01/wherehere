# 🚀 Vercel 배포 가이드

WhereHere 프론트엔드를 Vercel에 배포하는 완전한 가이드입니다.

---

## 📋 사전 준비

### 1. 백엔드 배포 (필수)
Vercel은 프론트엔드만 배포합니다. 백엔드는 별도로 배포해야 합니다.

**추천 백엔드 호스팅:**
- **Railway** (추천): Python/FastAPI 지원, 무료 플랜
- **Render**: 무료 플랜 제공
- **Fly.io**: 글로벌 배포

### 2. 필요한 API 키
- ✅ Kakao Map JavaScript API Key
- ✅ Supabase URL & Service Role Key
- ✅ Anthropic API Key (백엔드용)

---

## 🎯 1단계: Vercel 프로젝트 생성

### A. Vercel 계정 생성
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

### B. 새 프로젝트 Import
1. Vercel Dashboard → "Add New..." → "Project"
2. GitHub repository 선택: `Jihyung01/wherehere`
3. **Root Directory 설정**: `frontend-app` (중요!)
4. Framework Preset: **Next.js** (자동 감지됨)

---

## 🔧 2단계: 환경 변수 설정

Vercel Dashboard → Project Settings → Environment Variables

### 복사해서 붙여넣기 (각각 별도로 추가):

#### 1. NEXT_PUBLIC_KAKAO_MAP_KEY
```
YOUR_KAKAO_JAVASCRIPT_KEY_HERE
```
**⚠️ 주의**: REST API Key가 아닌 **JavaScript Key**를 사용하세요!

#### 2. NEXT_PUBLIC_API_URL
```
https://your-backend-url.com
```
**예시**:
- Railway: `https://wherehere-backend-production.up.railway.app`
- Render: `https://wherehere-backend.onrender.com`

**⚠️ 중요**: 
- 끝에 `/` 없이 입력
- `http://localhost:8000` 사용 금지 (프로덕션 URL 필요)

---

## 🏗️ 3단계: 배포 설정

### Build & Development Settings

Vercel이 자동으로 감지하지만, 확인하세요:

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

### Root Directory
```
frontend-app
```

---

## 🚀 4단계: 배포 실행

1. "Deploy" 버튼 클릭
2. 빌드 로그 확인 (2-3분 소요)
3. 배포 완료 후 URL 확인 (예: `https://wherehere.vercel.app`)

---

## 🔍 5단계: 배포 확인

### A. 프론트엔드 확인
1. Vercel이 제공한 URL 접속
2. 메인 페이지 로딩 확인
3. 콘솔 에러 확인 (F12)

### B. 백엔드 연결 확인
브라우저 콘솔에서:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

예상 출력: `https://your-backend-url.com`

### C. API 호출 테스트
```javascript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
  .then(r => r.json())
  .then(console.log)
```

예상 출력:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🐛 문제 해결

### 문제 1: "Module not found" 에러
**원인**: Root Directory 설정 오류

**해결**:
1. Vercel Dashboard → Settings → General
2. Root Directory: `frontend-app`
3. Save → Redeploy

### 문제 2: 환경 변수가 `undefined`
**원인**: `NEXT_PUBLIC_` 접두사 누락

**해결**:
- 모든 프론트엔드 환경 변수는 `NEXT_PUBLIC_`로 시작해야 함
- 변경 후 **Redeploy** 필수

### 문제 3: CORS 에러
**원인**: 백엔드에서 Vercel URL 허용 안 됨

**해결**:
백엔드 `core/config.py` 수정:
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://wherehere.vercel.app",  # 추가
    "https://*.vercel.app"  # 모든 Vercel preview 허용
]
```

### 문제 4: 카카오 맵이 안 보임
**원인**: JavaScript Key 대신 REST API Key 사용

**해결**:
1. https://developers.kakao.com/console/app
2. 앱 선택 → "플랫폼" → "Web"
3. **JavaScript 키** 복사 (REST API 키 아님!)
4. Vercel 환경 변수 업데이트
5. Redeploy

### 문제 5: 빌드 실패 - "Type error"
**원인**: TypeScript 타입 에러

**해결**:
로컬에서 먼저 확인:
```bash
cd frontend-app
npm run build
```

에러 수정 후 git push

---

## 📱 6단계: 도메인 설정 (선택)

### A. 커스텀 도메인 추가
1. Vercel Dashboard → Settings → Domains
2. 도메인 입력 (예: `wherehere.com`)
3. DNS 레코드 추가 (Vercel이 안내)

### B. 무료 도메인 사용
Vercel이 제공하는 무료 도메인 사용:
- `https://your-project.vercel.app`

---

## 🔄 자동 배포 설정

### GitHub 연동 (기본 활성화)
- `main` 브랜치에 push → 자동 배포
- PR 생성 → Preview 배포 자동 생성

### 배포 알림
1. Vercel Dashboard → Settings → Notifications
2. Slack/Discord 웹훅 추가 (선택)

---

## 📊 성능 최적화

### A. 이미지 최적화
Next.js Image 컴포넌트 사용:
```tsx
import Image from 'next/image'

<Image 
  src="/logo.png" 
  width={200} 
  height={200} 
  alt="WhereHere"
/>
```

### B. 분석 도구
1. Vercel Dashboard → Analytics
2. Web Vitals 확인
3. 성능 개선 제안 확인

---

## 🔐 보안 체크리스트

- ✅ `.env.local` 파일이 `.gitignore`에 포함됨
- ✅ API 키가 코드에 하드코딩되지 않음
- ✅ `NEXT_PUBLIC_` 접두사가 있는 변수만 클라이언트 노출
- ✅ 백엔드 API에 CORS 설정됨
- ✅ Supabase RLS 정책 활성화됨

---

## 📞 백엔드 배포 (Railway 예시)

### 1. Railway 계정 생성
https://railway.app

### 2. 새 프로젝트 생성
1. "New Project" → "Deploy from GitHub repo"
2. `wherehere` 선택
3. Root Directory: `backend`

### 3. 환경 변수 설정
Railway Dashboard → Variables:

```
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key_here
KAKAO_REST_API_KEY=your_kakao_rest_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
SECRET_KEY=your_secret_key_here
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://wherehere.vercel.app,https://*.vercel.app
```

### 4. Start Command 설정
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 5. 배포 URL 확인
예: `https://wherehere-backend-production.up.railway.app`

이 URL을 Vercel의 `NEXT_PUBLIC_API_URL`에 설정!

---

## 🎉 완료!

배포 완료 후:
1. ✅ 프론트엔드: `https://wherehere.vercel.app`
2. ✅ 백엔드: `https://your-backend.railway.app`
3. ✅ 데이터베이스: Supabase (이미 설정됨)

---

## 📝 환경 변수 요약 (복사용)

### Vercel (프론트엔드)
```
NEXT_PUBLIC_KAKAO_MAP_KEY=YOUR_KAKAO_JAVASCRIPT_KEY
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Railway (백엔드)
```
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key_here
KAKAO_REST_API_KEY=your_kakao_rest_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
SECRET_KEY=your_secret_key_here
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://wherehere.vercel.app,https://*.vercel.app
```

---

## 🔗 유용한 링크

- Vercel Dashboard: https://vercel.com/dashboard
- Railway Dashboard: https://railway.app/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Kakao Developers: https://developers.kakao.com/console

---

**배포 성공을 기원합니다! 🚀**
