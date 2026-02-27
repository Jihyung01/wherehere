# WhereHere - 빠른 실행 가이드 🚀

이 가이드를 따라하면 **5분 안에** 프로젝트를 실행할 수 있습니다.

## 📋 프로젝트 구조

```
WhereHere/
├── frontend-app/          # Next.js 14 프론트엔드 (App Router)
│   ├── app/              # Next.js App Router 디렉토리
│   │   ├── layout.tsx   # 루트 레이아웃
│   │   ├── page.tsx     # 메인 페이지
│   │   ├── providers.tsx # React Query Provider
│   │   └── globals.css  # 전역 스타일
│   ├── lib/
│   │   └── components.tsx # 재사용 가능한 컴포넌트
│   └── package.json
│
├── backend/               # FastAPI 백엔드
│   ├── role_definitions.py      # 역할 시스템
│   ├── recommendation_engine.py # 추천 엔진 (FastAPI 앱)
│   ├── level_system.py          # 레벨/XP 시스템
│   ├── narrative_generator.py   # AI 서사 생성
│   ├── requirements.txt         # Python 의존성
│   └── Dockerfile
│
├── docker-compose.yml     # Docker Compose 설정
└── schema.sql            # 데이터베이스 스키마
```

---

## ⚡ 빠른 시작 (3단계)

### 1️⃣ 프론트엔드 실행

```bash
# 프론트엔드 디렉토리로 이동
cd frontend-app

# 의존성 설치 (첫 실행 시에만)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 2️⃣ 백엔드 실행 (Docker 사용)

```bash
# 루트 디렉토리로 이동
cd ..

# Docker Compose로 백엔드 + DB 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
```

백엔드 API: http://localhost:8000/docs

### 3️⃣ 백엔드 실행 (Docker 없이 로컬 실행)

Docker를 사용하지 않으려면:

```bash
# backend 디렉토리로 이동
cd backend

# 가상환경 생성 (첫 실행 시에만)
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 의존성 설치 (첫 실행 시에만)
pip install -r requirements.txt

# 환경 변수 설정 (선택사항)
copy .env.example .env
# .env 파일에서 DATABASE_URL 등을 수정

# 백엔드 서버 실행
uvicorn recommendation_engine:app --reload --host 0.0.0.0 --port 8000
```

---

## 🎯 현재 상태 및 주의사항

### ✅ 작동하는 것
- **프론트엔드 UI**: 역할 선택, 레벨 표시, 스트릭 등 모든 UI 컴포넌트
- **API 구조**: FastAPI 엔드포인트 정의
- **타입 시스템**: TypeScript 타입 정의

### ⚠️ 데이터베이스 필요
백엔드가 완전히 작동하려면 PostgreSQL + PostGIS가 필요합니다:

```bash
# Docker로 PostgreSQL 실행
docker-compose up -d db

# 또는 로컬 PostgreSQL 설치 후
psql -U postgres
CREATE DATABASE wh_core;
CREATE USER wh_user WITH ENCRYPTED PASSWORD 'wh_password';
GRANT ALL PRIVILEGES ON DATABASE wh_core TO wh_user;
\q

# 스키마 적용
psql -U wh_user -d wh_core -f schema.sql
```

### 🔧 개발 모드로 실행 (DB 없이)
DB 없이 프론트엔드만 개발하려면:

1. `frontend-app/app/page.tsx`에서 API 호출 부분을 임시로 주석 처리
2. Mock 데이터를 사용하여 UI 개발

```typescript
// Mock 데이터 예시
const mockRecommendations = {
  recommendations: [
    {
      place_id: '1',
      name: '히든 골목 카페',
      address: '서울 강남구 논현동',
      category: '카페',
      distance_meters: 500,
      score: 85,
      score_breakdown: { category: 90, distance: 80 },
      reason: '탐험가에게 딱 맞는 히든스팟',
      estimated_cost: 5000,
      vibe_tags: ['cozy', 'hidden', 'quiet']
    }
  ],
  role_type: 'explorer',
  radius_used: 5000,
  total_candidates: 10,
  generated_at: new Date().toISOString()
}
```

---

## 🐳 Docker 명령어 모음

```bash
# 모든 서비스 시작
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d backend
docker-compose up -d db

# 로그 확인
docker-compose logs -f
docker-compose logs -f backend

# 서비스 재시작
docker-compose restart backend

# 서비스 중지
docker-compose down

# 볼륨까지 삭제 (DB 데이터 초기화)
docker-compose down -v

# 이미지 다시 빌드
docker-compose build --no-cache backend
docker-compose up -d backend
```

---

## 📦 필수 의존성

### 프론트엔드
- Node.js 18+ 
- npm 또는 yarn

### 백엔드
- Python 3.11+
- PostgreSQL 14+ (선택사항, Docker 사용 시 불필요)
- Docker & Docker Compose (선택사항)

---

## 🌟 주요 기능

### 1. 5가지 역할 시스템
- 🧭 **탐험가**: 새로운 발견을 추구
- 🌿 **치유자**: 쉼과 회복을 추구
- 📸 **수집가**: 미적 경험을 수집
- 🤝 **연결자**: 따뜻한 연결을 추구
- 🏆 **달성자**: 목표 달성을 추구

### 2. 레벨 & XP 시스템
- 레벨 진행바 표시
- XP 획득 및 레벨업
- 스트릭(연속 일수) 추적

### 3. 장소 추천 알고리즘
- PostGIS 기반 위치 검색
- 다차원 스코어링
- 역할별 맞춤 추천

---

## 🔍 API 테스트

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### 추천 받기
```bash
curl -X POST http://localhost:8000/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "role_type": "explorer",
    "user_level": 8,
    "current_location": {
      "latitude": 37.4979,
      "longitude": 127.0276
    }
  }'
```

---

## 🐛 트러블슈팅

### 프론트엔드가 시작되지 않음
```bash
cd frontend-app
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 백엔드가 시작되지 않음 (DB 연결 에러)
```bash
# DB 컨테이너 상태 확인
docker-compose ps

# DB 로그 확인
docker-compose logs db

# DB 컨테이너 재시작
docker-compose restart db
```

### 포트가 이미 사용 중
```bash
# 프론트엔드 포트 변경 (3000 -> 3001)
cd frontend-app
npm run dev -- -p 3001

# 백엔드 포트 변경 (8000 -> 8001)
cd backend
uvicorn recommendation_engine:app --reload --port 8001
```

---

## 📚 추가 문서

- [README.md](./README.md) - 전체 프로젝트 개요
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 상세 통합 가이드
- [ROLE_EXPANSION_ANALYSIS.md](./ROLE_EXPANSION_ANALYSIS.md) - 역할 시스템 분석

---

## 💡 다음 단계

1. ✅ 프론트엔드 UI 확인
2. ✅ 백엔드 API 확인
3. ⏳ 데이터베이스 연결
4. ⏳ 실제 장소 데이터 입력
5. ⏳ AI 서사 생성 기능 연결

---

## 🤝 도움이 필요하신가요?

- GitHub Issues를 열어주세요
- 문서를 다시 확인해보세요
- Docker 로그를 확인해보세요: `docker-compose logs -f`

**Happy Coding! 🎉**
