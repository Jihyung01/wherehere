-- ============================================================
-- WhereHere Initial Schema Migration
-- Created: 2026-02-10
-- Description: User management, Places, Quests, Activities
-- ============================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Users Table (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.users (
    -- Primary Key (linked to auth.users.id)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    profile_image_url TEXT,
    
    -- Role System
    current_role VARCHAR(20) NOT NULL DEFAULT 'explorer' 
        CHECK (current_role IN ('explorer', 'healer', 'archivist', 'relation', 'achiever')),
    
    -- Level & XP
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
    xp_to_next_level INTEGER DEFAULT 100,
    
    -- Location (PostGIS)
    last_location GEOGRAPHY(POINT, 4326),
    home_location GEOGRAPHY(POINT, 4326),
    
    -- Streak System
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    last_active_date DATE,
    
    -- Onboarding
    is_onboarded BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_role ON public.users(current_role);
CREATE INDEX idx_users_level ON public.users(level DESC);
CREATE INDEX idx_users_location ON public.users USING GIST(last_location);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Auto-create user profile on signup (Trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, display_name, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Explorer'),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Places (POI) Table
-- ============================================================

CREATE TABLE public.places (
    place_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    name_english VARCHAR(255),
    description TEXT,
    
    -- Location (PostGIS)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address VARCHAR(500),
    address_detail VARCHAR(200),
    
    -- Category
    primary_category VARCHAR(100) NOT NULL,
    secondary_categories TEXT[],
    
    -- Pricing
    price_tier VARCHAR(20) CHECK (price_tier IN ('free', 'low', 'medium', 'high', 'premium')),
    average_price INTEGER CHECK (average_price >= 0),
    
    -- Vibe & Atmosphere
    vibe_tags TEXT[],
    
    -- Ratings
    average_rating DECIMAL(3, 2) CHECK (average_rating >= 0 AND average_rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    
    -- Crowd Level
    typical_crowd_level VARCHAR(20) CHECK (typical_crowd_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    
    -- Special Attributes
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    discovery_difficulty INTEGER CHECK (discovery_difficulty BETWEEN 1 AND 10),
    
    -- Operating Hours
    opening_hours JSONB,
    is_24_hours BOOLEAN DEFAULT FALSE,
    
    -- Accessibility
    parking_available BOOLEAN DEFAULT FALSE,
    wheelchair_accessible BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE
);

-- Spatial Index (CRITICAL for performance!)
CREATE INDEX idx_places_location ON public.places USING GIST(location);

-- Other Indexes
CREATE INDEX idx_places_category ON public.places(primary_category);
CREATE INDEX idx_places_price_tier ON public.places(price_tier);
CREATE INDEX idx_places_rating ON public.places(average_rating DESC);
CREATE INDEX idx_places_hidden_gem ON public.places(is_hidden_gem) WHERE is_hidden_gem = TRUE;
CREATE INDEX idx_places_vibe_tags ON public.places USING GIN(vibe_tags);

CREATE TRIGGER update_places_updated_at 
    BEFORE UPDATE ON public.places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Quests Table
-- ============================================================

CREATE TABLE public.quests (
    quest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Quest Info
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special', 'hidden')),
    role_type VARCHAR(20) NOT NULL,
    
    -- Recommendations
    recommended_places JSONB NOT NULL,
    selected_place_id UUID REFERENCES public.places(place_id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
    
    -- Rewards
    xp_reward INTEGER DEFAULT 100 CHECK (xp_reward >= 0),
    bonus_xp INTEGER DEFAULT 0 CHECK (bonus_xp >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_quests_user ON public.quests(user_id, created_at DESC);
CREATE INDEX idx_quests_status ON public.quests(status);
CREATE INDEX idx_quests_type ON public.quests(quest_type);

-- ============================================================
-- 5. Activity Logs Table
-- ============================================================

CREATE TABLE public.activity_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(quest_id) ON DELETE SET NULL,
    place_id UUID REFERENCES public.places(place_id) ON DELETE SET NULL,
    
    -- Activity
    action_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER CHECK (duration_minutes >= 0),
    
    -- Location & Time
    location GEOGRAPHY(POINT, 4326),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    weather VARCHAR(20),
    time_of_day VARCHAR(20),
    mood_input VARCHAR(100),
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_activity_user_time ON public.activity_logs(user_id, performed_at DESC);
CREATE INDEX idx_activity_place ON public.activity_logs(place_id);
CREATE INDEX idx_activity_quest ON public.activity_logs(quest_id);

-- ============================================================
-- 6. Narratives Table (AI-generated stories)
-- ============================================================

CREATE TABLE public.narratives (
    narrative_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(quest_id) ON DELETE SET NULL,
    place_id UUID REFERENCES public.places(place_id) ON DELETE SET NULL,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    insight TEXT,
    
    -- Generation Context
    role_type VARCHAR(20) NOT NULL,
    user_level INTEGER NOT NULL,
    generation_context JSONB,
    
    -- User Interaction
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    is_saved BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_narratives_user ON public.narratives(user_id, created_at DESC);
CREATE INDEX idx_narratives_saved ON public.narratives(is_saved) WHERE is_saved = TRUE;

-- ============================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;

-- Users: Can read own data
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users: Can update own data
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Quests: Users can view their own quests
CREATE POLICY "Users can view own quests"
    ON public.quests FOR SELECT
    USING (auth.uid() = user_id);

-- Quests: Users can insert their own quests
CREATE POLICY "Users can create own quests"
    ON public.quests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Activity Logs: Users can view their own logs
CREATE POLICY "Users can view own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Activity Logs: Users can insert their own logs
CREATE POLICY "Users can create own activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Narratives: Users can view their own narratives
CREATE POLICY "Users can view own narratives"
    ON public.narratives FOR SELECT
    USING (auth.uid() = user_id);

-- Places: Public read access (everyone can see places)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Places are viewable by everyone"
    ON public.places FOR SELECT
    USING (true);

-- ============================================================
-- 8. Helper Functions
-- ============================================================

-- Get places within radius
CREATE OR REPLACE FUNCTION get_places_within_radius(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_meters INTEGER,
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
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) AS distance_meters,
        p.primary_category,
        p.price_tier,
        p.average_rating
    FROM public.places p
    WHERE 
        ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            radius_meters
        )
        AND p.is_active = TRUE
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate user's next level XP requirement
CREATE OR REPLACE FUNCTION calculate_next_level_xp(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN current_level < 5 THEN 100 * current_level
        WHEN current_level < 10 THEN 200 * current_level
        WHEN current_level < 20 THEN 300 * current_level
        WHEN current_level < 30 THEN 500 * current_level
        ELSE 1000 * current_level
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
