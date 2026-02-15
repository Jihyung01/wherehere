-- ============================================================
-- WhereHere Extended Schema
-- AI 기능 확장을 위한 테이블 추가
-- ============================================================

-- 위치 추적 기록
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,
    speed FLOAT,
    activity VARCHAR(20),  -- 'walking', 'still', 'in_vehicle', 'unknown'
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_location_history_user_time ON location_history(user_id, recorded_at DESC);
CREATE INDEX idx_location_history_location ON location_history USING GIST(location);

-- 완료한 퀘스트
CREATE TABLE IF NOT EXISTS completed_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID,
    place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    role_type VARCHAR(20) NOT NULL,
    completed_at TIMESTAMP DEFAULT NOW(),
    duration_minutes INT,
    missions_completed JSONB DEFAULT '[]',
    xp_earned INT DEFAULT 0,
    user_rating FLOAT,
    user_comment TEXT,
    photos JSONB DEFAULT '[]'
);

CREATE INDEX idx_completed_quests_user ON completed_quests(user_id, completed_at DESC);
CREATE INDEX idx_completed_quests_place ON completed_quests(place_id);

-- 사용자 성격 프로필
CREATE TABLE IF NOT EXISTS user_personality (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Big Five 성격 모델
    openness FLOAT DEFAULT 0.5,
    conscientiousness FLOAT DEFAULT 0.5,
    extraversion FLOAT DEFAULT 0.5,
    agreeableness FLOAT DEFAULT 0.5,
    neuroticism FLOAT DEFAULT 0.5,
    
    -- AI 동행자 스타일
    companion_tone VARCHAR(20) DEFAULT 'friendly',  -- 'friendly', 'formal', 'energetic', 'calm'
    companion_emoji_usage VARCHAR(20) DEFAULT 'medium',  -- 'high', 'medium', 'low'
    companion_formality VARCHAR(20) DEFAULT 'casual',  -- 'casual', 'polite'
    
    -- 선호도
    preferred_categories JSONB DEFAULT '[]',
    avg_budget INT DEFAULT 15000,
    avg_duration_minutes INT DEFAULT 90,
    preferred_time_start TIME DEFAULT '14:00',
    preferred_time_end TIME DEFAULT '18:00',
    preferred_crowd_level VARCHAR(20) DEFAULT 'medium',
    
    -- 행동 패턴
    total_visits INT DEFAULT 0,
    total_distance_km FLOAT DEFAULT 0,
    exploration_radius_km FLOAT DEFAULT 5,
    social_ratio FLOAT DEFAULT 0.5,  -- 혼자 vs 함께 비율
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 챌린지
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL,  -- 'easy', 'medium', 'hard'
    theme VARCHAR(100),
    
    places JSONB NOT NULL,  -- [{"place_id": "...", "order": 1, "completed": false}]
    
    rewards JSONB NOT NULL,  -- {"xp": 1000, "badge": "...", "unlock": "..."}
    
    created_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'  -- 'active', 'completed', 'failed', 'abandoned'
);

CREATE INDEX idx_challenges_user ON challenges(user_id, status, deadline);

-- 모임 (Gathering)
CREATE TABLE IF NOT EXISTS gatherings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    
    title VARCHAR(200),
    description TEXT,
    scheduled_time TIMESTAMP NOT NULL,
    
    max_participants INT DEFAULT 4,
    current_participants INT DEFAULT 1,
    
    status VARCHAR(20) DEFAULT 'open',  -- 'open', 'full', 'completed', 'cancelled'
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gatherings_place_time ON gatherings(place_id, scheduled_time);
CREATE INDEX idx_gatherings_status ON gatherings(status, scheduled_time);

-- 모임 참여자
CREATE TABLE IF NOT EXISTS gathering_participants (
    gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    match_score FLOAT,  -- AI 매칭 점수
    status VARCHAR(20) DEFAULT 'joined',  -- 'joined', 'left', 'banned'
    
    PRIMARY KEY (gathering_id, user_id)
);

-- 제휴 업체
CREATE TABLE IF NOT EXISTS partner_places (
    place_id UUID REFERENCES places(id) ON DELETE CASCADE PRIMARY KEY,
    
    partner_tier VARCHAR(20) NOT NULL,  -- 'premium', 'standard', 'basic'
    boost_score INT DEFAULT 10,
    
    featured_until TIMESTAMP,
    
    contact_name VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    monthly_fee INT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 뱃지
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    rarity VARCHAR(20),  -- 'common', 'rare', 'epic', 'legendary'
    unlock_condition JSONB  -- {"type": "visit_count", "value": 10, "category": "카페"}
);

-- 사용자 뱃지
CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- 소셜 공유
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id VARCHAR(20) UNIQUE NOT NULL,  -- 짧은 ID (예: "a3Xk9")
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID,
    place_id UUID REFERENCES places(id),
    
    title VARCHAR(200),
    description TEXT,
    image_url TEXT,
    
    view_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP  -- 30일 후 만료
);

CREATE INDEX idx_shares_share_id ON shares(share_id);

-- AI 대화 기록 (개인화용)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    context_type VARCHAR(50),  -- 'arrival_guide', 'recommendation', 'challenge', etc.
    context_id UUID,  -- quest_id, challenge_id, etc.
    
    user_message TEXT,
    ai_response TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);

-- 함수: 사용자 통계 업데이트
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 완료한 퀘스트 수 업데이트
    UPDATE user_personality
    SET 
        total_visits = (
            SELECT COUNT(*) FROM completed_quests WHERE user_id = NEW.user_id
        ),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats
AFTER INSERT ON completed_quests
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- 초기 뱃지 데이터
INSERT INTO badges (code, name, description, icon, rarity, unlock_condition) VALUES
('first_quest', '첫 걸음', '첫 퀘스트 완료', '🎯', 'common', '{"type": "quest_count", "value": 1}'),
('cafe_lover', '카페 러버', '카페 10곳 방문', '☕', 'rare', '{"type": "category_count", "category": "카페", "value": 10}'),
('hidden_hunter', '히든 헌터', '히든 보석 5곳 발견', '💎', 'epic', '{"type": "hidden_gem_count", "value": 5}'),
('social_butterfly', '소셜 버터플라이', '모임 10회 참여', '🦋', 'rare', '{"type": "gathering_count", "value": 10}'),
('skyline_master', '스카이라인 마스터', '루프탑 5곳 정복', '🌆', 'epic', '{"type": "challenge_complete", "challenge_theme": "rooftop"}'),
('explorer_legend', '전설의 탐험가', '100곳 방문', '🏆', 'legendary', '{"type": "quest_count", "value": 100}');

COMMENT ON TABLE location_history IS '사용자 위치 추적 기록 (패턴 분석용)';
COMMENT ON TABLE completed_quests IS '완료한 퀘스트 기록';
COMMENT ON TABLE user_personality IS 'AI 학습 기반 사용자 성격 프로필';
COMMENT ON TABLE challenges IS 'AI 생성 주간/월간 챌린지';
COMMENT ON TABLE gatherings IS '사용자 모임';
COMMENT ON TABLE partner_places IS '제휴 업체 (노출 부스팅)';
COMMENT ON TABLE badges IS '뱃지 시스템';
COMMENT ON TABLE shares IS '소셜 공유 링크';
COMMENT ON TABLE ai_conversations IS 'AI 대화 기록 (개인화 학습용)';
