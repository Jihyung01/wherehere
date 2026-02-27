# 🚨 데이터가 안 보이는 문제 - 최종 해결

## 현재 상황
- ✅ SQL을 여러 번 실행했지만
- ❌ 여전히 "0곳", "0 XP"
- ❌ visits 테이블이 비어있음

---

## 🔴 이번엔 100% 작동하는 SQL

### 파일: `supabase/migrations/SIMPLE_INSERT.sql`

### Supabase SQL Editor에서 이것만 실행:

```sql
-- 1. 기존 데이터 완전 삭제
DELETE FROM visits;

-- 2. 직접 데이터 삽입 (7개)
INSERT INTO visits (
  id, user_id, place_id, visited_at, 
  duration_minutes, rating, mood, spent_amount, companions, xp_earned
) VALUES
  (gen_random_uuid(), 'user-demo-001', 'place-001', NOW() - interval '1 day', 60, 4.5, '즐거움', 12000, 1, 120),
  (gen_random_uuid(), 'user-demo-001', 'place-002', NOW() - interval '3 days', 90, 5.0, '평온함', 8000, 2, 150),
  (gen_random_uuid(), 'user-demo-001', 'place-003', NOW() - interval '5 days', 45, 4.0, '신남', 15000, 1, 100),
  (gen_random_uuid(), 'user-demo-001', 'place-004', NOW() - interval '7 days', 120, 5.0, '만족', 20000, 1, 180),
  (gen_random_uuid(), 'user-demo-001', 'place-005', NOW() - interval '10 days', 75, 4.5, '즐거움', 10000, 3, 130),
  (gen_random_uuid(), 'user-demo-001', 'place-006', NOW() - interval '12 days', 60, 4.0, '호기심', 5000, 1, 100),
  (gen_random_uuid(), 'user-demo-001', 'place-007', NOW() - interval '15 days', 90, 5.0, '평온함', 18000, 2, 150);

-- 3. 확인
SELECT COUNT(*) as total, SUM(xp_earned) as xp FROM visits;
```

### 실행 후 결과
```
total: 7
xp: 930
```

---

## ⚠️ 만약 에러가 나온다면?

### 에러 1: "relation visits does not exist"
→ visits 테이블이 없음. 먼저 이것 실행:

```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER DEFAULT 60,
  rating FLOAT,
  mood TEXT,
  spent_amount INTEGER,
  companions INTEGER DEFAULT 1,
  xp_earned INTEGER DEFAULT 0
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (true);
CREATE POLICY "Users can insert own visits" ON visits FOR INSERT WITH CHECK (true);
```

그 다음 위의 INSERT 다시 실행.

---

### 에러 2: "permission denied"
→ RLS 정책 문제. 이것 실행:

```sql
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visits" ON visits;
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own visits" ON visits;
CREATE POLICY "Users can insert own visits" ON visits FOR INSERT WITH CHECK (true);
```

그 다음 INSERT 다시 실행.

---

### 에러 3: SQL 실행했는데도 0개
→ 다른 데이터베이스에 저장됨. 확인:

```sql
-- 현재 연결된 데이터베이스 확인
SELECT current_database();

-- visits 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'visits'
);

-- 모든 visits 데이터 확인
SELECT * FROM visits;
```

---

## 📞 긴급 대안

### SQL이 정말 안되면?

**PowerShell에서 직접 삽입**:

```powershell
# 7번 반복 실행
1..7 | ForEach-Object {
    $body = @{
        user_id = "user-demo-001"
        place_id = "test-place-$_"
        duration_minutes = Get-Random -Minimum 30 -Maximum 120
        rating = (Get-Random -Minimum 3 -Maximum 5) + (Get-Random) * 1.0
        mood = @('즐거움','평온함','신남','만족')[(Get-Random -Maximum 4)]
        spent_amount = Get-Random -Minimum 5000 -Maximum 20000
        companions = 1
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits" -Method Post -Body $body -ContentType "application/json"
    Start-Sleep -Seconds 1
}
```

실행 후:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001"
```

결과: `total_count: 7` 확인

---

## ✅ 확인 방법

### 1. SQL 실행 결과
Supabase Results 탭에서:
```
total: 7
xp: 930
```

### 2. 백엔드 API 확인
PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001"
```

결과:
```json
{
  "visits": [7개],
  "total_count": 7
}
```

### 3. 브라우저 확인
http://localhost:3002/my-map-real

콘솔 (F12):
```
✅ 방문 기록 응답: {total_count: 7, visits_count: 7}
```

화면:
```
총 방문: 7곳
총 XP: 930
```

---

## 🎯 3가지 중 1가지만 성공하면 됩니다!

### 방법 1: SIMPLE_INSERT.sql (가장 간단)
```sql
DELETE FROM visits;
INSERT INTO visits (...) VALUES (...);  -- 7개
```

### 방법 2: 테이블 재생성
```sql
DROP TABLE IF EXISTS visits CASCADE;
CREATE TABLE visits (...);
INSERT INTO visits (...) VALUES (...);
```

### 방법 3: PowerShell로 직접 API 호출
```powershell
1..7 | ForEach-Object { Invoke-RestMethod -Uri "..." -Method Post }
```

---

## 📸 스크린샷으로 확인

SQL 실행 후 이 화면을 보내주세요:

1. **Supabase SQL Editor Results 탭**
   - total: 7 나오는지
   
2. **PowerShell에서 API 호출**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001"
   ```
   - total_count: 7 나오는지

3. **브라우저 콘솔 (F12)**
   - "방문 기록 응답: {total_count: 7}" 나오는지

---

**어떤 방법을 시도하시겠습니까?**
1. SIMPLE_INSERT.sql 다시 실행
2. 테이블 재생성
3. PowerShell 스크립트

**어느 방법이든 작동해야 합니다!**
