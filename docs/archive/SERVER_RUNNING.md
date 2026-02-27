# 🎉 서버 정상 작동 중!

## ✅ 현재 상태

### 프론트엔드
- **주소**: http://localhost:3000
- **상태**: ✅ 정상 작동
- **프레임워크**: Next.js 14.2.35
- **모드**: Development (Hot Reload)

### 백엔드
- **주소**: http://localhost:8000
- **상태**: ✅ 정상 작동
- **프레임워크**: FastAPI + Uvicorn
- **API 문서**: http://localhost:8000/docs

---

## 🚀 접속 방법

### 1. 메인 페이지
브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

### 2. 위치 권한 허용
- 브라우저에서 위치 권한 요청 시 **"허용"** 클릭
- 위치 정보를 통해 주변 장소 추천

### 3. 역할 선택
5가지 역할 중 선택:
- 🧭 **탐험가** - 새로운 발견을 추구하는 모험가
- 🌿 **치유자** - 쉼과 회복을 추구하는 평온의 수호자
- 📸 **수집가** - 미적 경험을 수집하는 감각의 큐레이터
- 🤝 **연결자** - 따뜻한 연결을 추구하는 관계의 직조자
- 🏆 **달성자** - 목표를 향해 전진하는 성취의 챔피언

---

## 📱 주요 기능

### 메인 페이지 (/)
- ✅ 역할 기반 장소 추천
- ✅ 실시간 위치 감지
- ✅ AI 추천 이유
- ✅ 레벨 & XP 시스템
- ✅ 연속 출석 스트릭

### 인증 페이지
- 📝 `/login` - 로그인
- 📝 `/signup` - 회원가입
- 🔐 소셜 로그인 (카카오, Google)

---

## 🔧 서버 제어

### 서버 중지
프로세스를 종료하려면:
```powershell
# 모든 Node.js 프로세스 종료
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# 특정 포트 프로세스 종료
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### 서버 재시작
```powershell
# 프론트엔드
cd frontend-app
npm run dev

# 백엔드
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🐛 문제 해결

### 404 오류가 발생하면
1. `.next` 폴더 삭제:
```powershell
Remove-Item -Path "frontend-app\.next" -Recurse -Force
```

2. 서버 재시작:
```powershell
cd frontend-app
npm run dev
```

### 포트가 이미 사용 중이면
```powershell
# 포트 3000 사용 프로세스 확인
Get-NetTCPConnection -LocalPort 3000

# 프로세스 종료
Stop-Process -Id [PID] -Force
```

### 빌드 오류가 발생하면
1. `node_modules` 재설치:
```powershell
cd frontend-app
Remove-Item -Path "node_modules" -Recurse -Force
npm install
```

2. 캐시 삭제:
```powershell
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

---

## 📊 서버 로그 확인

### 프론트엔드 로그
터미널에서 실시간으로 확인:
- 컴파일 상태
- 페이지 요청
- 에러 메시지

### 백엔드 로그
- API 요청/응답
- 데이터베이스 쿼리
- 에러 스택 트레이스

---

## 🎨 개발 모드 기능

### Hot Reload
- 파일 저장 시 자동 새로고침
- 빠른 개발 사이클

### 에러 오버레이
- 빌드 에러 시 브라우저에 표시
- 상세한 에러 정보 제공

### React Query DevTools
- 쿼리 상태 모니터링
- 캐시 확인

---

## 📝 환경 변수

### 프론트엔드 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://cjqhqxpxvdnfwfmfwmqg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 백엔드 (.env)
```env
SUPABASE_URL=https://cjqhqxpxvdnfwfmfwmqg.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.cjqhqxpxvdnfwfmfwmqg:...
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

---

## 🔗 유용한 링크

- **메인 페이지**: http://localhost:3000
- **로그인**: http://localhost:3000/login
- **회원가입**: http://localhost:3000/signup
- **API 문서**: http://localhost:8000/docs
- **API 대화형 문서**: http://localhost:8000/redoc

---

## 💡 개발 팁

### 1. 컴포넌트 수정
- `frontend-app/src/lib/components.tsx` - UI 컴포넌트
- `frontend-app/src/app/page.tsx` - 메인 페이지
- 저장하면 자동으로 브라우저 새로고침

### 2. API 엔드포인트 추가
- `backend/main.py` - FastAPI 라우트
- 저장하면 자동으로 서버 재시작

### 3. 스타일 수정
- `frontend-app/src/app/globals.css` - 전역 스타일
- Tailwind 클래스 사용 가능

### 4. 데이터베이스 쿼리
- Supabase 대시보드: https://supabase.com
- SQL 에디터에서 직접 쿼리 실행

---

## ✅ 체크리스트

현재 작동 중인 기능:
- [x] 프론트엔드 서버 (포트 3000)
- [x] 백엔드 서버 (포트 8000)
- [x] 한글 완벽 지원
- [x] 5가지 역할 페르소나
- [x] 위치 기반 추천
- [x] AI 추천 시스템
- [x] 레벨 & XP
- [x] 스트릭 시스템
- [x] 로그인/회원가입
- [x] 소셜 로그인
- [x] 반응형 디자인

---

## 🎊 준비 완료!

모든 서버가 정상적으로 작동하고 있습니다!

**지금 바로 접속하세요**: http://localhost:3000

즐거운 개발 되세요! 🚀

---

**마지막 업데이트**: 2026-02-12 16:38
**프론트엔드**: ✅ http://localhost:3000
**백엔드**: ✅ http://localhost:8000
**상태**: 정상 작동 중
