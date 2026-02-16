-- ============================================================
-- WhereHere: VISITS 테이블 즉시 설정 스크립트
-- ============================================================

-- 1. 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS visits (
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

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits(place_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);

-- 3. RLS 정책
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visits" ON visits;
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own visits" ON visits;
CREATE POLICY "Users can insert own visits" ON visits FOR INSERT WITH CHECK (true);

-- 4. 기존 테스트 데이터 삭제 (중복 방지)
DELETE FROM visits WHERE user_id = 'user-demo-001';

-- 5. 샘플 데이터 즉시 삽입 (7개)
INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, companions, xp_earned)
VALUES
  ('user-demo-001', 'kakao-26338954', NOW() - interval '1 day', 60, 4.5, '즐거움', 12000, 1, 120),
  ('user-demo-001', 'kakao-491234814', NOW() - interval '3 days', 90, 5.0, '평온함', 8000, 2, 150),
  ('user-demo-001', 'kakao-27172878', NOW() - interval '5 days', 45, 4.0, '신남', 15000, 1, 100),
  ('user-demo-001', 'kakao-8544481', NOW() - interval '7 days', 120, 5.0, '만족', 20000, 1, 180),
  ('user-demo-001', 'kakao-773361885', NOW() - interval '10 days', 75, 4.5, '즐거움', 10000, 3, 130),
  ('user-demo-001', 'kakao-1999048621', NOW() - interval '12 days', 60, 4.0, '호기심', 5000, 1, 100),
  ('user-demo-001', 'kakao-8396311', NOW() - interval '15 days', 90, 5.0, '평온함', 18000, 2, 150);

-- 6. 결과 확인
SELECT 
  'Visits table updated successfully!' as status,
  COUNT(*) as total_visits,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(xp_earned) as total_xp
FROM visits;

-- 7. 상세 확인
SELECT 
  user_id,
  place_id,
  visited_at,
  rating,
  xp_earned
FROM visits 
WHERE user_id = 'user-demo-001'
ORDER BY visited_at DESC;
