-- 로컬 소셜: 동네 게시글 + 댓글
-- type: story(동네 이야기) | review(리뷰) | gathering(모임)

CREATE TABLE IF NOT EXISTS local_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('story', 'review', 'gathering')),
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    meet_time TEXT,
    image_url TEXT,
    place_name TEXT,
    place_address TEXT,
    area_name TEXT NOT NULL DEFAULT '',
    author_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_posts_area_created ON local_posts(area_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_posts_author ON local_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_local_posts_created ON local_posts(created_at DESC);

ALTER TABLE local_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Local posts all" ON local_posts;
CREATE POLICY "Local posts all" ON local_posts FOR ALL USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS local_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES local_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_comments_post_created ON local_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_local_comments_post_id ON local_comments(post_id);

ALTER TABLE local_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Local comments all" ON local_comments;
CREATE POLICY "Local comments all" ON local_comments FOR ALL USING (true) WITH CHECK (true);
