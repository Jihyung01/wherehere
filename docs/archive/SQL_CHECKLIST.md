# Supabase SQL 실행 체크리스트 📋

## 📊 현재 실행 상태 분석

### ✅ 이미 실행된 SQL (Supabase 히스토리 기준)
1. ✅ **WhereHere Core Schema** - 기본 스키마
2. ✅ **Seed data for places** - 장소 샘플 데이터
3. ✅ **Places Row Count** - 장소 개수 확인
4. ✅ **WhereHere App Schema** - 앱 스키마
5. ✅ **Add latitude and longitude** - 위도/경도 컬럼 추가
6. ✅ **Add geolocation columns** - 지리 정보 컬럼
7. ✅ **User Visit Records** - 방문 기록 (일부)
8. ✅ **Visits Table: Policy Conflict** - Visits 테이블 (정책 충돌)

## ⚠️ 실행 필요한 SQL

### 🔴 필수: UPDATE_VISITS_TABLE.sql
**파일**: `supabase/migrations/UPDATE_VISITS_TABLE.sql`

**이유**: 
- "Policy already exists" 에러가 발생했음
- 기존 visits 테이블이 있지만 불완전할 수 있음
- 정책을 안전하게 재생성하고 샘플 데이터 확인 필요

**실행 방법**:
1. Supabase SQL Editor 접속
2. `UPDATE_VISITS_TABLE.sql` 전체 내용 복사
3. 붙여넣기 후 **RUN** 클릭

**예상 결과**:
```
NOTICE: 기존 샘플 데이터 X개 발견, 추가 생성하지 않음
또는
NOTICE: 샘플 데이터 7개 추가 완료

status                              | total_visits | unique_users
------------------------------------+--------------+-------------
Visits table updated successfully!  | 7            | 1
```

## 🔍 현재 데이터 확인용 SQL

### CHECK_VISITS_TABLE.sql (선택 사항)
**파일**: `supabase/migrations/CHECK_VISITS_TABLE.sql`

**목적**: 현재 visits 테이블 상태 확인
- 테이블 구조
- 인덱스
- 정책
- 데이터 개수

**실행 방법**:
```sql
-- 1. 테이블 존재 확인
SELECT * FROM visits LIMIT 5;

-- 2. 데이터 개수 확인
SELECT COUNT(*) FROM visits WHERE user_id = 'user-demo-001';

-- 3. 장소 정보와 조인 확인
SELECT 
    v.id,
    v.visited_at,
    p.name as place_name,
    p.latitude,
    p.longitude,
    v.xp_earned
FROM visits v
LEFT JOIN places p ON v.place_id = p.id
WHERE v.user_id = 'user-demo-001'
ORDER BY v.visited_at DESC
LIMIT 5;
```

## 📊 필수 SQL 실행 순서

### 이미 완료된 것들 ✅
```
1. ✅ Core Schema (테이블 생성)
2. ✅ Places 테이블
3. ✅ ADD_LAT_LON.sql (latitude, longitude 컬럼)
4. ✅ 2,516개 실제 장소 데이터 (collect_simple.py로 수집)
5. ⚠️ Visits 테이블 (부분 완료, 업데이트 필요)
```

### 지금 해야 할 것 🔴
```
6. 🔴 UPDATE_VISITS_TABLE.sql 실행 (필수!)
```

## 🎯 확인 방법

### 1. Places 테이블 확인
```sql
SELECT COUNT(*) as total_places FROM places WHERE is_active = true;
```
**기대 결과**: 2,516개

### 2. Latitude/Longitude 확인
```sql
SELECT 
    name, 
    latitude, 
    longitude,
    primary_category
FROM places 
WHERE latitude IS NOT NULL 
LIMIT 5;
```
**기대 결과**: 5개 장소의 위도/경도 표시

### 3. Visits 테이블 확인 (실행 전)
```sql
SELECT COUNT(*) FROM visits WHERE user_id = 'user-demo-001';
```
**현재 결과**: 0개 또는 일부만 있음

### 4. Visits 테이블 확인 (실행 후)
```sql
SELECT COUNT(*) FROM visits WHERE user_id = 'user-demo-001';
```
**기대 결과**: 7개

## 🔧 완전한 데이터베이스 상태 체크

### 전체 확인 SQL
```sql
-- 1. 모든 테이블 확인
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Places 데이터 확인
SELECT 
    COUNT(*) as total_places,
    COUNT(DISTINCT primary_category) as categories,
    COUNT(*) FILTER (WHERE latitude IS NOT NULL) as has_location
FROM places;

-- 3. Visits 데이터 확인
SELECT 
    COUNT(*) as total_visits,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT place_id) as unique_places
FROM visits;

-- 4. 외래 키 관계 확인
SELECT 
    v.id,
    v.user_id,
    v.place_id,
    p.name as place_exists
FROM visits v
LEFT JOIN places p ON v.place_id = p.id
LIMIT 5;
```

## 📝 최종 체크리스트

### 데이터베이스
- ✅ places 테이블 생성
- ✅ latitude, longitude 컬럼 추가
- ✅ 2,516개 실제 장소 데이터
- ⏳ visits 테이블 완전 설정 (UPDATE_VISITS_TABLE.sql 실행 필요)

### 백엔드
- ✅ 추천 API
- ✅ 방문 기록 API
- ✅ AI 분석 API
- ✅ CORS 설정 (3004, 3005 포트 추가)

### 프론트엔드
- ✅ 라이트모드 기본
- ✅ 다크모드 토글
- ✅ 테마 동기화
- ✅ 모든 기능 통합

## 🚀 실행 순서

### 지금 해야 할 단 1가지!
```
1. Supabase SQL Editor 접속
2. UPDATE_VISITS_TABLE.sql 복사
3. 붙여넣기 후 RUN 클릭
4. "Success" 확인
```

### 완료 후 테스트
```sql
-- 샘플 데이터 확인
SELECT 
    v.visited_at,
    p.name as place_name,
    v.duration_minutes,
    v.xp_earned,
    v.mood
FROM visits v
LEFT JOIN places p ON v.place_id = p.id
WHERE v.user_id = 'user-demo-001'
ORDER BY v.visited_at DESC;
```

**기대 결과**: 7개 방문 기록 표시

## ⚠️ 만약 에러가 발생하면

### "Policy already exists" 에러
→ 정상입니다! UPDATE_VISITS_TABLE.sql이 자동으로 처리합니다.

### "Table already exists" 에러
→ 정상입니다! IF NOT EXISTS로 안전하게 처리됩니다.

### "No data" 결과
→ places 테이블에 데이터가 없는 것입니다.
```powershell
# 장소 데이터 다시 수집
cd scripts
python collect_simple.py
```

## 🎉 완료 후

모든 SQL이 실행되면:
1. http://localhost:3004 접속
2. 역할 선택 → 기분 선택 → 퀘스트
3. 체크인 → 리뷰 → XP 획득
4. **나의 지도**에서 방문 기록 확인 ✅

---

**현재 상태**: UPDATE_VISITS_TABLE.sql 실행만 남음
**예상 소요 시간**: 1분
**다음 단계**: Supabase에서 SQL 실행
