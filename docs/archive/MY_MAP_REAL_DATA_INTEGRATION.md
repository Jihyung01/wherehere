# 나의 지도 - 실제 데이터 통합 가이드

## 🎯 개요

"나의 지도" 페이지를 실제 데이터베이스와 완전히 연동하여 사용자의 방문 기록, 패턴 분석, 스타일 리포트를 실시간으로 제공합니다.

## 📊 현재 상태

### ✅ 완료된 작업

1. **새로운 실제 데이터 페이지 생성**
   - 경로: `/my-map-real`
   - 파일: `frontend-app/app/my-map-real/page.tsx`
   - Mock 데이터 완전 제거, 100% API 기반

2. **백엔드 API 엔드포인트 추가**
   - `GET /api/v1/visits/{user_id}` - 사용자 방문 기록 조회
   - `POST /api/v1/visits` - 새로운 방문 기록 생성
   - 파일: `backend/routes/visits.py`

3. **데이터베이스 헬퍼 메서드 추가**
   - `get_user_visits()` - 방문 기록 조회
   - `insert_visit()` - 방문 기록 삽입
   - 파일: `backend/db/rest_helpers.py`

4. **메인 앱 네비게이션 업데이트**
   - "나의 지도" 버튼이 `/my-map-real`로 이동
   - 파일: `frontend-app/components/main-app-v3.tsx`

### 🔧 필요한 작업

1. **데이터베이스 마이그레이션 실행**
   - `supabase/migrations/CREATE_VISITS_TABLE.sql` 실행 필요

2. **방문 기록 자동 생성 로직 추가**
   - 추천 장소 방문 시 자동으로 visits 테이블에 기록

## 🗄️ 데이터베이스 스키마

### Visits 테이블

```sql
CREATE TABLE visits (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    rating FLOAT,
    mood TEXT,
    spent_amount INTEGER,
    companions INTEGER,
    xp_earned INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 인덱스
- `idx_visits_user_id` - 사용자별 조회 최적화
- `idx_visits_place_id` - 장소별 조회 최적화
- `idx_visits_visited_at` - 시간순 정렬 최적화
- `idx_visits_user_visited` - 사용자+시간 복합 조회 최적화

## 🚀 설정 단계

### 1단계: 데이터베이스 마이그레이션 (필수)

Supabase SQL Editor에서 실행:

```bash
# Supabase 대시보드 접속
1. https://supabase.com/dashboard 로그인
2. WhereHere 프로젝트 선택
3. SQL Editor 메뉴 클릭
4. "New Query" 클릭
5. 아래 파일 내용 복사/붙여넣기 후 실행
```

파일: `supabase/migrations/CREATE_VISITS_TABLE.sql`

실행 후 확인:
```sql
-- 테이블 생성 확인
SELECT * FROM visits LIMIT 5;

-- 샘플 데이터 확인
SELECT COUNT(*) FROM visits;
```

### 2단계: 백엔드 재시작

```powershell
# 터미널에서 실행
cd backend
python -m uvicorn main:app --reload --port 8000
```

확인:
- http://localhost:8000/docs 에서 `/api/v1/visits` 엔드포인트 확인

### 3단계: 프론트엔드 확인

```powershell
# 터미널에서 실행
cd frontend-app
npm run dev
```

확인:
- http://localhost:3003/my-map-real 접속
- 데이터 로딩 확인

## 📱 UI 기능

### 지도 탭
- **인터랙티브 지도**: Canvas API 기반 방문 경로 시각화
- **방문 마커**: 클릭 시 상세 정보 표시
- **최근 방문 목록**: 최근 5개 방문 기록
- **실시간 통계**: 총 방문, 탐험 반경, 총 XP

### 통계 탭
- **카테고리 분포**: 방문한 장소 카테고리별 통계
- **평균 체류 시간**: 장소별 평균 머문 시간
- **평균 비용**: 방문당 평균 지출
- **선호 시간대**: 주로 방문하는 시간대
- **탐험 스타일**: AI 분석 기반 사용자 스타일

### 스타일 탭
- **탐험 스타일 분석**: AI 기반 사용자 성향 분석
- **선호 카테고리**: 가장 많이 방문한 카테고리
- **AI 추천**: 사용자 패턴 기반 맞춤 추천

## 🔗 API 통합

### 방문 기록 조회

```typescript
// GET /api/v1/visits/{user_id}
const response = await fetch(`${API_BASE}/visits/${userId}?days=90`);
const data = await response.json();

// Response:
{
  "visits": [
    {
      "id": "uuid",
      "place_id": "place-id",
      "place_name": "장소명",
      "category": "카페",
      "visited_at": "2024-02-14T14:30:00Z",
      "duration_minutes": 85,
      "latitude": 37.5665,
      "longitude": 126.9780,
      "xp_earned": 150,
      "mood": "호기심",
      "rating": 4.8,
      "spent_amount": 8000
    }
  ],
  "total_count": 8
}
```

### 방문 기록 생성

```typescript
// POST /api/v1/visits
const response = await fetch(`${API_BASE}/visits`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: "user-demo-001",
    place_id: "place-id",
    duration_minutes: 60,
    rating: 4.5,
    mood: "행복",
    spent_amount: 12000,
    companions: 2
  })
});

// Response:
{
  "success": true,
  "visit_id": "uuid",
  "xp_earned": 150
}
```

### 패턴 분석

```typescript
// POST /api/v1/ai/pattern/analyze
const response = await fetch(`${API_BASE}/ai/pattern/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: "user-demo-001",
    days: 90
  })
});

// Response:
{
  "analysis": {
    "dominant_style": "감성 큐레이터",
    "favorite_categories": ["카페", "갤러리", "북카페"],
    "preferred_time": "오후 2-5시",
    "avg_duration_minutes": 72,
    "exploration_radius_km": 4.8
  },
  "stats": {
    "total_visits": 8,
    "unique_places": 8,
    "total_xp": 1110
  },
  "ai_analysis": "조용한 공간에서 영감을 찾는 감성 큐레이터..."
}
```

## 🎮 게임화 요소

### XP 계산 로직

```python
# backend/routes/visits.py
xp_earned = 100  # 기본 XP

# 체류 시간 보너스
if duration_minutes > 60:
    xp_earned += 50

# 평점 보너스
if rating and rating >= 4.0:
    xp_earned += 30

# 총 XP: 100 ~ 180
```

### 레벨 시스템 (향후 구현)

```
Level 1: 0 - 500 XP (초보 탐험가)
Level 2: 500 - 1500 XP (숙련 탐험가)
Level 3: 1500 - 3000 XP (전문 탐험가)
Level 4: 3000 - 5000 XP (마스터 탐험가)
Level 5: 5000+ XP (전설의 탐험가)
```

## 🔄 데이터 흐름

### 1. 사용자가 추천 장소 방문

```
사용자 → 추천 수락 → 장소 방문 → 체크인
```

### 2. 방문 기록 생성

```
Frontend → POST /api/v1/visits → Backend → Supabase
```

### 3. 나의 지도 페이지 로딩

```
Frontend → GET /api/v1/visits/{user_id} → Backend → Supabase
         → POST /api/v1/ai/pattern/analyze → AI 분석
```

### 4. 실시간 업데이트

```
새 방문 기록 → 자동 XP 계산 → 패턴 재분석 → UI 업데이트
```

## 🎨 UI/UX 개선 사항

### 현재 구현
- ✅ Canvas 기반 인터랙티브 지도
- ✅ 실시간 통계 대시보드
- ✅ 카테고리별 분포 차트
- ✅ AI 기반 스타일 분석
- ✅ 방문 기록 타임라인

### 향후 개선 (TODO)
- [ ] 실제 지도 API 통합 (Kakao Map)
- [ ] 방문 경로 애니메이션
- [ ] 배지 시스템 연동
- [ ] 친구 비교 기능
- [ ] 월간/연간 리포트
- [ ] 방문 인증 사진 업로드
- [ ] 장소 리뷰 작성

## 🐛 문제 해결

### 문제: 데이터가 로딩되지 않음

**확인 사항:**
1. 백엔드가 실행 중인지 확인
   ```powershell
   # 터미널에서 확인
   curl http://localhost:8000/health
   ```

2. Visits 테이블이 생성되었는지 확인
   ```sql
   -- Supabase SQL Editor
   SELECT * FROM visits LIMIT 1;
   ```

3. 브라우저 콘솔 에러 확인
   ```
   F12 → Console 탭 → 에러 메시지 확인
   ```

### 문제: 500 Internal Server Error

**해결 방법:**
1. 백엔드 로그 확인
   ```powershell
   # backend 터미널 출력 확인
   ```

2. 데이터베이스 연결 확인
   ```python
   # backend/.env 파일 확인
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

### 문제: Mock 데이터가 계속 표시됨

**해결 방법:**
1. 올바른 URL 접속 확인
   - ❌ http://localhost:3003/my-map (구버전, mock)
   - ✅ http://localhost:3003/my-map-real (신버전, 실제 데이터)

2. 브라우저 캐시 삭제
   ```
   Ctrl + Shift + Delete → 캐시 삭제
   ```

## 📊 테스트

### 1. API 테스트

```powershell
# 방문 기록 조회 테스트
curl http://localhost:8000/api/v1/visits/user-demo-001

# 패턴 분석 테스트
curl -X POST http://localhost:8000/api/v1/ai/pattern/analyze `
  -H "Content-Type: application/json" `
  -d '{"user_id":"user-demo-001","days":90}'
```

### 2. 프론트엔드 테스트

```
1. http://localhost:3003/my-map-real 접속
2. "데이터를 불러오는 중..." 로딩 확인
3. 지도 렌더링 확인
4. 통계 탭 전환 확인
5. 스타일 탭 전환 확인
```

### 3. 통합 테스트

```
1. 메인 앱에서 추천 받기
2. 장소 수락
3. (향후) 방문 완료 체크인
4. 나의 지도에서 새 방문 기록 확인
```

## 🚀 다음 단계

### Phase 1: 자동 방문 기록 (우선순위: 높음)
- [ ] 추천 장소 수락 시 자동으로 visits 생성
- [ ] 체크인 버튼 추가
- [ ] 방문 완료 시 XP 획득 알림

### Phase 2: 실제 지도 통합 (우선순위: 중간)
- [ ] Kakao Map API 연동
- [ ] 실제 지도 위에 마커 표시
- [ ] 경로 탐색 기능

### Phase 3: 소셜 기능 (우선순위: 중간)
- [ ] 친구 방문 기록 공유
- [ ] 장소 리뷰 작성
- [ ] 추천 장소 북마크

### Phase 4: 고급 분석 (우선순위: 낮음)
- [ ] 월간/연간 리포트
- [ ] 탐험 스타일 진화 추적
- [ ] 개인화된 배지 시스템

## 📝 코드 위치

### 프론트엔드
- **페이지**: `frontend-app/app/my-map-real/page.tsx`
- **메인 앱**: `frontend-app/components/main-app-v3.tsx`

### 백엔드
- **라우터**: `backend/routes/visits.py`
- **헬퍼**: `backend/db/rest_helpers.py`
- **메인**: `backend/main.py`

### 데이터베이스
- **마이그레이션**: `supabase/migrations/CREATE_VISITS_TABLE.sql`

## 🎯 성공 기준

### 기능적 요구사항
- ✅ 실제 데이터베이스에서 방문 기록 조회
- ✅ AI 기반 패턴 분석
- ✅ 인터랙티브 지도 시각화
- ✅ 실시간 통계 대시보드
- ⏳ 자동 방문 기록 생성 (구현 중)

### 비기능적 요구사항
- ✅ 로딩 시간 < 2초
- ✅ 에러 핸들링 (fallback UI)
- ✅ 반응형 디자인 (모바일 최적화)
- ✅ 부드러운 애니메이션

## 📚 참고 자료

- [Supabase REST API 문서](https://supabase.com/docs/guides/api)
- [Canvas API 문서](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [React Query 문서](https://tanstack.com/query/latest)
- [FastAPI 문서](https://fastapi.tiangolo.com/)

---

**마지막 업데이트**: 2024-02-14
**작성자**: WhereHere Development Team
**버전**: 1.0.0
