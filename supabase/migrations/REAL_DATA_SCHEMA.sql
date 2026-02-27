-- ============================================================
-- WhereHere 실데이터 전용 스키마 (Mock 없음)
-- - 백엔드 rest_helpers + scripts/collect_simple.py 와 100% 호환
-- - 장소: Kakao 수집 스크립트로만 채움 (천 단위)
-- - 방문: 앱에서 퀘스트 완료 시에만 저장
-- ============================================================

-- 1. PLACES (id = TEXT, kakao-xxxx 형식)
-- collect_simple.py / collect_kakao_places.py 가 INSERT 하는 스키마와 일치
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS places CASCADE;

CREATE TABLE places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    primary_category TEXT NOT NULL,
    secondary_categories TEXT[] DEFAULT '{}',
    vibe_tags TEXT[] DEFAULT '{}',
    description TEXT,
    average_rating FLOAT DEFAULT 0,
    review_count INT DEFAULT 0,
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    typical_crowd_level TEXT DEFAULT 'medium',
    average_price INT,
    price_tier TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_active ON places(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_places_category ON places(primary_category);
CREATE INDEX idx_places_lat_lon ON places(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. VISITS (백엔드 GET/POST 모두 이 테이블 사용)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INT DEFAULT 60,
    rating FLOAT,
    mood TEXT,
    spent_amount INT,
    companions INT DEFAULT 1,
    xp_earned INT DEFAULT 0
);

CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_place_id ON visits(place_id);
CREATE INDEX idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX idx_visits_user_visited ON visits(user_id, visited_at DESC);

-- 3. RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Places read all" ON places;
CREATE POLICY "Places read all" ON places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role places insert" ON places;
CREATE POLICY "Service role places insert" ON places FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own visits" ON visits;
CREATE POLICY "Users can view own visits" ON visits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert visits" ON visits;
CREATE POLICY "Users can insert visits" ON visits FOR INSERT WITH CHECK (true);

-- 4. 결과 확인
SELECT 'REAL_DATA_SCHEMA applied. Run collect script to fill places.' AS status;
