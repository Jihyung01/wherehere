-- ============================================
-- 방문 기록 (Visits) 테이블 업데이트
-- 기존 테이블이 있으면 업데이트만 수행
-- ============================================

-- 1. 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER DEFAULT 60,
    rating FLOAT,
    mood TEXT,
    spent_amount INTEGER,
    companions INTEGER DEFAULT 1,
    xp_earned INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits(place_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_visited ON visits(user_id, visited_at DESC);

-- 3. RLS 활성화 (이미 활성화되어 있어도 에러 없음)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- 4. 정책 삭제 후 재생성 (기존 정책이 있으면 삭제)
DROP POLICY IF EXISTS "Users can view own visits" ON visits;
DROP POLICY IF EXISTS "Users can create visits" ON visits;

-- 5. 정책 재생성
CREATE POLICY "Users can view own visits" ON visits
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create visits" ON visits
    FOR INSERT
    WITH CHECK (true);

-- 6. 샘플 데이터 확인 및 삽입
DO $$
DECLARE
    place_ids TEXT[];
    sample_user_id TEXT := 'user-demo-001';
    existing_count INTEGER;
BEGIN
    -- 기존 샘플 데이터 확인
    SELECT COUNT(*) INTO existing_count
    FROM visits
    WHERE user_id = sample_user_id;
    
    -- 샘플 데이터가 없으면 생성
    IF existing_count = 0 THEN
        -- places 테이블에서 실제 place_id를 가져옵니다
        SELECT ARRAY(
            SELECT id FROM places 
            WHERE is_active = true 
            LIMIT 10
        ) INTO place_ids;
        
        -- place_id가 있으면 샘플 방문 기록 생성
        IF array_length(place_ids, 1) > 0 THEN
            INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, xp_earned)
            VALUES
                (sample_user_id, place_ids[1], NOW() - INTERVAL '1 day', 85, 4.8, '호기심', 8000, 150),
                (sample_user_id, place_ids[2], NOW() - INTERVAL '2 days', 60, 4.7, '행복', 7000, 120),
                (sample_user_id, place_ids[3], NOW() - INTERVAL '3 days', 45, 4.9, '평온', 0, 100),
                (sample_user_id, place_ids[4], NOW() - INTERVAL '4 days', 70, 4.6, '활기찬', 12000, 130),
                (sample_user_id, place_ids[5], NOW() - INTERVAL '5 days', 90, 4.6, '영감', 13000, 200),
                (sample_user_id, place_ids[6], NOW() - INTERVAL '6 days', 120, 4.7, '설렘', 35000, 180),
                (sample_user_id, place_ids[7], NOW() - INTERVAL '7 days', 65, 4.7, '평온', 9000, 140)
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE '샘플 데이터 7개 추가 완료';
        ELSE
            RAISE NOTICE 'places 테이블에 데이터가 없어 샘플 데이터를 생성하지 않았습니다.';
        END IF;
    ELSE
        RAISE NOTICE '기존 샘플 데이터 % 개 발견, 추가 생성하지 않음', existing_count;
    END IF;
END $$;

-- 7. 결과 확인
SELECT 
    'Visits table updated successfully!' as status,
    COUNT(*) as total_visits,
    COUNT(DISTINCT user_id) as unique_users
FROM visits;
