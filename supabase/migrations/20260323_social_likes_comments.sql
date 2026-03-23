-- ============================================================
-- 소셜 기능 확장: 좋아요 & 댓글 시스템
-- - local_posts에 대한 좋아요/댓글
-- - 실시간 알림 연동
-- ============================================================

-- 1. 좋아요 테이블
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at DESC);

-- 2. 댓글 테이블
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);

-- 3. RLS 정책
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- 좋아요: 모두 읽기 가능, 본인만 추가/삭제
DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add likes" ON post_likes;
CREATE POLICY "Users can add likes" ON post_likes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove own likes" ON post_likes;
CREATE POLICY "Users can remove own likes" ON post_likes FOR DELETE USING (true);

-- 댓글: 모두 읽기 가능, 본인만 추가/수정/삭제
DROP POLICY IF EXISTS "Anyone can view comments" ON post_comments;
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add comments" ON post_comments;
CREATE POLICY "Users can add comments" ON post_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
CREATE POLICY "Users can update own comments" ON post_comments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (true);

-- 4. 카카오 친구 매칭용 테이블 (카카오 ID 저장 - 매칭 전용)
CREATE TABLE IF NOT EXISTS kakao_user_mapping (
    user_id TEXT PRIMARY KEY,
    kakao_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kakao_mapping_kakao_id ON kakao_user_mapping(kakao_id);

ALTER TABLE kakao_user_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view kakao mapping" ON kakao_user_mapping;
CREATE POLICY "Users can view kakao mapping" ON kakao_user_mapping FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own mapping" ON kakao_user_mapping;
CREATE POLICY "Users can insert own mapping" ON kakao_user_mapping FOR INSERT WITH CHECK (true);

-- 5. 협동 퀘스트 테이블
CREATE TABLE IF NOT EXISTS group_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    place_address TEXT,
    max_participants INT DEFAULT 4,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_group_quests_creator ON group_quests(creator_id);
CREATE INDEX idx_group_quests_place ON group_quests(place_id);
CREATE INDEX idx_group_quests_status ON group_quests(status);
CREATE INDEX idx_group_quests_expires ON group_quests(expires_at);

-- 6. 협동 퀘스트 참여자 테이블
CREATE TABLE IF NOT EXISTS group_quest_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_quest_id UUID NOT NULL REFERENCES group_quests(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    UNIQUE(group_quest_id, user_id)
);

CREATE INDEX idx_group_quest_participants_quest ON group_quest_participants(group_quest_id);
CREATE INDEX idx_group_quest_participants_user ON group_quest_participants(user_id);

-- 7. RLS for group quests
ALTER TABLE group_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quest_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active group quests" ON group_quests;
CREATE POLICY "Anyone can view active group quests" ON group_quests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create group quests" ON group_quests;
CREATE POLICY "Users can create group quests" ON group_quests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can update own quests" ON group_quests;
CREATE POLICY "Creators can update own quests" ON group_quests FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can view participants" ON group_quest_participants;
CREATE POLICY "Anyone can view participants" ON group_quest_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join quests" ON group_quest_participants;
CREATE POLICY "Users can join quests" ON group_quest_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own participation" ON group_quest_participants;
CREATE POLICY "Users can update own participation" ON group_quest_participants FOR UPDATE USING (true);

SELECT 'Social features (likes, comments, kakao mapping, group quests) schema created.' AS status;
