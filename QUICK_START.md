# WhereHere - 빠른 시작 가이드

## ✅ 현재 서버 상태

### 프론트엔드
- **주소**: http://localhost:3000
- **상태**: ✅ 실행 중
- **PID**: 9636

### 백엔드  
- **주소**: http://localhost:8000
- **상태**: ✅ 실행 중

---

## 🚀 지금 바로 접속하세요!

### 1단계: 브라우저 열기
브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

### 2단계: 첫 로딩 대기
- 처음 접속 시 페이지 컴파일에 5-10초 소요
- "Compiling /" 메시지가 터미널에 표시됨
- 컴파일 완료 후 페이지 표시

### 3단계: 위치 권한 허용
- 브라우저에서 위치 권한 요청 시 "허용" 클릭
- 거부하면 기본 위치(강남)로 설정됨

### 4단계: 역할 선택
5가지 역할 중 하나 선택:
- 🧭 탐험가
- 🌿 치유자  
- 📸 수집가
- 🤝 연결자
- 🏆 달성자

---

## 📋 구현된 모든 기능

### 메인 페이지
- [x] 5가지 역할 페르소나 선택
- [x] 실시간 위치 감지 (Geolocation API)
- [x] AI 기반 장소 추천
- [x] 장소 카드 (이름, 주소, 거리, 카테고리, 태그)
- [x] 추천 이유 (AI 생성)
- [x] 레벨 & XP 진행바
- [x] 연속 출석 스트릭 (🔥)
- [x] 반응형 디자인

### 인증 시스템
- [x] 이메일/비밀번호 로그인
- [x] 회원가입 (검증 포함)
- [x] 소셜 로그인 (카카오, Google)
- [x] 비밀번호 찾기
- [x] Supabase Auth 연동

### UI/UX
- [x] Tailwind CSS 스타일링
- [x] 그라데이션 배경
- [x] 부드러운 애니메이션
- [x] 로딩 스피너
- [x] Toast 알림 (Sonner)
- [x] 에러 핸들링

---

## 🔍 문제 해결

### "404 This page could not be found" 표시되면

#### 원인
Next.js가 페이지를 컴파일하지 못함

#### 해결 방법
1. 터미널 확인:
```
○ Compiling / ...
✓ Compiled / in 3.2s
```
이 메시지가 나타나야 함

2. 메시지가 없으면:
```powershell
# 서버 재시작
cd frontend-app
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

3. 브라우저 새로고침 (Ctrl + F5)

### 페이지가 로딩되지 않으면

1. **서버 로그 확인**:
   - 터미널에서 에러 메시지 확인
   - "GET / 200" 또는 "GET / 404" 확인

2. **캐시 삭제**:
```powershell
Remove-Item -Path "frontend-app\.next" -Recurse -Force
```

3. **브라우저 캐시 삭제**:
   - Ctrl + Shift + Delete
   - 캐시 및 쿠키 삭제

### 백엔드 연결 오류

1. **백엔드 서버 확인**:
```
http://localhost:8000/docs
```
API 문서가 표시되어야 함

2. **CORS 오류 시**:
   - `backend/.env`의 `ALLOWED_ORIGINS` 확인
   - `["http://localhost:3000"]` 포함되어 있어야 함

---

## 📁 파일 구조

```
frontend-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ✅ 루트 레이아웃
│   │   ├── page.tsx            ✅ 메인 페이지 (모든 기능)
│   │   ├── globals.css         ✅ 전역 스타일
│   │   ├── providers.tsx       ✅ React Query
│   │   ├── login/
│   │   │   └── page.tsx        ✅ 로그인
│   │   └── signup/
│   │       └── page.tsx        ✅ 회원가입
│   ├── components/
│   │   ├── auth/               ✅ 인증 컴포넌트
│   │   └── ui/                 ✅ UI 컴포넌트
│   ├── lib/
│   │   ├── components.tsx      ✅ 핵심 UI (역할, 카드 등)
│   │   ├── supabase.ts         ✅ 클라이언트 Supabase
│   │   └── supabase-server.ts  ✅ 서버 Supabase
│   └── hooks/
│       ├── useAuth.ts          ✅ 인증 훅
│       └── useUser.ts          ✅ 사용자 훅
├── next.config.js              ✅ Next.js 설정
├── tailwind.config.ts          ✅ Tailwind 설정
└── tsconfig.json               ✅ TypeScript 설정
```

---

## 🎯 핵심 코드 위치

### 역할 선택 UI
`frontend-app/src/lib/components.tsx` - `RoleSelector` 컴포넌트

### 장소 추천 로직
`frontend-app/src/app/page.tsx` - `useQuery` 훅

### AI 추천 API
`backend/main.py` - `/api/v1/recommendations` 엔드포인트

### 레벨 시스템
`frontend-app/src/lib/components.tsx` - `LevelProgressBar` 컴포넌트

### 스트릭 시스템
`frontend-app/src/lib/components.tsx` - `StreakDisplay` 컴포넌트

---

## 🔧 개발 명령어

### 프론트엔드
```powershell
cd frontend-app

# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 프로덕션 서버
npm start

# 린트
npm run lint
```

### 백엔드
```powershell
cd backend

# 개발 서버 시작
python -m uvicorn main:app --reload

# 의존성 설치
pip install -r requirements.txt

# 테스트
pytest
```

---

## 📊 성능 최적화

### 이미 적용된 최적화
- ✅ React Query 캐싱 (5분)
- ✅ Next.js 이미지 최적화
- ✅ Tailwind CSS Purge
- ✅ 코드 스플리팅
- ✅ 서버 컴포넌트

### 추가 최적화 가능
- [ ] 이미지 lazy loading
- [ ] 무한 스크롤
- [ ] Service Worker
- [ ] PWA 지원

---

## 🎨 커스터마이징

### 색상 변경
`frontend-app/tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',  // 파란색
      secondary: '#8B5CF6', // 보라색
    }
  }
}
```

### 역할 추가
`frontend-app/src/lib/components.tsx`:
```typescript
export type RoleType = 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever' | 'newrole'
```

### API 엔드포인트 변경
`frontend-app/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-api-url
```

---

## 📱 모바일 테스트

### 로컬 네트워크에서 접속
1. PC의 IP 주소 확인:
```powershell
ipconfig
```

2. 모바일에서 접속:
```
http://[PC-IP]:3000
```

3. `next.config.js`에 호스트 설정:
```javascript
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  // 모바일 접속 허용
  experimental: {
    allowedOrigins: ['*']
  }
}
```

---

## 🚀 배포 준비

### Vercel (프론트엔드)
1. GitHub에 푸시
2. Vercel 연결
3. 환경 변수 설정
4. 자동 배포

### Railway (백엔드)
1. GitHub에 푸시
2. Railway 연결
3. 환경 변수 설정
4. 자동 배포

---

## ✅ 최종 체크리스트

서버 실행 확인:
- [ ] http://localhost:3000 접속 가능
- [ ] http://localhost:8000/docs 접속 가능
- [ ] 위치 권한 허용
- [ ] 역할 선택 가능
- [ ] 장소 추천 표시
- [ ] 레벨바 표시
- [ ] 스트릭 표시
- [ ] 로그인 페이지 접속 가능
- [ ] 회원가입 페이지 접속 가능

---

## 🎊 완료!

모든 기능이 구현되어 있고 정상 작동합니다!

**지금 바로 접속**: http://localhost:3000

문제가 발생하면 터미널 로그를 확인하세요!

---

**마지막 업데이트**: 2026-02-12 16:43
**프론트엔드**: http://localhost:3000 (PID: 9636)
**백엔드**: http://localhost:8000
**상태**: ✅ 실행 중
