# WH Core Logic - 완전한 통합 가이드

## 📋 목차
1. [시스템 아키텍처 개요](#시스템-아키텍처-개요)
2. [설치 및 환경 설정](#설치-및-환경-설정)
3. [역할(Role) 시스템 사용법](#역할-시스템-사용법)
4. [API 엔드포인트 가이드](#api-엔드포인트-가이드)
5. [배포 가이드](#배포-가이드)
6. [성능 최적화](#성능-최적화)
7. [트러블슈팅](#트러블슈팅)

---

## 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│   (React + TypeScript + TanStack Query)                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ REST API
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Layer                          │
│   ┌──────────────────┐  ┌──────────────────┐           │
│   │ Recommendation   │  │   Narrative      │           │
│   │     Engine       │  │    Generator     │           │
│   │  (FastAPI)       │  │  (Claude API)    │           │
│   └────────┬─────────┘  └────────┬─────────┘           │
│            │                     │                      │
│            │    ┌────────────────┴──────┐              │
│            │    │   Level & XP System   │              │
│            │    └───────────────────────┘              │
└────────────┼────────────────────────────────────────────┘
             │
             │ PostGIS Queries
             ▼
┌─────────────────────────────────────────────────────────┐
│              Database Layer                              │
│   PostgreSQL 14+ with PostGIS 3.2+                       │
│   - users, places, quests, activity_logs                 │
│   - Spatial indexing & Vector storage                    │
└─────────────────────────────────────────────────────────┘
```

---

## 설치 및 환경 설정

### 1. Prerequisites

```bash
# Python 3.11+
python --version

# PostgreSQL 14+
psql --version

# Node.js 18+
node --version
```

### 2. Database 설정

```bash
# PostgreSQL 설치 (Ubuntu/Debian)
sudo apt-get install postgresql-14 postgresql-14-postgis-3

# PostgreSQL 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE wh_core;
CREATE USER wh_user WITH ENCRYPTED PASSWORD 'wh_password';
GRANT ALL PRIVILEGES ON DATABASE wh_core TO wh_user;
\q

# 스키마 적용
psql -U wh_user -d wh_core -f database/schema.sql
```

### 3. Backend 설정

```bash
# 가상환경 생성
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cat > .env << EOF
DATABASE_URL=postgresql://wh_user:wh_password@localhost:5432/wh_core
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=development
EOF
```

**requirements.txt**:
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
asyncpg==0.29.0
pydantic==2.5.3
anthropic==0.18.0
python-dotenv==1.0.0
numpy==1.26.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

### 4. Frontend 설정

```bash
cd frontend

# 의존성 설치
npm install

# 환경변수 설정
cat > .env.local << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_MAP_API_KEY=your_map_api_key
EOF
```

**package.json 주요 의존성**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 역할(Role) 시스템 사용법

### 5가지 핵심 역할 정의

| 역할 ID | 한국어 이름 | 특성 | 추천 장소 유형 |
|---------|------------|------|---------------|
| `explorer` | **탐험가** 🧭 | 새로운 발견 추구, 넓은 행동반경 | 골목길, 히든스팟, 이색장소 |
| `healer` | **치유자** 🌿 | 쉼과 회복, 좁은 행동반경 | 공원, 북카페, 조용한 장소 |
| `archivist` | **수집가** 📸 | 미적 경험, 중간 행동반경 | 전시관, 뷰맛집, 갤러리 |
| `relation` | **연결자** 🤝 | 관계 중시, 중간 행동반경 | 맛집, 카페, 액티비티 |
| `achiever` | **달성자** 🏆 | 목표 지향, 매우 넓은 행동반경 | 헬스장, 러닝코스, 챌린지 |

### 역할별 확장 파라미터

각 역할은 다음 파라미터로 정의됩니다:

```python
{
    "행동_반경": {
        "최소": 300~1000m,
        "최대": 2000~15000m,
        "기본": "레벨에 따라 동적 계산"
    },
    "선호_카테고리": {
        "핵심": ["카테고리1", "카테고리2"],
        "가중치": 0.0~1.0
    },
    "비용_민감도": 0.0~1.0,  # 높을수록 저렴한 곳 선호
    "서사_톤": "역할 고유의 스타일",
    "고급_파라미터": {
        "novelty_preference": 0.0~1.0,  # 새로움 선호
        "crowd_tolerance": 0.0~1.0,  # 혼잡도 허용
        "time_flexibility": 0.0~1.0,  # 시간 유연성
        "social_intensity": 0.0~1.0  # 사회성
    }
}
```

---

## API 엔드포인트 가이드

### 1. 장소 추천 API

**Endpoint**: `POST /api/v1/recommendations`

**Request**:
```json
{
  "user_id": "user-uuid-123",
  "role_type": "explorer",
  "user_level": 8,
  "current_location": {
    "latitude": 37.4979,
    "longitude": 127.0276
  },
  "mood": {
    "mood_text": "호기심 넘치는",
    "intensity": 0.8
  },
  "weather": "cloudy",
  "time_of_day": "afternoon"
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "place_id": "place-uuid-456",
      "name": "히든 골목 이탈리안",
      "address": "서울 강남구 논현동",
      "category": "이색장소",
      "distance_meters": 1234.5,
      "score": 87.5,
      "score_breakdown": {
        "category": 90.0,
        "distance": 85.0,
        "vibe": 88.0,
        "cost": 75.0
      },
      "reason": "탐험가에게 딱 맞는 히든스팟입니다",
      "estimated_cost": 25000,
      "vibe_tags": ["hidden", "authentic", "romantic"]
    }
  ],
  "role_type": "explorer",
  "radius_used": 5000,
  "total_candidates": 42,
  "generated_at": "2026-02-09T14:30:00Z"
}
```

### 2. 서사 생성 API

**Endpoint**: `POST /api/v1/narratives`

**Request**:
```json
{
  "user_role": "explorer",
  "user_level": 8,
  "korean_role_name": "탐험가",
  "place_name": "낡은 골목 서점",
  "place_category": "이색장소",
  "place_vibe_tags": ["hidden", "vintage", "quiet"],
  "action_log": "45분 체류, 오래된 책 구경",
  "weather": "cloudy",
  "time_of_day": "afternoon",
  "mood_input": "호기심 넘치는"
}
```

**Response**:
```json
{
  "title": "지도 밖의 발견",
  "body": "남들은 그냥 지나치는 낡은 간판을 당신은 놓치지 않았습니다. 서점 구석의 먼지 쌓인 책들은 진정한 탐험가만이 찾을 수 있는 보물입니다. 당신의 지도는 오늘 또 한 칸 넓어졌습니다.",
  "insight": "진짜 여행은 검색되지 않는 곳에 있습니다.",
  "role_type": "explorer",
  "generation_time_ms": 1245,
  "prompt_tokens": 456,
  "completion_tokens": 123
}
```

### 3. 퀘스트 완료 API

**Endpoint**: `POST /api/v1/quests/{quest_id}/complete`

**Request**:
```json
{
  "duration_minutes": 45,
  "actions": {
    "photo_taken": true,
    "review_written": false
  }
}
```

**Response**:
```json
{
  "quest_id": "quest-uuid-789",
  "status": "completed",
  "xp_earned": 180,
  "xp_breakdown": {
    "base": 100,
    "consistency": 1.5,
    "diversity": 1.2,
    "total": 180
  },
  "new_level": 9,  // 레벨업 시에만 포함
  "unlocked_features": ["hidden_quest"],  // 레벨업 시에만
  "narrative": {
    "title": "지도 밖의 발견",
    "body": "...",
    "insight": "..."
  }
}
```

---

## 배포 가이드

### Docker Compose 배포

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  db:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_DB: wh_core
      POSTGRES_USER: wh_user
      POSTGRES_PASSWORD: wh_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wh_user -d wh_core"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://wh_user:wh_password@db:5432/wh_core
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn recommendation_engine:app --host 0.0.0.0 --port 8000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://backend:8000
    depends_on:
      - backend

volumes:
  postgres_data:
```

**실행**:
```bash
docker-compose up -d
```

---

## 성능 최적화

### 1. Database Indexing

```sql
-- 공간 인덱스 (필수)
CREATE INDEX CONCURRENTLY idx_places_location_gist 
ON places USING GIST(location);

-- 복합 인덱스
CREATE INDEX CONCURRENTLY idx_places_category_rating 
ON places(primary_category, average_rating DESC);

-- 부분 인덱스
CREATE INDEX CONCURRENTLY idx_places_hidden_active 
ON places(is_hidden_gem) 
WHERE is_active = TRUE AND is_hidden_gem = TRUE;
```

### 2. Caching Strategy

```python
# Redis 캐싱 (추천 결과 5분 캐시)
from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, db=0)

def get_cached_recommendations(cache_key: str):
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    return None

def cache_recommendations(cache_key: str, data: dict):
    redis_client.setex(
        cache_key,
        300,  # 5분
        json.dumps(data)
    )
```

### 3. Connection Pooling

```python
# asyncpg 풀 최적화
pool = await asyncpg.create_pool(
    host='localhost',
    database='wh_core',
    user='wh_user',
    password='wh_password',
    min_size=10,
    max_size=50,
    max_queries=50000,
    max_inactive_connection_lifetime=300
)
```

---

## 트러블슈팅

### 문제 1: PostGIS 함수 에러

**증상**: `function st_distance does not exist`

**해결**:
```sql
-- PostGIS 확장 재설치
DROP EXTENSION IF EXISTS postgis CASCADE;
CREATE EXTENSION postgis;
```

### 문제 2: 추천 결과가 없음

**원인**: 반경 내 장소 부족

**해결**:
```python
# 최소 반경 보장
radius = max(radius, 1000)  # 최소 1km

# 또는 fallback 로직
if len(candidates) == 0:
    radius *= 2  # 반경 2배 확장
    candidates = await self._generate_candidates(location, radius)
```

### 문제 3: Claude API 응답 느림

**원인**: 프롬프트가 너무 김

**해결**:
```python
# 프롬프트 최적화
system_prompt = system_prompt[:2000]  # 최대 2000자 제한
max_tokens = 500  # 토큰 제한
temperature = 0.7  # 온도 낮춤 (일관성 향상)
```

---

## 바이브코딩 배포 가이드

이 코드는 다음과 같이 바이브코딩에 즉시 배포 가능합니다:

1. **Backend**: `backend/` 폴더 전체를 FastAPI 서버로 배포
2. **Database**: `database/schema.sql` 실행
3. **Frontend**: `frontend/components.tsx` React 앱에 통합
4. **AI Engine**: `ai-engine/narrative_generator.py` 별도 서비스로 배포

**시작 명령어**:
```bash
# Backend
cd backend
uvicorn recommendation_engine:app --reload

# Frontend (별도 터미널)
cd frontend
npm start
```

---

## 다음 단계

1. ✅ 역할 시스템 확장 완료
2. ✅ 추천 엔진 구현 완료
3. ✅ 서사 생성 엔진 완료
4. ✅ 레벨/XP 시스템 완료
5. ⏳ 실시간 알림 시스템
6. ⏳ 소셜 기능 (친구 초대, 퀘스트 공유)
7. ⏳ 크리에이터 모드 (커스텀 퀘스트 생성)

---

**문의**: dev@whcore.com  
**문서 버전**: v1.0.0  
**최종 수정**: 2026-02-09
