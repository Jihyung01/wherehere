# 🚨 긴급: SQL 실행 필요

## 현재 상황
✅ **백엔드**: 정상 실행 중 (포트 8000)
✅ **프론트엔드**: 정상 빌드 완료 (포트 3005)
❌ **데이터베이스**: visits 테이블이 비어있음 (`total_count: 0`)

## 🔴 지금 즉시 실행하세요

### 1단계: Supabase SQL Editor 접속
1. https://supabase.com/dashboard 로그인
2. WhereHere 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 스크립트 실행
파일 위치: `supabase/migrations/UPDATE_VISITS_TABLE.sql`

```sql
-- 1. 테이블이 없으면 생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER DEFAULT 60,
  rating FLOAT,
  mood TEXT,
  spent_amount INTEGER,
  companions TEXT,
  xp_earned INTEGER DEFAULT 0
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits(place_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);

-- 3. RLS 정책 (기존 삭제 후 재생성)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visits" ON visits;
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own visits" ON visits;
CREATE POLICY "Users can insert own visits" ON visits FOR INSERT WITH CHECK (true);

-- 4. 샘플 데이터 삽입 (데이터가 없는 경우에만)
INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, xp_earned)
SELECT 'user-demo-001', place_id, 
       NOW() - (random() * interval '30 days'),
       (30 + random() * 120)::int,
       3 + random() * 2,
       CASE (random() * 4)::int 
         WHEN 0 THEN '즐거움' WHEN 1 THEN '평온함' 
         WHEN 2 THEN '신남' ELSE '만족' END,
       (5000 + random() * 25000)::int,
       (50 + random() * 150)::int
FROM (SELECT DISTINCT id as place_id FROM places ORDER BY random() LIMIT 7) p
WHERE NOT EXISTS (SELECT 1 FROM visits WHERE user_id = 'user-demo-001');
```

### 3단계: 실행 확인
SQL Editor에서:
```sql
SELECT COUNT(*) as total_visits FROM visits WHERE user_id = 'user-demo-001';
```

**기대 결과**: `total_visits: 7` (7개의 방문 기록)

## 📊 실행 후 확인사항

### 백엔드 테스트
PowerShell에서:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001" | ConvertTo-Json
```

**기대 결과**: 
```json
{
  "visits": [ /* 7개의 방문 데이터 */ ],
  "total_count": 7
}
```

### 프론트엔드 확인
1. http://localhost:3005 접속
2. "나의 지도" 버튼 클릭
3. **확인사항**:
   - ✅ 지도에 마커 7개 표시
   - ✅ 마커 클릭 시 정보창 표시
   - ✅ 최근 방문 리스트 표시
   - ✅ 통계 탭에서 카테고리 분포 표시

## ⚠️ 주의사항

- 이 스크립트는 **멱등성(idempotent)**이 보장됩니다
- 여러 번 실행해도 안전합니다
- 기존 데이터가 있으면 중복 생성되지 않습니다

## 🐛 에러 해결

### 에러: "relation visits does not exist"
→ 스크립트의 CREATE TABLE 부분만 먼저 실행

### 에러: "policy already exists"
→ 정상입니다. DROP POLICY 부분이 기존 정책을 제거합니다

### 에러: "duplicate key value"
→ 이미 데이터가 있습니다. SELECT로 확인해보세요

## 📞 문제 발생 시
1. Supabase SQL Editor History 확인
2. 실행된 쿼리와 에러 메시지 공유
3. visits 테이블 상태 확인:
   ```sql
   SELECT * FROM visits LIMIT 5;
   ```

---

**⏰ 예상 소요 시간**: 2분
**🎯 이 작업이 완료되면 모든 기능이 정상 작동합니다!**
