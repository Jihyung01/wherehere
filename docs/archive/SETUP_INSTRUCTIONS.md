# WhereHere - 설정 및 실행 가이드

## 🎯 Phase 1 완료!

모든 코드가 생성되었습니다. 이제 실제로 실행하기 위한 설정을 진행합니다.

---

## 📋 필요한 외부 서비스

### 1. Supabase (필수)
**무료 플랜으로 시작 가능**

1. [supabase.com](https://supabase.com) 접속
2. "Start your project" 클릭
3. 새 프로젝트 생성:
   - Project Name: `wherehere`
   - Database Password: 안전한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택
4. 프로젝트 생성 완료 후 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (Settings > API)
   - **JWT Secret**: Settings > API > JWT Settings

### 2. Anthropic API (AI 서사 생성용)
**$5 무료 크레딧 제공**

1. [console.anthropic.com](https://console.anthropic.com) 접속
2. API Key 발급
3. 키 복사: `sk-ant-api03-xxxxx`

---

## 🚀 설정 단계

### Step 1: 패키지 설치

```powershell
# 프론트엔드
cd C:\Users\tbvj1\Projects\WhereHere\frontend-app
npm install

# 백엔드
cd C:\Users\tbvj1\Projects\WhereHere\backend
pip install -r requirements.txt
```

### Step 2: 환경변수 설정

#### 프론트엔드 (.env.local)
```powershell
cd C:\Users\tbvj1\Projects\WhereHere\frontend-app
copy .env.local.example .env.local
```

`.env.local` 파일을 열고 다음 값을 입력:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENV=development
```

#### 백엔드 (.env)
```powershell
cd C:\Users\tbvj1\Projects\WhereHere\backend
copy .env.example .env
```

`.env` 파일을 열고 다음 값을 입력:
```env
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
SECRET_KEY=your_secret_key_here_generate_with_openssl_rand_hex_32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**SECRET_KEY 생성 방법:**
```powershell
# PowerShell에서 실행
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Step 3: 데이터베이스 마이그레이션

1. Supabase Dashboard 접속
2. **SQL Editor** 메뉴 클릭
3. "New query" 클릭
4. `supabase/migrations/20260210_initial_schema.sql` 파일 내용 복사
5. 붙여넣기 후 **Run** 클릭
6. 성공 확인

**Seed 데이터 추가 (선택사항):**
7. 새 쿼리 생성
8. `supabase/seed.sql` 파일 내용 복사
9. 붙여넣기 후 **Run** 클릭
10. 15개 샘플 장소 추가 완료

### Step 4: 소셜 로그인 설정 (선택사항)

#### Kakao 로그인
1. [Kakao Developers](https://developers.kakao.com) 접속
2. 애플리케이션 추가
3. Supabase Dashboard > Authentication > Providers > Kakao
4. Client ID와 Secret 입력
5. Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

#### Google 로그인
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. OAuth 2.0 클라이언트 ID 생성
3. Supabase Dashboard > Authentication > Providers > Google
4. Client ID와 Secret 입력

---

## 🎮 실행하기

### 터미널 1: 백엔드 실행
```powershell
cd C:\Users\tbvj1\Projects\WhereHere\backend
python main.py
```

**확인:**
- 서버 시작: `http://localhost:8000`
- API 문서: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 터미널 2: 프론트엔드 실행
```powershell
cd C:\Users\tbvj1\Projects\WhereHere\frontend-app
npm run dev
```

**확인:**
- 앱 실행: `http://localhost:3000`

---

## ✅ 테스트 시나리오

### 1. 회원가입 테스트
1. `http://localhost:3000/signup` 접속
2. 이메일, 비밀번호, 사용자명 입력
3. 회원가입 버튼 클릭
4. 이메일 확인 (Supabase에서 자동 발송)
5. 이메일 링크 클릭하여 인증

### 2. 온보딩 테스트
1. 로그인 후 자동으로 온보딩 페이지로 이동
2. **Step 1**: 사용자명과 닉네임 입력
3. **Step 2**: 역할 선택 (탐험가, 치유자 등)
4. **Step 3**: 환영 화면 확인
5. "시작하기" 클릭

### 3. 로그인 테스트
1. `http://localhost:3000/login` 접속
2. 이메일과 비밀번호 입력
3. 로그인 성공 확인

### 4. API 테스트
```bash
# Health Check
curl http://localhost:8000/health

# 프로필 조회 (로그인 후 토큰 필요)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/users/me
```

---

## 🐛 문제 해결

### 프론트엔드가 실행되지 않을 때
```powershell
# node_modules 삭제 후 재설치
cd C:\Users\tbvj1\Projects\WhereHere\frontend-app
Remove-Item -Recurse -Force node_modules
npm install
```

### 백엔드 DB 연결 오류
- DATABASE_URL이 정확한지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 방화벽 설정 확인

### 로그인 후 프로필이 없다고 나올 때
- 데이터베이스 트리거가 제대로 생성되었는지 확인
- SQL Editor에서 `SELECT * FROM users;` 실행하여 확인

---

## 📞 다음 단계

Phase 1 완료 후:
- [ ] Phase 2: 추천 엔진 통합
- [ ] Phase 3: 퀘스트 시스템
- [ ] Phase 4: AI 서사 생성
- [ ] Phase 5: 모바일 최적화

---

**문제가 발생하면 언제든 물어보세요!** 🚀
