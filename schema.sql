-- ============================================================
-- WH Core Logic Database Schema
-- PostgreSQL 14+ with PostGIS 3.2+
-- ============================================================

-- PostGIS 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 텍스트 검색 최적화
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- 공간 인덱싱 최적화

-- ============================================================
-- 1. 사용자 테이블
-- ============================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- 현재 선택된 역할
    current_role VARCHAR(20) NOT NULL CHECK (current_role IN ('explorer', 'healer', 'archivist', 'relation', 'achiever')),
    
    -- 레벨 시스템
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    total_xp INTEGER DEFAULT 0,
    xp_to_next_level INTEGER DEFAULT 100,
    
    -- 위치 정보 (마지막 활동 위치)
    last_location GEOGRAPHY(POINT, 4326),
    home_location GEOGRAPHY(POINT, 4326),  -- 홈 위치 (선택)
    
    -- 스트릭 (연속 일수)
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    
    -- 프로필
    profile_image_url TEXT,
    bio TEXT,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스
CREATE INDEX idx_users_location ON users USING GIST(last_location);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_role ON users(current_role);


-- ============================================================
-- 2. 장소(POI) 테이블
-- ============================================================

CREATE TABLE places (
    place_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name VARCHAR(255) NOT NULL,
    name_english VARCHAR(255),
    description TEXT,
    
    -- 위치 (PostGIS)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address VARCHAR(500),
    address_detail VARCHAR(200),
    
    -- 카테고리 (다중 카테고리 지원)
    primary_category VARCHAR(100) NOT NULL,
    secondary_categories TEXT[],  -- 배열 타입
    
    -- 비용 정보
    price_tier VARCHAR(20) CHECK (price_tier IN ('free', 'low', 'medium', 'high', 'premium')),
    average_price INTEGER,  -- 1인 평균 가격 (원)
    price_range_min INTEGER,
    price_range_max INTEGER,
    
    -- 분위기 태그 (벡터 임베딩용)
    vibe_tags TEXT[],  -- ['cozy', 'quiet', 'modern', 'vintage']
    vibe_vector VECTOR(384),  -- Sentence-BERT 임베딩 (향후 pgvector 사용)
    
    -- 평점 및 리뷰
    average_rating DECIMAL(3, 2),
    review_count INTEGER DEFAULT 0,
    
    -- 운영 정보
    opening_hours JSONB,  -- {"mon": "09:00-22:00", ...}
    is_24_hours BOOLEAN DEFAULT FALSE,
    
    -- 혼잡도 정보
    typical_crowd_level VARCHAR(20) CHECK (typical_crowd_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    peak_hours INTEGER[],  -- [12, 13, 18, 19]
    
    -- 접근성
    parking_available BOOLEAN DEFAULT FALSE,
    public_transit_nearby BOOLEAN DEFAULT TRUE,
    wheelchair_accessible BOOLEAN DEFAULT FALSE,
    
    -- 히든 스팟 여부 (탐험가용)
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    discovery_difficulty INTEGER CHECK (discovery_difficulty BETWEEN 1 AND 10),
    
    -- 소셜 정보
    instagram_handle VARCHAR(100),
    website_url TEXT,
    phone_number VARCHAR(20),
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE
);

-- 공간 인덱스 (필수!)
CREATE INDEX idx_places_location ON places USING GIST(location);

-- 일반 인덱스
CREATE INDEX idx_places_category ON places(primary_category);
CREATE INDEX idx_places_price_tier ON places(price_tier);
CREATE INDEX idx_places_rating ON places(average_rating DESC);
CREATE INDEX idx_places_hidden_gem ON places(is_hidden_gem) WHERE is_hidden_gem = TRUE;

-- GIN 인덱스 (배열 검색 최적화)
CREATE INDEX idx_places_secondary_categories ON places USING GIN(secondary_categories);
CREATE INDEX idx_places_vibe_tags ON places USING GIN(vibe_tags);


-- ============================================================
-- 3. 퀘스트(미션) 테이블
-- ============================================================

CREATE TABLE quests (
    quest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- 퀘스트 타입
    quest_type VARCHAR(20) CHECK (quest_type IN ('daily', 'weekly', 'special', 'hidden')),
    role_type VARCHAR(20) NOT NULL,
    
    -- 추천된 장소들
    recommended_places JSONB NOT NULL,  -- [{place_id, score, reason}, ...]
    selected_place_id UUID REFERENCES places(place_id),
    
    -- 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
    
    -- 보상
    xp_reward INTEGER DEFAULT 100,
    bonus_xp INTEGER DEFAULT 0,
    
    -- 완료 조건
    required_duration_minutes INTEGER,  -- 최소 체류 시간
    required_actions JSONB,  -- {"photo": true, "review": false}
    
    -- 타이밍
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_quests_user ON quests(user_id, created_at DESC);
CREATE INDEX idx_quests_status ON quests(status);


-- ============================================================
-- 4. 활동 기록 테이블
-- ============================================================

CREATE TABLE activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(quest_id) ON DELETE SET NULL,
    place_id UUID REFERENCES places(place_id) ON DELETE SET NULL,
    
    -- 활동 정보
    action_type VARCHAR(50) NOT NULL,  -- 'visit', 'checkin', 'photo', 'review'
    duration_minutes INTEGER,
    
    -- 위치 및 시간
    location GEOGRAPHY(POINT, 4326),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 컨텍스트 정보
    weather VARCHAR(20),  -- 'sunny', 'cloudy', 'rainy'
    temperature INTEGER,
    time_of_day VARCHAR(20),  -- 'dawn', 'morning', 'afternoon', 'evening', 'night'
    
    -- 사용자 기분
    mood_input VARCHAR(50),  -- '조금 지침', '활기찬', '우울한'
    mood_vector VECTOR(384),
    
    -- 메타데이터
    metadata JSONB  -- 추가 정보 저장용
);

CREATE INDEX idx_activity_user_time ON activity_logs(user_id, performed_at DESC);
CREATE INDEX idx_activity_place ON activity_logs(place_id);


-- ============================================================
-- 5. 서사(Narrative) 테이블
-- ============================================================

CREATE TABLE narratives (
    narrative_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(quest_id) ON DELETE SET NULL,
    place_id UUID REFERENCES places(place_id) ON DELETE SET NULL,
    
    -- 서사 내용
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    insight TEXT,  -- 1줄 통찰
    
    -- 생성 정보
    role_type VARCHAR(20) NOT NULL,
    user_level INTEGER NOT NULL,
    
    -- 입력 컨텍스트 (디버깅/개선용)
    generation_context JSONB,  -- LLM 프롬프트 입력값
    
    -- 품질 메트릭
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    is_saved BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_narratives_user ON narratives(user_id, created_at DESC);
CREATE INDEX idx_narratives_rating ON narratives(user_rating DESC) WHERE user_rating IS NOT NULL;


-- ============================================================
-- 6. 역할별 통계 테이블
-- ============================================================

CREATE TABLE role_statistics (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL,
    
    -- 누적 통계
    total_quests INTEGER DEFAULT 0,
    completed_quests INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    
    -- 다양성 메트릭
    unique_places_visited INTEGER DEFAULT 0,
    unique_categories_explored INTEGER DEFAULT 0,
    unique_neighborhoods_visited INTEGER DEFAULT 0,
    
    -- 시간 메트릭
    total_duration_minutes INTEGER DEFAULT 0,
    average_duration_minutes DECIMAL(10, 2),
    
    -- 최근 업데이트
    last_activity_date DATE,
    
    UNIQUE(user_id, role_type)
);

CREATE INDEX idx_role_stats_user ON role_statistics(user_id);


-- ============================================================
-- 7. 레벨 시스템 설정 테이블 (정적 데이터)
-- ============================================================

CREATE TABLE level_requirements (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 50),
    xp_required INTEGER NOT NULL,
    xp_cumulative INTEGER NOT NULL,
    
    -- 레벨별 혜택
    radius_multiplier DECIMAL(3, 2) DEFAULT 1.0,
    unlocked_features TEXT[],  -- ['hidden_quest', 'creator_mode']
    
    -- 보상
    bonus_reward JSONB
);

-- 레벨 데이터 삽입 (1~50레벨)
INSERT INTO level_requirements (level, xp_required, xp_cumulative, unlocked_features) VALUES
(1, 100, 100, ARRAY[]::TEXT[]),
(2, 150, 250, ARRAY[]::TEXT[]),
(3, 200, 450, ARRAY[]::TEXT[]),
(4, 250, 700, ARRAY[]::TEXT[]),
(5, 300, 1000, ARRAY[]::TEXT[]),
(6, 400, 1400, ARRAY['hidden_quest']),
(7, 500, 1900, ARRAY['hidden_quest']),
(8, 600, 2500, ARRAY['hidden_quest']),
(9, 700, 3200, ARRAY['hidden_quest']),
(10, 800, 4000, ARRAY['hidden_quest', 'invite_friend']),
(11, 1000, 5000, ARRAY['hidden_quest', 'invite_friend', 'creator_mode']),
(15, 1500, 10000, ARRAY['hidden_quest', 'invite_friend', 'creator_mode', 'premium_narrative']),
(20, 2000, 20000, ARRAY['hidden_quest', 'invite_friend', 'creator_mode', 'premium_narrative', 'custom_quest']),
(30, 3000, 50000, ARRAY['hidden_quest', 'invite_friend', 'creator_mode', 'premium_narrative', 'custom_quest', 'master_badge']),
(50, 5000, 150000, ARRAY['hidden_quest', 'invite_friend', 'creator_mode', 'premium_narrative', 'custom_quest', 'master_badge', 'legendary_status']);


-- ============================================================
-- 8. 함수: 거리 계산 (PostGIS 활용)
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lon1, lat1)::geography,
        ST_MakePoint(lon2, lat2)::geography
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- 9. 함수: 반경 내 장소 검색 (최적화된 쿼리)
-- ============================================================

CREATE OR REPLACE FUNCTION get_places_within_radius(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_meters INTEGER,
    p_role_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    place_id UUID,
    name VARCHAR,
    distance_meters DOUBLE PRECISION,
    primary_category VARCHAR,
    price_tier VARCHAR,
    average_rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.place_id,
        p.name,
        ST_Distance(
            p.location,
            ST_MakePoint(user_lon, user_lat)::geography
        ) AS distance_meters,
        p.primary_category,
        p.price_tier,
        p.average_rating
    FROM places p
    WHERE 
        ST_DWithin(
            p.location,
            ST_MakePoint(user_lon, user_lat)::geography,
            radius_meters
        )
        AND p.is_active = TRUE
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================
-- 10. 트리거: 자동 타임스탬프 업데이트
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 11. 뷰: 사용자 대시보드 통계
-- ============================================================

CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.user_id,
    u.username,
    u.current_role,
    u.level,
    u.total_xp,
    u.current_streak,
    u.longest_streak,
    
    -- 전체 활동 통계
    COUNT(DISTINCT al.place_id) AS total_unique_places,
    COUNT(DISTINCT q.quest_id) AS total_quests,
    SUM(CASE WHEN q.status = 'completed' THEN 1 ELSE 0 END) AS completed_quests,
    
    -- 최근 활동
    MAX(al.performed_at) AS last_activity_time
    
FROM users u
LEFT JOIN activity_logs al ON u.user_id = al.user_id
LEFT JOIN quests q ON u.user_id = q.user_id
GROUP BY u.user_id;


-- ============================================================
-- 샘플 데이터 삽입 (테스트용)
-- ============================================================

-- 샘플 장소 (서울 강남역 인근)
INSERT INTO places (name, location, address, primary_category, secondary_categories, price_tier, average_price, vibe_tags, average_rating, is_hidden_gem, typical_crowd_level) VALUES
('조용한 숲속 카페', ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326)::geography, '서울 강남구 테헤란로', '북카페', ARRAY['카페', '힐링'], 'low', 8000, ARRAY['cozy', 'quiet', 'nature'], 4.5, FALSE, 'low'),
('히든 골목 이탈리안', ST_SetSRID(ST_MakePoint(127.0301, 37.4985), 4326)::geography, '서울 강남구 논현동', '이색장소', ARRAY['맛집', '히든스팟'], 'medium', 25000, ARRAY['hidden', 'authentic', 'romantic'], 4.8, TRUE, 'medium'),
('올림픽 공원 러닝코스', ST_SetSRID(ST_MakePoint(127.1217, 37.5219), 4326)::geography, '서울 송파구 올림픽로', '러닝코스', ARRAY['운동', '공원'], 'free', 0, ARRAY['outdoor', 'spacious', 'energetic'], 4.7, FALSE, 'medium'),
('루프탑 뷰 갤러리', ST_SetSRID(ST_MakePoint(127.0289, 37.5007), 4326)::geography, '서울 강남구 선릉로', '갤러리', ARRAY['전시', '뷰맛집'], 'medium', 15000, ARRAY['artistic', 'modern', 'instagram'], 4.6, FALSE, 'low');
