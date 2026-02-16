# Visits 테이블 에러 해결 가이드

## 🔍 문제 상황

```
ERROR: 42710: policy "Users can view own visits" for table "visits" already exists
```

이 에러는 visits 테이블이 이미 존재하며, 정책(policy)도 이미 생성되어 있다는 의미입니다.

## ✅ 해결 방법

### 방법 1: 안전한 업데이트 스크립트 사용 (권장)

**파일**: `supabase/migrations/UPDATE_VISITS_TABLE.sql`

이 스크립트는:
- 기존 테이블이 있으면 건너뛰기
- 기존 정책이 있으면 삭제 후 재생성
- 샘플 데이터가 없을 때만 추가

**실행 방법:**
1. Supabase SQL Editor 접속
2. `UPDATE_VISITS_TABLE.sql` 내용 복사
3. 붙여넣기 후 RUN 클릭

### 방법 2: 현재 상태 확인

**파일**: `supabase/migrations/CHECK_VISITS_TABLE.sql`

현재 visits 테이블 상태를 확인합니다:
- 테이블 존재 여부
- 컬럼 구조
- 인덱스
- 정책
- 데이터 개수

**실행 방법:**
1. Supabase SQL Editor 접속
2. `CHECK_VISITS_TABLE.sql` 내용 복사
3. 붙여넣기 후 RUN 클릭
4. 결과 확인

## 🎯 예상 결과

### UPDATE_VISITS_TABLE.sql 실행 후

```
NOTICE: 기존 샘플 데이터 X 개 발견, 추가 생성하지 않음
또는
NOTICE: 샘플 데이터 7개 추가 완료

status                              | total_visits | unique_users
------------------------------------+--------------+-------------
Visits table updated successfully!  | 7            | 1
```

### CHECK_VISITS_TABLE.sql 실행 후

```
table_exists
------------
true

column_name      | data_type                   | is_nullable | column_default
-----------------+-----------------------------+-------------+-------------------
id               | uuid                        | NO          | gen_random_uuid()
user_id          | text                        | NO          | 
place_id         | text                        | NO          | 
visited_at       | timestamp with time zone    | YES         | now()
duration_minutes | integer                     | YES         | 60
rating           | double precision            | YES         | 
mood             | text                        | YES         | 
spent_amount     | integer                     | YES         | 
companions       | integer                     | YES         | 1
xp_earned        | integer                     | YES         | 100
created_at       | timestamp with time zone    | YES         | now()
updated_at       | timestamp with time zone    | YES         | now()

total_visits | unique_users | earliest_visit      | latest_visit
-------------+--------------+---------------------+---------------------
7            | 1            | 2024-02-07 14:30:00 | 2024-02-14 14:30:00
```

## 🚀 테스트

### 1. 백엔드 API 테스트

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001" -Method Get
```

**예상 결과:**
```json
{
  "visits": [
    {
      "id": "uuid",
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
  "total_count": 7
}
```

### 2. 프론트엔드 테스트

1. http://localhost:3004/my-map-real 접속
2. 로딩 후 지도 표시 확인
3. 7개 마커 표시 확인
4. 마커 클릭 → 인포윈도우 확인

## 🔧 추가 문제 해결

### 문제: "테이블이 존재하지 않음"

**해결:**
```sql
-- CREATE_VISITS_TABLE.sql 실행
-- 또는 UPDATE_VISITS_TABLE.sql 실행
```

### 문제: "샘플 데이터가 없음"

**해결:**
```sql
-- places 테이블에 데이터가 있는지 확인
SELECT COUNT(*) FROM places WHERE is_active = true;

-- 데이터가 없으면 collect_simple.py 실행
-- 데이터가 있으면 UPDATE_VISITS_TABLE.sql 재실행
```

### 문제: "정책 에러"

**해결:**
```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own visits" ON visits;
DROP POLICY IF EXISTS "Users can create visits" ON visits;

-- 정책 재생성
CREATE POLICY "Users can view own visits" ON visits
    FOR SELECT USING (true);

CREATE POLICY "Users can create visits" ON visits
    FOR INSERT WITH CHECK (true);
```

## 📊 데이터 확인

### Supabase 대시보드에서 확인

1. Supabase 대시보드 접속
2. Table Editor 메뉴 클릭
3. "visits" 테이블 선택
4. 데이터 확인

### SQL로 확인

```sql
-- 전체 데이터 확인
SELECT * FROM visits ORDER BY visited_at DESC;

-- 사용자별 통계
SELECT 
    user_id,
    COUNT(*) as visit_count,
    SUM(xp_earned) as total_xp,
    AVG(duration_minutes) as avg_duration
FROM visits
GROUP BY user_id;

-- 최근 7일 방문 기록
SELECT 
    place_id,
    visited_at,
    duration_minutes,
    xp_earned
FROM visits
WHERE visited_at >= NOW() - INTERVAL '7 days'
ORDER BY visited_at DESC;
```

## ✅ 성공 확인

모든 것이 정상이면:

1. ✅ `UPDATE_VISITS_TABLE.sql` 실행 성공
2. ✅ `CHECK_VISITS_TABLE.sql`에서 데이터 확인
3. ✅ 백엔드 API에서 데이터 반환
4. ✅ 프론트엔드에서 지도 + 마커 표시
5. ✅ 체크인 → 리뷰 → 새 방문 기록 생성

## 🎉 완료!

이제 visits 테이블이 정상적으로 작동합니다!

**다음 단계:**
1. http://localhost:3004 접속
2. 전체 플로우 테스트 (역할 선택 → 체크인 → 리뷰)
3. http://localhost:3004/my-map-real에서 방문 기록 확인

---

**문서 업데이트**: 2026-02-16
**상태**: 해결 완료
