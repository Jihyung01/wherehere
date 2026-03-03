-- 알림 (in-app + 푸시 연동용)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    read BOOLEAN DEFAULT FALSE,
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications select own" ON notifications;
CREATE POLICY "Notifications select own" ON notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Notifications insert" ON notifications;
CREATE POLICY "Notifications insert" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Notifications update own" ON notifications;
CREATE POLICY "Notifications update own" ON notifications FOR UPDATE USING (true);

-- 소셜: 팔로우
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows all" ON follows FOR ALL USING (true) WITH CHECK (true);

-- 소셜: 피드 활동 (체크인/포스트)
CREATE TABLE IF NOT EXISTS feed_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    place_id TEXT,
    place_name TEXT,
    xp_earned INT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_activities_user_id ON feed_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_activities_created_at ON feed_activities(created_at DESC);
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed activities all" ON feed_activities FOR ALL USING (true) WITH CHECK (true);

-- 크리에이터: 장소 제안 (UGC)
CREATE TABLE IF NOT EXISTS place_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_place_suggestions_status ON place_suggestions(status);
ALTER TABLE place_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Place suggestions all" ON place_suggestions FOR ALL USING (true) WITH CHECK (true);
