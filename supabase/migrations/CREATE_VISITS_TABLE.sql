-- ============================================
-- 방문 기록 (Visits) 테이블 생성
-- ============================================

-- 기존 테이블이 있다면 삭제 (선택사항)
-- DROP TABLE IF EXISTS visits CASCADE;

CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 사용자 정보
    user_id TEXT NOT NULL,
    
    -- 장소 정보
    place_id TEXT NOT NULL,
    
    -- 방문 정보
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER DEFAULT 60,
    
    -- 평가 정보
    rating FLOAT,
    mood TEXT,
    spent_amount INTEGER,
    companions INTEGER DEFAULT 1,
    
    -- 게임화 요소
    xp_earned INTEGER DEFAULT 100,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits(place_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_visited ON visits(user_id, visited_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 자신의 방문 기록을 읽을 수 있음
CREATE POLICY "Users can view own visits" ON visits
    FOR SELECT
    USING (true);

-- 정책: 모든 사용자가 방문 기록을 생성할 수 있음
CREATE POLICY "Users can create visits" ON visits
    FOR INSERT
    WITH CHECK (true);

-- 샘플 데이터 삽입 (선택사항)
-- 실제 places 테이블의 place_id를 사용해야 합니다

-- 먼저 실제 place_id 몇 개를 가져옵니다
DO $$
DECLARE
    place_ids TEXT[];
    sample_user_id TEXT := 'user-demo-001';
BEGIN
    -- places 테이블에서 실제 place_id를 가져옵니다
    SELECT ARRAY(
        SELECT id FROM places 
        WHERE is_active = true 
        LIMIT 10
    ) INTO place_ids;
    
    -- place_id가 있으면 샘플 방문 기록 생성
    IF array_length(place_ids, 1) > 0 THEN
        -- 최근 7일간의 방문 기록
        INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, xp_earned)
        VALUES
            (sample_user_id, place_ids[1], NOW() - INTERVAL '1 day', 85, 4.8, '호기심', 8000, 150),
            (sample_user_id, place_ids[2], NOW() - INTERVAL '2 days', 60, 4.7, '행복', 7000, 120),
            (sample_user_id, place_ids[3], NOW() - INTERVAL '3 days', 45, 4.9, '평온', 0, 100),
            (sample_user_id, place_ids[4], NOW() - INTERVAL '4 days', 70, 4.6, '활기찬', 12000, 130),
            (sample_user_id, place_ids[5], NOW() - INTERVAL '5 days', 90, 4.6, '영감', 13000, 200),
            (sample_user_id, place_ids[6], NOW() - INTERVAL '6 days', 120, 4.7, '설렘', 35000, 180),
            (sample_user_id, place_ids[7], NOW() - INTERVAL '7 days', 65, 4.7, '평온', 9000, 140);
    END IF;
END $$;

-- 완료 메시지
SELECT 'Visits table created successfully!' as status;
