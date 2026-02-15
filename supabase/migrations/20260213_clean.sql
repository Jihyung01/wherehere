-- WhereHere Extended Schema
-- AI Features Database Tables

-- Location tracking history
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,
    speed FLOAT,
    activity VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_location_history_user_time ON location_history(user_id, recorded_at DESC);
CREATE INDEX idx_location_history_location ON location_history USING GIST(location);

-- Completed quests
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

-- User personality profile
CREATE TABLE IF NOT EXISTS user_personality (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    openness FLOAT DEFAULT 0.5,
    conscientiousness FLOAT DEFAULT 0.5,
    extraversion FLOAT DEFAULT 0.5,
    agreeableness FLOAT DEFAULT 0.5,
    neuroticism FLOAT DEFAULT 0.5,
    companion_tone VARCHAR(20) DEFAULT 'friendly',
    companion_emoji_usage VARCHAR(20) DEFAULT 'medium',
    companion_formality VARCHAR(20) DEFAULT 'casual',
    preferred_categories JSONB DEFAULT '[]',
    avg_budget INT DEFAULT 15000,
    avg_duration_minutes INT DEFAULT 90,
    preferred_time_start TIME DEFAULT '14:00',
    preferred_time_end TIME DEFAULT '18:00',
    preferred_crowd_level VARCHAR(20) DEFAULT 'medium',
    total_visits INT DEFAULT 0,
    total_distance_km FLOAT DEFAULT 0,
    exploration_radius_km FLOAT DEFAULT 5,
    social_ratio FLOAT DEFAULT 0.5,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL,
    theme VARCHAR(100),
    places JSONB NOT NULL,
    rewards JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE INDEX idx_challenges_user ON challenges(user_id, status, deadline);

-- Gatherings
CREATE TABLE IF NOT EXISTS gatherings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    title VARCHAR(200),
    description TEXT,
    scheduled_time TIMESTAMP NOT NULL,
    max_participants INT DEFAULT 4,
    current_participants INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gatherings_place_time ON gatherings(place_id, scheduled_time);
CREATE INDEX idx_gatherings_status ON gatherings(status, scheduled_time);

-- Gathering participants
CREATE TABLE IF NOT EXISTS gathering_participants (
    gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    match_score FLOAT,
    status VARCHAR(20) DEFAULT 'joined',
    PRIMARY KEY (gathering_id, user_id)
);

-- Partner places
CREATE TABLE IF NOT EXISTS partner_places (
    place_id UUID REFERENCES places(id) ON DELETE CASCADE PRIMARY KEY,
    partner_tier VARCHAR(20) NOT NULL,
    boost_score INT DEFAULT 10,
    featured_until TIMESTAMP,
    contact_name VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    monthly_fee INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    rarity VARCHAR(20),
    unlock_condition JSONB
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Shares
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID,
    place_id UUID REFERENCES places(id),
    title VARCHAR(200),
    description TEXT,
    image_url TEXT,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_shares_share_id ON shares(share_id);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    context_type VARCHAR(50),
    context_id UUID,
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);

-- Function: Update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
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

-- Initial badges data
INSERT INTO badges (code, name, description, icon, rarity, unlock_condition) VALUES
('first_quest', 'First Step', 'Complete your first quest', 'target', 'common', '{"type": "quest_count", "value": 1}'),
('cafe_lover', 'Cafe Lover', 'Visit 10 cafes', 'coffee', 'rare', '{"type": "category_count", "category": "cafe", "value": 10}'),
('hidden_hunter', 'Hidden Hunter', 'Find 5 hidden gems', 'gem', 'epic', '{"type": "hidden_gem_count", "value": 5}'),
('social_butterfly', 'Social Butterfly', 'Join 10 gatherings', 'butterfly', 'rare', '{"type": "gathering_count", "value": 10}'),
('skyline_master', 'Skyline Master', 'Conquer 5 rooftops', 'city', 'epic', '{"type": "challenge_complete", "challenge_theme": "rooftop"}'),
('explorer_legend', 'Explorer Legend', 'Visit 100 places', 'trophy', 'legendary', '{"type": "quest_count", "value": 100}')
ON CONFLICT (code) DO NOTHING;
