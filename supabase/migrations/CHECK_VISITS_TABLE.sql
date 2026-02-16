-- ============================================
-- Visits 테이블 상태 확인
-- ============================================

-- 1. 테이블 존재 여부 확인
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'visits'
    ) as table_exists;

-- 2. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'visits'
ORDER BY ordinal_position;

-- 3. 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'visits';

-- 4. 정책 확인
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'visits';

-- 5. 데이터 확인
SELECT 
    COUNT(*) as total_visits,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(visited_at) as earliest_visit,
    MAX(visited_at) as latest_visit
FROM visits;

-- 6. 샘플 데이터 확인
SELECT 
    id,
    user_id,
    place_id,
    visited_at,
    duration_minutes,
    xp_earned,
    mood
FROM visits
ORDER BY visited_at DESC
LIMIT 5;
