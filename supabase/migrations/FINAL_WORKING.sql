-- ============================================================
-- WhereHere 실제 DB 스키마 (완전 작동 버전)
-- ============================================================

-- 1. Places 테이블
CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    location GEOGRAPHY(POINT, 4326),
    primary_category TEXT,
    secondary_categories TEXT[],
    vibe_tags TEXT[],
    description TEXT,
    average_rating FLOAT DEFAULT 0,
    review_count INT DEFAULT 0,
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    typical_crowd_level TEXT DEFAULT 'medium',
    average_price INT,
    price_tier TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(primary_category);
CREATE INDEX IF NOT EXISTS idx_places_active ON places(is_active) WHERE is_active = TRUE;

-- 2. User Visits
CREATE TABLE IF NOT EXISTS user_visits (
    id TEXT PRIMARY KEY DEFAULT 'visit-' || substr(md5(random()::text), 1, 16),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    visited_at TIMESTAMP DEFAULT NOW(),
    duration_minutes INT,
    rating FLOAT,
    review TEXT,
    photos TEXT[],
    mood TEXT,
    companions INT DEFAULT 1,
    spent_amount INT
);

CREATE INDEX IF NOT EXISTS idx_user_visits_user ON user_visits(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_visits_place ON user_visits(place_id);

-- 3. User Personality
CREATE TABLE IF NOT EXISTS user_personality (
    user_id TEXT PRIMARY KEY,
    openness FLOAT DEFAULT 0.5,
    conscientiousness FLOAT DEFAULT 0.5,
    extraversion FLOAT DEFAULT 0.5,
    agreeableness FLOAT DEFAULT 0.5,
    neuroticism FLOAT DEFAULT 0.5,
    preferred_categories TEXT[],
    avg_budget INT DEFAULT 15000,
    avg_duration_minutes INT DEFAULT 90,
    social_ratio FLOAT DEFAULT 0.5,
    total_visits INT DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Location History
CREATE TABLE IF NOT EXISTS location_history (
    id TEXT PRIMARY KEY DEFAULT 'loc-' || substr(md5(random()::text), 1, 16),
    user_id TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_location ON location_history USING GIST(location);

-- 5. Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY DEFAULT 'challenge-' || substr(md5(random()::text), 1, 16),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL,
    theme TEXT,
    places JSONB NOT NULL,
    rewards JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id, status, deadline);

-- 6. Badges
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT,
    unlock_condition JSONB
);

-- 7. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- 8. AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY DEFAULT 'conv-' || substr(md5(random()::text), 1, 16),
    user_id TEXT NOT NULL,
    context_type TEXT,
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);

-- ============================================================
-- 초기 뱃지 데이터
-- ============================================================

INSERT INTO badges (id, code, name, description, icon, rarity, unlock_condition) VALUES
('badge-001', 'first_visit', '첫 발걸음', '첫 장소 방문', '👣', 'common', '{"type": "visit_count", "value": 1}'),
('badge-002', 'cafe_lover', '카페 러버', '카페 10곳 방문', '☕', 'rare', '{"type": "category_count", "category": "카페", "value": 10}'),
('badge-003', 'explorer_10', '탐험가', '10곳 방문', '🧭', 'common', '{"type": "visit_count", "value": 10}'),
('badge-004', 'explorer_50', '베테랑 탐험가', '50곳 방문', '🗺️', 'epic', '{"type": "visit_count", "value": 50}'),
('badge-005', 'hidden_hunter', '히든 헌터', '히든 장소 5곳 발견', '💎', 'epic', '{"type": "hidden_gem_count", "value": 5}'),
('badge-006', 'social_butterfly', '소셜 버터플라이', '모임 10회 참여', '🦋', 'rare', '{"type": "gathering_count", "value": 10}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 샘플 장소 데이터
-- ============================================================

INSERT INTO places (id, name, address, location, primary_category, vibe_tags, description, average_rating, is_hidden_gem, average_price, typical_crowd_level) VALUES
('place-001', '연남동 카페거리', '서울 마포구 연남동', ST_SetSRID(ST_MakePoint(126.9250, 37.5665), 4326)::geography, '카페', ARRAY['힙한', '감성', '데이트'], '연남동의 트렌디한 카페들이 모여있는 거리', 4.5, false, 12000, 'high'),
('place-002', '성수동 카페', '서울 성동구 성수동', ST_SetSRID(ST_MakePoint(127.0557, 37.5443), 4326)::geography, '카페', ARRAY['힙한', '루프탑', '인스타'], '성수동의 핫플레이스 카페', 4.6, false, 15000, 'high'),
('place-003', '이태원 북카페', '서울 용산구 이태원동', ST_SetSRID(ST_MakePoint(126.9942, 37.5347), 4326)::geography, '카페', ARRAY['조용한', '책', '힐링'], '책과 함께하는 여유로운 시간', 4.3, true, 10000, 'low'),
('place-004', '홍대 카페', '서울 마포구 홍대입구', ST_SetSRID(ST_MakePoint(126.9250, 37.5563), 4326)::geography, '카페', ARRAY['활기찬', '젊은', '음악'], '홍대의 활기찬 카페 거리', 4.4, false, 11000, 'high'),
('place-005', '강남 카페', '서울 강남구 신사동', ST_SetSRID(ST_MakePoint(127.0205, 37.5172), 4326)::geography, '카페', ARRAY['세련된', '고급', '비즈니스'], '강남의 세련된 카페', 4.5, false, 18000, 'medium'),
('place-006', '한강공원', '서울 영등포구 여의도동', ST_SetSRID(ST_MakePoint(126.9329, 37.5285), 4326)::geography, '공원', ARRAY['자연', '운동', '산책'], '한강을 따라 산책하기 좋은 공원', 4.8, false, 0, 'high'),
('place-007', '서울숲', '서울 성동구 성수동1가', ST_SetSRID(ST_MakePoint(127.0374, 37.5445), 4326)::geography, '공원', ARRAY['자연', '가족', '반려동물'], '도심 속 자연을 만끽할 수 있는 공원', 4.7, false, 0, 'medium'),
('place-008', '남산공원', '서울 용산구 용산동2가', ST_SetSRID(ST_MakePoint(126.9910, 37.5512), 4326)::geography, '공원', ARRAY['자연', '등산', '야경'], '서울 시내를 한눈에 볼 수 있는 공원', 4.6, false, 0, 'high'),
('place-009', '북촌 한옥마을', '서울 종로구 계동길', ST_SetSRID(ST_MakePoint(126.9850, 37.5820), 4326)::geography, '문화공간', ARRAY['전통', '사진', '관광'], '전통 한옥의 아름다움을 느낄 수 있는 곳', 4.6, false, 0, 'high'),
('place-010', '삼청동 갤러리', '서울 종로구 삼청동', ST_SetSRID(ST_MakePoint(126.9820, 37.5860), 4326)::geography, '문화공간', ARRAY['예술', '갤러리', '감성'], '작은 갤러리들이 모여있는 거리', 4.5, true, 0, 'low'),
('place-011', '국립중앙박물관', '서울 용산구 서빙고로', ST_SetSRID(ST_MakePoint(126.9800, 37.5240), 4326)::geography, '박물관', ARRAY['문화', '역사', '교육'], '한국의 역사와 문화를 한눈에', 4.9, false, 0, 'medium'),
('place-012', '익선동 맛집', '서울 종로구 익선동', ST_SetSRID(ST_MakePoint(126.9900, 37.5710), 4326)::geography, '음식점', ARRAY['한식', '전통', '맛집'], '전통 한옥에서 즐기는 현대식 한식', 4.7, true, 30000, 'high'),
('place-013', '망원동 맛집', '서울 마포구 망원동', ST_SetSRID(ST_MakePoint(126.9050, 37.5560), 4326)::geography, '음식점', ARRAY['다양한', '저렴한', '로컬'], '다양한 음식을 저렴하게 즐길 수 있는 곳', 4.4, false, 15000, 'medium'),
('place-014', '이태원 맛집', '서울 용산구 이태원동', ST_SetSRID(ST_MakePoint(126.9942, 37.5347), 4326)::geography, '음식점', ARRAY['이국적', '다양한', '세계음식'], '세계 각국의 음식을 맛볼 수 있는 곳', 4.5, false, 35000, 'high'),
('place-015', 'N서울타워', '서울 용산구 남산공원길', ST_SetSRID(ST_MakePoint(126.9882, 37.5512), 4326)::geography, '전망대', ARRAY['야경', '데이트', '관광'], '서울의 야경을 한눈에 볼 수 있는 곳', 4.8, false, 15000, 'high')
ON CONFLICT (id) DO NOTHING;

-- 완료 메시지
DO $$
DECLARE
    place_count INT;
    badge_count INT;
BEGIN
    SELECT COUNT(*) INTO place_count FROM places;
    SELECT COUNT(*) INTO badge_count FROM badges;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE '📊 Total places: %', place_count;
    RAISE NOTICE '🏅 Total badges: %', badge_count;
    RAISE NOTICE '🎯 Ready for real data collection!';
    RAISE NOTICE '========================================';
END $$;
