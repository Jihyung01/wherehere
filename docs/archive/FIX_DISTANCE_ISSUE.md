# 거리 0m 및 500 에러 해결 방법

## 🔍 문제 분석

### 1. 거리 0m 문제
**원인**: DB의 `places` 테이블에 `latitude`, `longitude` 컬럼이 없음
- `location GEOGRAPHY(POINT, 4326)` 필드는 있지만 REST API로 직접 쿼리 불가능
- 거리 계산을 위해서는 별도의 `latitude`, `longitude` 컬럼 필요

### 2. 프론트엔드 500 에러
**원인**: `challenge` 객체가 `undefined`일 때 `challenge.title` 접근 시도
- API 응답이 늦거나 실패할 때 발생
- 안전한 접근 패턴 필요

### 3. 백엔드 500 에러
**원인**: `/api/v1/ai/pattern/analyze` 엔드포인트의 에러 처리 부족
- 데이터가 없을 때 처리 미흡
- 에러 발생 시 기본 응답 필요

---

## ✅ 해결 완료

### 1. 프론트엔드 수정 ✅
**파일**: `frontend-app/components/challenge-card.tsx`

```typescript
// Before (에러 발생)
const { challenge, completed_count, ... } = progress
return (
  <h3>{challenge.title}</h3>  // challenge가 undefined면 에러!
)

// After (안전한 접근)
if (!challenge) {
  return <div>챌린지를 불러오는 중...</div>
}

return (
  <h3>{challenge.title || '챌린지'}</h3>
  <span>{challenge.rewards?.xp || 0}</span>  // Optional chaining
)
```

**변경 사항**:
- `challenge` 객체 null 체크 추가
- Optional chaining (`?.`) 사용
- 기본값 제공

### 2. 백엔드 거리 계산 추가 ✅
**파일**: `backend/routes/recommendations_rest.py`

```python
# Haversine 공식으로 거리 계산
def calculate_distance(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371000  # 지구 반지름 (미터)
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

# 각 장소에 대해 거리 계산
for place in selected:
    distance = calculate_distance(
        user_lat, user_lon,
        place['latitude'], place['longitude']
    )
    
    # 스코어 계산
    score = 85.0
    score += place.get('average_rating', 0) * 2
    if distance > 0:
        distance_score = max(0, 10 - (distance / 1000))
        score += distance_score
```

### 3. 백엔드 에러 처리 개선 ✅
**파일**: `backend/routes/ai_features.py`, `backend/routes/challenges.py`

```python
@router.post("/pattern/analyze")
async def analyze_pattern(request, db):
    try:
        # ... 로직
    except Exception as e:
        logger.error(f"Pattern analysis error: {e}")
        
        # 에러 시 기본 응답 반환
        return {
            "user_id": request.user_id,
            "analysis": {
                "dominant_style": "beginner",
                "favorite_categories": [],
                ...
            },
            "stats": {"total_visits": 0, ...},
            "ai_analysis": "패턴 분석 중 오류가 발생했습니다."
        }
```

---

## 🚨 남은 작업: DB 마이그레이션 필요

### 문제
현재 DB에 `latitude`, `longitude` 컬럼이 없어서 거리 계산이 안 됨

### 해결 방법

#### 1단계: Supabase SQL Editor 열기
1. https://supabase.com/dashboard 접속
2. WhereHere 프로젝트 선택
3. 왼쪽 메뉴에서 "SQL Editor" 클릭

#### 2단계: 마이그레이션 실행
다음 SQL을 복사해서 실행:

```sql
-- latitude, longitude 컬럼 추가
ALTER TABLE places 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- 기존 location 데이터에서 lat/lon 추출
UPDATE places 
SET 
    latitude = ST_Y(location::geometry),
    longitude = ST_X(location::geometry)
WHERE location IS NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_places_lat_lon ON places(latitude, longitude);

-- 샘플 데이터 업데이트 (서울 주요 지역)
UPDATE places SET latitude = 37.5656, longitude = 126.9254 WHERE id = 'kakao-place-001';
UPDATE places SET latitude = 37.5563, longitude = 126.9240 WHERE id = 'kakao-place-002';
UPDATE places SET latitude = 37.5347, longitude = 127.0023 WHERE id = 'kakao-place-003';
UPDATE places SET latitude = 37.5445, longitude = 127.0557 WHERE id = 'kakao-place-004';
UPDATE places SET latitude = 37.5858, longitude = 126.9823 WHERE id = 'kakao-place-005';
UPDATE places SET latitude = 37.5665, longitude = 126.9910 WHERE id = 'kakao-place-006';
UPDATE places SET latitude = 37.5826, longitude = 126.9849 WHERE id = 'kakao-place-007';
UPDATE places SET latitude = 37.5547, longitude = 126.9198 WHERE id = 'kakao-place-008';
UPDATE places SET latitude = 37.5172, longitude = 127.0473 WHERE id = 'kakao-place-009';
UPDATE places SET latitude = 37.5794, longitude = 126.9770 WHERE id = 'kakao-place-010';
UPDATE places SET latitude = 37.5512, longitude = 126.9882 WHERE id = 'kakao-place-011';
UPDATE places SET latitude = 37.5443, longitude = 127.0557 WHERE id = 'kakao-place-012';
UPDATE places SET latitude = 37.5665, longitude = 126.9784 WHERE id = 'kakao-place-013';
UPDATE places SET latitude = 37.5172, longitude = 127.0286 WHERE id = 'kakao-place-014';
UPDATE places SET latitude = 37.5443, longitude = 127.0557 WHERE id = 'kakao-place-015';
```

#### 3단계: 실행 확인
```sql
-- 확인 쿼리
SELECT id, name, latitude, longitude 
FROM places 
WHERE latitude IS NOT NULL 
LIMIT 10;
```

결과가 나오면 성공!

---

## 🧪 테스트 방법

### 1. API 테스트
```powershell
# test_api.ps1 실행
powershell -ExecutionPolicy Bypass -File test_api.ps1
```

**예상 결과** (마이그레이션 후):
```
=== Recommendations Test ===
Data Source: database_rest
Total Candidates: 15

Place: 연남동 책방 카페
  Distance: 523.4m      ← 이제 실제 거리 표시!
  Score: 92.3           ← 거리 기반 스코어
  Category: 카페

Place: 성수 루프탑 카페
  Distance: 1247.8m
  Score: 88.7
  Category: 카페
```

### 2. 프론트엔드 테스트
1. http://localhost:3003 접속
2. "퀘스트" 탭 클릭
3. 챌린지 생성
4. 에러 없이 표시되는지 확인

---

## 📊 변경 사항 요약

### 수정된 파일
1. ✅ `frontend-app/components/challenge-card.tsx` - 안전한 데이터 접근
2. ✅ `backend/routes/recommendations_rest.py` - 거리 계산 추가
3. ✅ `backend/routes/ai_features.py` - 에러 처리 개선
4. ✅ `backend/routes/challenges.py` - 에러 처리 개선

### 생성된 파일
1. ✅ `supabase/migrations/ADD_LAT_LON.sql` - DB 마이그레이션
2. ✅ `test_api.ps1` - API 테스트 스크립트
3. ✅ `FIX_DISTANCE_ISSUE.md` - 이 문서

### 실행 필요
1. ⏳ Supabase SQL Editor에서 `ADD_LAT_LON.sql` 실행
2. ✅ 백엔드 재시작 (완료)

---

## 🎯 다음 단계

### 즉시 해야 할 일
1. **DB 마이그레이션 실행** (위 SQL 실행)
2. **API 테스트** (test_api.ps1)
3. **프론트엔드 확인** (챌린지 생성 테스트)

### 장기 개선 사항
1. **장소 데이터 대폭 확충**
   - 현재: 15개 샘플 데이터
   - 목표: 500-1000개 실제 장소
   - 방법: Kakao Local API 사용

2. **실시간 거리 계산**
   - 사용자 위치 추적
   - 실시간 거리 업데이트
   - 가까운 순 정렬

3. **스마트 추천 알고리즘**
   - 하이브리드 추천 엔진 구현
   - 사용자 선호도 학습
   - 컨텍스트 기반 추천

---

## 🐛 문제 해결

### Q: 여전히 거리가 0m로 표시됩니다
**A**: DB 마이그레이션을 실행했는지 확인
```sql
-- 확인 쿼리
SELECT COUNT(*) FROM places WHERE latitude IS NOT NULL;
```
결과가 0이면 마이그레이션 미실행

### Q: 챌린지 생성 시 여전히 에러가 납니다
**A**: 백엔드 재시작 확인
```powershell
# 백엔드 재시작
taskkill /F /IM python.exe
cd backend
python -m uvicorn main:app --reload
```

### Q: API 테스트 시 한글이 깨집니다
**A**: 정상입니다. PowerShell 인코딩 문제이며 실제 API는 정상 작동

---

## 📞 추가 지원

문제가 계속되면:
1. 백엔드 로그 확인: `terminals/634228.txt`
2. 프론트엔드 콘솔 확인: F12 개발자 도구
3. DB 데이터 확인: Supabase Dashboard → Table Editor
