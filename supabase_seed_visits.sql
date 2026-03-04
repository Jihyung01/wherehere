-- ========================================
-- 나의 지도 테스트 데이터 추가
-- ========================================
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ⚠️ 'user-demo-001'을 실제 사용자 ID로 변경하세요!

-- 1. places 테이블에 테스트 장소 추가
INSERT INTO places (id, name, primary_category, latitude, longitude, is_active, address, rating, description)
VALUES 
  ('place-yeonnam-bookstore', '연남동 책방 카페', '북카페', 37.5656, 126.9254, true, '서울특별시 마포구 연남동', 4.8, '조용한 책방 카페'),
  ('place-vintage-record', '빈티지 레코드 카페', '카페', 37.5563, 126.9240, true, '서울특별시 마포구', 4.7, '빈티지 레코드와 커피'),
  ('place-hannam-garden', '한남동 숨은 정원', '공원', 37.5347, 127.0023, true, '서울특별시 용산구 한남동', 4.9, '숨겨진 정원'),
  ('place-seongsu-factory', '성수 공장 카페', '카페', 37.5445, 127.0557, true, '서울특별시 성동구 성수동', 4.6, '공장을 개조한 카페'),
  ('place-samcheong-gallery', '삼청동 갤러리 카페', '갤러리', 37.5858, 126.9823, true, '서울특별시 종로구 삼청동', 4.6, '갤러리 겸 카페'),
  ('place-euljiro-rooftop', '을지로 루프탑 바', '이색장소', 37.5665, 126.9910, true, '서울특별시 중구 을지로', 4.7, '루프탑 바'),
  ('place-hanok-teahouse', '한옥 티하우스', '북카페', 37.5826, 126.9849, true, '서울특별시 종로구', 4.7, '전통 한옥 티하우스'),
  ('place-art-street', '아트 스트리트 벽화골목', '이색장소', 37.5547, 126.9198, true, '서울특별시 마포구', 4.4, '벽화가 있는 골목')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  primary_category = EXCLUDED.primary_category,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  rating = EXCLUDED.rating;

-- 2. visits 테이블에 방문 기록 추가
-- ⚠️⚠️⚠️ 'user-demo-001'을 실제 사용자 ID로 변경하세요! ⚠️⚠️⚠️
-- 실제 사용자 ID는 Supabase Dashboard → Authentication → Users에서 확인
INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, companions, xp_earned)
VALUES 
  ('user-demo-001', 'place-yeonnam-bookstore', NOW() - INTERVAL '1 day', 85, 4.8, '호기심', 8000, 1, 150),
  ('user-demo-001', 'place-vintage-record', NOW() - INTERVAL '2 days', 60, 4.7, '행복', 7000, 1, 120),
  ('user-demo-001', 'place-hannam-garden', NOW() - INTERVAL '3 days', 45, 4.9, '평온', 0, 1, 100),
  ('user-demo-001', 'place-seongsu-factory', NOW() - INTERVAL '4 days', 70, 4.6, '활기찬', 12000, 1, 130),
  ('user-demo-001', 'place-samcheong-gallery', NOW() - INTERVAL '5 days', 90, 4.6, '영감', 13000, 1, 200),
  ('user-demo-001', 'place-euljiro-rooftop', NOW() - INTERVAL '6 days', 120, 4.7, '설렘', 35000, 1, 180),
  ('user-demo-001', 'place-hanok-teahouse', NOW() - INTERVAL '7 days', 65, 4.7, '평온', 9000, 1, 140),
  ('user-demo-001', 'place-art-street', NOW() - INTERVAL '8 days', 40, 4.4, '호기심', 0, 1, 110);

-- 3. 확인
SELECT 
  v.id,
  v.user_id,
  v.place_id,
  p.name as place_name,
  v.visited_at,
  v.xp_earned
FROM visits v
LEFT JOIN places p ON v.place_id = p.id
WHERE v.user_id = 'user-demo-001'
ORDER BY v.visited_at DESC;

-- 4. 통계 확인
SELECT 
  user_id,
  COUNT(*) as total_visits,
  SUM(xp_earned) as total_xp,
  COUNT(DISTINCT place_id) as unique_places
FROM visits
WHERE user_id = 'user-demo-001'
GROUP BY user_id;
