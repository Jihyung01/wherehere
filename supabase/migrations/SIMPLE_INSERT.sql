-- ============================================================
-- 초간단 VISITS 데이터 삽입 (100% 작동 보장)
-- ============================================================

-- 1단계: 기존 데이터 완전 삭제
DELETE FROM visits;

-- 2단계: 직접 데이터 삽입 (place_id 직접 지정)
INSERT INTO visits (
  id,
  user_id, 
  place_id, 
  visited_at, 
  duration_minutes, 
  rating, 
  mood, 
  spent_amount, 
  companions,
  xp_earned
) VALUES
  (gen_random_uuid(), 'user-demo-001', 'place-001', NOW() - interval '1 day', 60, 4.5, '즐거움', 12000, 1, 120),
  (gen_random_uuid(), 'user-demo-001', 'place-002', NOW() - interval '3 days', 90, 5.0, '평온함', 8000, 2, 150),
  (gen_random_uuid(), 'user-demo-001', 'place-003', NOW() - interval '5 days', 45, 4.0, '신남', 15000, 1, 100),
  (gen_random_uuid(), 'user-demo-001', 'place-004', NOW() - interval '7 days', 120, 5.0, '만족', 20000, 1, 180),
  (gen_random_uuid(), 'user-demo-001', 'place-005', NOW() - interval '10 days', 75, 4.5, '즐거움', 10000, 3, 130),
  (gen_random_uuid(), 'user-demo-001', 'place-006', NOW() - interval '12 days', 60, 4.0, '호기심', 5000, 1, 100),
  (gen_random_uuid(), 'user-demo-001', 'place-007', NOW() - interval '15 days', 90, 5.0, '평온함', 18000, 2, 150);

-- 3단계: 즉시 확인
SELECT 
  COUNT(*) as total_visits,
  SUM(xp_earned) as total_xp,
  string_agg(DISTINCT user_id, ', ') as users
FROM visits;

-- 4단계: 상세 확인
SELECT 
  place_id,
  visited_at,
  rating,
  xp_earned,
  mood
FROM visits 
WHERE user_id = 'user-demo-001'
ORDER BY visited_at DESC;
