-- ============================================================
-- WhereHere Seed Data
-- Sample data for testing and development
-- ============================================================

-- ============================================================
-- 1. Sample Places (서울 주요 지역)
-- ============================================================

INSERT INTO public.places (
    name, 
    name_english,
    location, 
    address, 
    primary_category, 
    secondary_categories,
    price_tier, 
    average_price, 
    vibe_tags, 
    average_rating,
    is_hidden_gem,
    discovery_difficulty,
    typical_crowd_level,
    opening_hours,
    is_active
) VALUES
-- 강남 지역
(
    '조용한 숲속 북카페',
    'Quiet Forest Book Cafe',
    ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326)::geography,
    '서울 강남구 테헤란로 123',
    '북카페',
    ARRAY['카페', '힐링', '독서'],
    'low',
    8000,
    ARRAY['cozy', 'quiet', 'nature', 'peaceful'],
    4.5,
    FALSE,
    3,
    'low',
    '{"mon": "09:00-22:00", "tue": "09:00-22:00", "wed": "09:00-22:00", "thu": "09:00-22:00", "fri": "09:00-23:00", "sat": "10:00-23:00", "sun": "10:00-22:00"}'::jsonb,
    TRUE
),
(
    '히든 골목 이탈리안',
    'Hidden Alley Italian',
    ST_SetSRID(ST_MakePoint(127.0301, 37.4985), 4326)::geography,
    '서울 강남구 논현동 45-12',
    '이색장소',
    ARRAY['맛집', '히든스팟', '데이트'],
    'medium',
    25000,
    ARRAY['hidden', 'authentic', 'romantic', 'intimate'],
    4.8,
    TRUE,
    7,
    'medium',
    '{"mon": "closed", "tue": "17:00-23:00", "wed": "17:00-23:00", "thu": "17:00-23:00", "fri": "17:00-00:00", "sat": "17:00-00:00", "sun": "17:00-23:00"}'::jsonb,
    TRUE
),
(
    '루프탑 뷰 갤러리',
    'Rooftop View Gallery',
    ST_SetSRID(ST_MakePoint(127.0289, 37.5007), 4326)::geography,
    '서울 강남구 선릉로 88길 15',
    '갤러리',
    ARRAY['전시', '뷰맛집', '사진'],
    'medium',
    15000,
    ARRAY['artistic', 'modern', 'instagram', 'scenic'],
    4.6,
    FALSE,
    5,
    'low',
    '{"mon": "closed", "tue": "11:00-20:00", "wed": "11:00-20:00", "thu": "11:00-20:00", "fri": "11:00-21:00", "sat": "10:00-21:00", "sun": "10:00-20:00"}'::jsonb,
    TRUE
),

-- 홍대 지역
(
    '빈티지 레코드 카페',
    'Vintage Record Cafe',
    ST_SetSRID(ST_MakePoint(126.9240, 37.5563), 4326)::geography,
    '서울 마포구 홍익로 72',
    '카페',
    ARRAY['음악', '빈티지', '감성'],
    'low',
    7000,
    ARRAY['vintage', 'music', 'retro', 'cozy'],
    4.7,
    TRUE,
    6,
    'medium',
    '{"mon": "12:00-23:00", "tue": "12:00-23:00", "wed": "12:00-23:00", "thu": "12:00-23:00", "fri": "12:00-01:00", "sat": "12:00-01:00", "sun": "12:00-23:00"}'::jsonb,
    TRUE
),
(
    '아트 스트리트 벽화골목',
    'Art Street Mural Alley',
    ST_SetSRID(ST_MakePoint(126.9198, 37.5547), 4326)::geography,
    '서울 마포구 와우산로 29길',
    '이색장소',
    ARRAY['예술', '사진', '산책'],
    'free',
    0,
    ARRAY['artistic', 'colorful', 'instagram', 'outdoor'],
    4.4,
    FALSE,
    4,
    'high',
    '{"mon": "00:00-23:59", "tue": "00:00-23:59", "wed": "00:00-23:59", "thu": "00:00-23:59", "fri": "00:00-23:59", "sat": "00:00-23:59", "sun": "00:00-23:59"}'::jsonb,
    TRUE
),

-- 이태원/한남 지역
(
    '한남동 숨은 정원',
    'Hannam Hidden Garden',
    ST_SetSRID(ST_MakePoint(127.0023, 37.5347), 4326)::geography,
    '서울 용산구 한남대로 98',
    '공원',
    ARRAY['힐링', '자연', '산책'],
    'free',
    0,
    ARRAY['peaceful', 'nature', 'hidden', 'serene'],
    4.9,
    TRUE,
    8,
    'very_low',
    '{"mon": "06:00-20:00", "tue": "06:00-20:00", "wed": "06:00-20:00", "thu": "06:00-20:00", "fri": "06:00-20:00", "sat": "06:00-20:00", "sun": "06:00-20:00"}'::jsonb,
    TRUE
),
(
    '글로벌 퓨전 다이닝',
    'Global Fusion Dining',
    ST_SetSRID(ST_MakePoint(127.0034, 37.5342), 4326)::geography,
    '서울 용산구 이태원로 234',
    '맛집',
    ARRAY['다이닝', '모임', '데이트'],
    'high',
    45000,
    ARRAY['sophisticated', 'international', 'social', 'trendy'],
    4.7,
    FALSE,
    5,
    'high',
    '{"mon": "11:30-22:00", "tue": "11:30-22:00", "wed": "11:30-22:00", "thu": "11:30-22:00", "fri": "11:30-23:00", "sat": "11:30-23:00", "sun": "11:30-22:00"}'::jsonb,
    TRUE
),

-- 성수동 지역
(
    '성수 공장 카페',
    'Seongsu Factory Cafe',
    ST_SetSRID(ST_MakePoint(127.0557, 37.5445), 4326)::geography,
    '서울 성동구 연무장길 74',
    '카페',
    ARRAY['인더스트리얼', '브런치', '작업'],
    'medium',
    12000,
    ARRAY['industrial', 'spacious', 'modern', 'productive'],
    4.6,
    FALSE,
    4,
    'high',
    '{"mon": "09:00-22:00", "tue": "09:00-22:00", "wed": "09:00-22:00", "thu": "09:00-22:00", "fri": "09:00-23:00", "sat": "10:00-23:00", "sun": "10:00-22:00"}'::jsonb,
    TRUE
),
(
    '수제화 공방 갤러리',
    'Handmade Shoes Gallery',
    ST_SetSRID(ST_MakePoint(127.0543, 37.5438), 4326)::geography,
    '서울 성동구 아차산로 12길',
    '이색장소',
    ARRAY['공방', '체험', '쇼핑'],
    'medium',
    20000,
    ARRAY['unique', 'craftsmanship', 'authentic', 'local'],
    4.5,
    TRUE,
    7,
    'low',
    '{"mon": "closed", "tue": "11:00-19:00", "wed": "11:00-19:00", "thu": "11:00-19:00", "fri": "11:00-19:00", "sat": "11:00-20:00", "sun": "11:00-19:00"}'::jsonb,
    TRUE
),

-- 여의도 지역
(
    '한강 러닝 코스',
    'Han River Running Course',
    ST_SetSRID(ST_MakePoint(126.9329, 37.5285), 4326)::geography,
    '서울 영등포구 여의동로 330',
    '러닝코스',
    ARRAY['운동', '공원', '자전거'],
    'free',
    0,
    ARRAY['outdoor', 'energetic', 'spacious', 'scenic'],
    4.8,
    FALSE,
    2,
    'medium',
    '{"mon": "00:00-23:59", "tue": "00:00-23:59", "wed": "00:00-23:59", "thu": "00:00-23:59", "fri": "00:00-23:59", "sat": "00:00-23:59", "sun": "00:00-23:59"}'::jsonb,
    TRUE
),

-- 북촌/삼청동 지역
(
    '한옥 티하우스',
    'Hanok Tea House',
    ST_SetSRID(ST_MakePoint(126.9849, 37.5826), 4326)::geography,
    '서울 종로구 북촌로 11길 22',
    '북카페',
    ARRAY['전통', '차', '힐링'],
    'low',
    9000,
    ARRAY['traditional', 'peaceful', 'cultural', 'zen'],
    4.7,
    TRUE,
    6,
    'low',
    '{"mon": "10:00-20:00", "tue": "10:00-20:00", "wed": "10:00-20:00", "thu": "10:00-20:00", "fri": "10:00-21:00", "sat": "10:00-21:00", "sun": "10:00-20:00"}'::jsonb,
    TRUE
),
(
    '삼청동 갤러리 카페',
    'Samcheong Gallery Cafe',
    ST_SetSRID(ST_MakePoint(126.9823, 37.5858), 4326)::geography,
    '서울 종로구 삼청로 45',
    '갤러리',
    ARRAY['전시', '카페', '예술'],
    'medium',
    13000,
    ARRAY['artistic', 'elegant', 'cultural', 'sophisticated'],
    4.6,
    FALSE,
    5,
    'medium',
    '{"mon": "closed", "tue": "11:00-21:00", "wed": "11:00-21:00", "thu": "11:00-21:00", "fri": "11:00-22:00", "sat": "10:00-22:00", "sun": "10:00-21:00"}'::jsonb,
    TRUE
),

-- 연남동 지역
(
    '연남동 책방 카페',
    'Yeonnam Book Cafe',
    ST_SetSRID(ST_MakePoint(126.9254, 37.5656), 4326)::geography,
    '서울 마포구 동교로 198',
    '북카페',
    ARRAY['독서', '조용한', '힐링'],
    'low',
    7500,
    ARRAY['cozy', 'quiet', 'literary', 'intimate'],
    4.8,
    TRUE,
    6,
    'low',
    '{"mon": "11:00-22:00", "tue": "11:00-22:00", "wed": "11:00-22:00", "thu": "11:00-22:00", "fri": "11:00-23:00", "sat": "11:00-23:00", "sun": "11:00-22:00"}'::jsonb,
    TRUE
),
(
    '연트럴파크',
    'Yeonnam Central Park',
    ST_SetSRID(ST_MakePoint(126.9267, 37.5689), 4326)::geography,
    '서울 마포구 연남동 567-186',
    '공원',
    ARRAY['산책', '피크닉', '자연'],
    'free',
    0,
    ARRAY['peaceful', 'green', 'family-friendly', 'relaxing'],
    4.5,
    FALSE,
    3,
    'medium',
    '{"mon": "00:00-23:59", "tue": "00:00-23:59", "wed": "00:00-23:59", "thu": "00:00-23:59", "fri": "00:00-23:59", "sat": "00:00-23:59", "sun": "00:00-23:59"}'::jsonb,
    TRUE
),

-- 을지로 지역
(
    '을지로 루프탑 바',
    'Euljiro Rooftop Bar',
    ST_SetSRID(ST_MakePoint(126.9910, 37.5665), 4326)::geography,
    '서울 중구 을지로 123',
    '이색장소',
    ARRAY['뷰맛집', '바', '야경'],
    'high',
    35000,
    ARRAY['trendy', 'scenic', 'social', 'nightlife'],
    4.7,
    FALSE,
    5,
    'high',
    '{"mon": "closed", "tue": "17:00-02:00", "wed": "17:00-02:00", "thu": "17:00-02:00", "fri": "17:00-03:00", "sat": "17:00-03:00", "sun": "17:00-01:00"}'::jsonb,
    TRUE
);

-- ============================================================
-- 2. Update Statistics
-- ============================================================

-- Count total places
DO $$
DECLARE
    place_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO place_count FROM public.places;
    RAISE NOTICE 'Seeded % places', place_count;
END $$;
