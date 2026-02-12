# 📦 패키지 설치 가이드

## ❌ 발생한 문제

Backend 패키지 설치 시 권한 오류 발생:
```
ERROR: Could not install packages due to an OSError: [WinError 5] 액세스가 거부되었습니다
```

## ✅ 해결 방법 (3가지 중 선택)

### 방법 1: 가상환경 사용 (추천) ⭐

가상환경을 사용하면 권한 문제 없이 패키지를 설치할 수 있습니다.

```powershell
# 1. backend 폴더로 이동
cd backend

# 2. 가상환경 생성
python -m venv venv

# 3. 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 4. 패키지 설치
pip install -r requirements.txt

# 5. 서버 실행
python main.py
```

**확인**:
- 터미널에 `(venv)`가 표시되면 가상환경이 활성화된 것입니다
- 서버가 정상적으로 시작되면 http://localhost:8000/health 접속

---

### 방법 2: 관리자 권한으로 실행

PowerShell을 관리자 권한으로 실행한 후:

```powershell
cd C:\Users\tbvj1\Projects\WhereHere\backend
pip install -r requirements.txt
python main.py
```

**PowerShell 관리자 권한으로 실행하는 방법**:
1. 시작 메뉴에서 "PowerShell" 검색
2. 우클릭 → "관리자 권한으로 실행"

---

### 방법 3: 사용자 설치 (간단하지만 비추천)

```powershell
cd backend
pip install --user -r requirements.txt
python main.py
```

---

## 🚀 설치 후 서버 실행

### Backend 실행

**가상환경 사용 시**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

**또는 스크립트 사용**:
```powershell
.\start-backend.ps1
```

### Frontend 실행 (새 터미널)

```powershell
.\start-frontend.ps1
```

또는:
```powershell
cd frontend-app
npm run dev
```

---

## 🧪 설치 확인

### Backend 패키지 확인
```powershell
python -c "import fastapi; print('✅ FastAPI OK')"
python -c "import anthropic; print('✅ Anthropic OK')"
python -c "import supabase; print('✅ Supabase OK')"
```

### 서버 상태 확인
```powershell
# Backend (서버 실행 후)
curl http://localhost:8000/health

# Frontend (서버 실행 후)
# 브라우저에서 http://localhost:3000 접속
```

---

## 📝 설치되는 패키지 목록

```
fastapi==0.109.0          # Web 프레임워크
uvicorn[standard]==0.27.0 # ASGI 서버
asyncpg==0.29.0           # PostgreSQL 비동기 드라이버
pydantic==2.5.3           # 데이터 검증
anthropic==0.18.0         # Claude AI API
supabase==2.3.4           # Supabase 클라이언트
python-jose[cryptography] # JWT 토큰
passlib[bcrypt]           # 비밀번호 해싱
httpx                     # HTTP 클라이언트
```

---

## 🐛 문제 해결

### 문제: `ModuleNotFoundError: No module named 'fastapi'`

**해결**: 패키지가 설치되지 않았습니다. 위의 방법 1 (가상환경) 사용

---

### 문제: `Activate.ps1 cannot be loaded because running scripts is disabled`

**해결**: PowerShell 실행 정책 변경
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### 문제: `pip install` 시 권한 오류

**해결**: 방법 1 (가상환경) 사용 또는 관리자 권한으로 실행

---

### 문제: `httpx` 버전 충돌

**해결**: 이미 `requirements.txt`에서 수정됨
```
httpx>=0.24,<0.26  # supabase와 anthropic 호환
```

---

## ✅ 성공 시 출력

Backend 서버가 정상적으로 시작되면:

```
🚀 Starting WhereHere API...
✅ API Ready!
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 📞 추가 도움

- **가상환경 가이드**: https://docs.python.org/ko/3/tutorial/venv.html
- **pip 설치 가이드**: https://pip.pypa.io/en/stable/installation/

---

**작성일**: 2026-02-12  
**문제**: Backend 패키지 설치 권한 오류  
**해결**: 가상환경 사용 (추천)
