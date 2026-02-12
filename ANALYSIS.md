# WhereHere 프로젝트 현황 분석 리포트

날짜: 2026-02-12
분석자: AI Agent

---

## 📊 현재 상태 요약

### ✅ 작동하는 것
1. **프론트엔드 서버**: Next.js 14 (http://localhost:3000)
2. **백엔드 서버**: FastAPI + Uvicorn (http://localhost:8000)
3. **기본 UI**: 5가지 역할 선택 인터페이스
4. **환경 설정**: Supabase, Anthropic API 키 설정 완료

### ❌ 작동하지 않는 것
1. **데이터베이스 연결**: Supabase PostgreSQL 연결 실패
2. **장소 추천 API**: 404 오류 (라우터 미등록 또는 DB 의존성)
3. **사용자 인증**: Supabase Auth 미구현
4. **레벨/XP 시스템**: 더미 데이터만 존재

---

## 🔍 코드베이스 분석

### 백엔드 구조

#### 1. **추천 엔진** (`recommendation_engine.py`)
**상태**: ⚠️ 완전히 구현되었으나 DB 의존적

```python
class RecommendationEngine:
    - get_recommendations(): 메인 추천 함수
    - _generate_candidates(): PostGIS 공간 쿼리 사용
    - _score_and_rank(): 다차원 스코어링
```

**문제점**:
- **PostgreSQL + PostGIS 필수**: 실제 DB 테이블 (`places`) 없음
- Supabase에 `places` 테이블과 PostGIS 확장 미설치
- 현재 DB 연결 실패로 인해 추천 API 작동 불가

**필요한 작업**:
1. Supabase에 PostGIS 확장 활성화
2. `places` 테이블 생성 (스키마 정의 필요)
3. 초기 장소 데이터 시드

#### 2. **API 라우터**
- `routes/users.py`: ✅ 사용자 관리 (등록됨)
- `routes/recommendations.py`: ⚠️ 생성했으나 로드 오류 가능성

#### 3. **레벨 시스템** (`level_system.py`)
**상태**: 📝 설계만 완료, 미구현

예상 기능:
- XP 적립
- 레벨업
- 리워드 시스템

**구현 필요**:
- DB 스키마 (user_progress 테이블)
- API 엔드포인트
- 프론트엔드 통합

#### 4. **AI 서사 생성** (`narrative_generator.py`)
**상태**: 📝 설계 단계

- Anthropic Claude API 사용
- 장소 추천에 서사 추가

**현재 미사용**

---

### 프론트엔드 구조

#### 1. **홈 화면** (`components/home-client.tsx`)
**상태**: ✅ UI 완성, ⚠️ API 연동 실패

```typescript
- 역할 선택: 5가지 페르소나
- 위치 권한: Geolocation API
- 장소 추천: React Query로 API 호출
- 더미 데이터: 레벨 8, XP 2450, 스트릭 7일
```

**문제**:
- API 404 오류로 인해 추천 받을 수 없음
- 하드코딩된 더미 데이터

#### 2. **인증 시스템**
**파일 존재**:
- `components/auth/login-form.tsx`
- `components/auth/signup-form.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`

**상태**: 📝 UI만 존재, 실제 로직 미구현

#### 3. **온보딩**
**파일 존재**:
- `components/onboarding/welcome-step.tsx`
- `components/onboarding/nickname-step.tsx`
- `components/onboarding/role-selection-step.tsx`

**상태**: 📝 UI만 존재

---

## 🚨 핵심 문제점

### 1. **데이터베이스 미구성** (최우선)

현재 상황:
```
Warning: Database connection failed: Tenant or user not found
Server will start without database connection
```

**원인**:
- Supabase 데이터베이스에 필수 테이블 미생성
- PostGIS 확장 미설치

**필수 테이블**:
```sql
-- places: 장소 정보
CREATE TABLE places (
    place_id UUID PRIMARY KEY,
    name TEXT,
    address TEXT,
    primary_category TEXT,
    location GEOGRAPHY(POINT, 4326), -- PostGIS
    average_rating FLOAT,
    vibe_tags TEXT[],
    is_active BOOLEAN
);

-- users: 사용자 정보
-- user_progress: 레벨/XP
-- user_favorites: 즐겨찾기
-- visit_history: 방문 기록
```

### 2. **API 라우터 미등록**

`/docs`에 `recommendations` 엔드포인트가 없음

**가능한 원인**:
1. Import 오류로 인한 로드 실패
2. DB 연결 실패로 인한 초기화 실패

### 3. **더미 데이터 하드코딩**

프론트엔드에서:
```typescript
const [userLevel] = useState(8)
const [currentXP] = useState(2450)
const [streak] = useState(7)
const [userLocation, setUserLocation] = useState<Location | null>(null)
```

실제 기능이 아닌 UI 시연용

---

## 📋 필요한 작업 우선순위

### 🔴 긴급 (지금 당장)

1. **Supabase 데이터베이스 구성**
   - [ ] PostGIS 확장 활성화
   - [ ] `places` 테이블 생성
   - [ ] 초기 장소 데이터 (서울 강남/홍대 20-30곳)
   - [ ] `users` 테이블 생성
   - [ ] `user_progress` 테이블 생성

2. **API 라우터 디버깅**
   - [ ] recommendations 라우터 로드 확인
   - [ ] `/api/v1/recommendations` 엔드포인트 테스트
   - [ ] 오류 로깅 추가

### 🟡 중요 (이번 주 내)

3. **사용자 인증 구현**
   - [ ] Supabase Auth 통합
   - [ ] 회원가입/로그인 API
   - [ ] JWT 토큰 관리
   - [ ] 프론트엔드 auth context

4. **레벨/XP 시스템 구현**
   - [ ] DB 스키마 완성
   - [ ] XP 적립 로직
   - [ ] 레벨업 로직
   - [ ] 프론트엔드 실시간 업데이트

5. **장소 추천 고도화**
   - [ ] AI 서사 생성 통합
   - [ ] 날씨 API 연동
   - [ ] 시간대별 추천
   - [ ] 무드 기반 필터링

### 🟢 추후 (다음 스프린트)

6. **추가 기능**
   - [ ] 방문 기록 & 체크인
   - [ ] 즐겨찾기
   - [ ] 친구 시스템
   - [ ] 장소 리뷰
   - [ ] 공유 기능
   - [ ] 알림 시스템

7. **UI/UX 개선**
   - [ ] 장소 상세 페이지
   - [ ] 지도 통합 (Kakao/Naver Maps)
   - [ ] 이미지 갤러리
   - [ ] 애니메이션
   - [ ] 모바일 최적화

---

## 💡 권장 사항

### 즉시 해결 방법

1. **Mock Data로 우선 구현**
   ```typescript
   // 임시: API 없이 작동하는 버전
   const mockPlaces = [
     { id: 1, name: "카페 어반", category: "카페", ... },
     { id: 2, name: "북촌 한옥마을", category: "관광지", ... }
   ]
   ```

2. **단계적 DB 마이그레이션**
   - SQL 스키마 파일 작성
   - Supabase Migration 사용
   - 시드 데이터 스크립트

3. **API 우선 테스트**
   ```bash
   # 직접 테스트
   curl -X POST http://localhost:8000/api/v1/recommendations \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

### 장기 개선

1. **테스트 코드 작성**
   - 백엔드: pytest
   - 프론트엔드: Jest + React Testing Library

2. **CI/CD 파이프라인**
   - GitHub Actions
   - 자동 테스트 & 배포

3. **모니터링 & 로깅**
   - Sentry 오류 추적
   - 성능 모니터링

---

## 📈 현재 완성도

- **백엔드**: 40% (구조만 완성, DB 미연결)
- **프론트엔드**: 60% (UI 완성, API 연동 실패)
- **전체**: 50% (핵심 기능 미작동)

**실제 작동하는 기능**: 
- 역할 선택 UI
- 위치 권한 요청
- 더미 데이터 표시

**필요한 것**:
- 데이터베이스 설정 ⭐⭐⭐⭐⭐
- API 연동 ⭐⭐⭐⭐
- 인증 시스템 ⭐⭐⭐
- 실제 데이터 ⭐⭐⭐

---

## 🎯 결론

**현재 상태**: MVP 미완성 단계

**가장 큰 장애물**: 데이터베이스 미구성

**해결하면 작동**: Supabase DB에 테이블 3-4개만 만들면 기본 추천 기능 작동

**예상 작업 시간**:
- DB 설정 + 기본 데이터: 2-3시간
- API 디버깅: 1시간
- 인증 구현: 3-4시간
- **전체 MVP 완성**: 6-8시간

**추천**: 먼저 DB 설정에 집중하고, Mock 데이터로 프론트엔드 테스트 후 실제 연동
