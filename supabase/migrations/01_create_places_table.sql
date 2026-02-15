-- ============================================================
-- Step 1: Create places table (기본 장소 테이블)
-- ============================================================

CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id TEXT UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    location GEOGRAPHY(POINT, 4326),
    primary_category TEXT,
    secondary_categories TEXT[],
    vibe_tags TEXT[],
    description TEXT,
    average_rating FLOAT DEFAULT 0,
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    typical_crowd_level TEXT DEFAULT 'medium',
    average_price INT,
    price_tier TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(primary_category);
CREATE INDEX IF NOT EXISTS idx_places_active ON places(is_active);

-- ============================================================
-- Step 2: Insert sample data (샘플 장소 데이터)
-- ============================================================

INSERT INTO places (
    place_id, name, address, location, 
    primary_category, vibe_tags, description,
    average_rating, is_hidden_gem, average_price, typical_crowd_level
) VALUES
-- 카페
(
    'place-001',
    '연남동 숨은 카페',
    '서울 마포구 연남동 223-4',
    ST_SetSRID(ST_MakePoint(126.9250, 37.5665), 4326)::geography,
    '카페',
    ARRAY['조용한', '아늑한', '힙한', '데이트'],
    '연남동의 숨겨진 보석 같은 카페. 조용하고 아늑한 분위기에서 책을 읽거나 대화를 나누기 좋습니다.',
    4.5,
    true,
    12000,
    'low'
),
(
    'place-002',
    '성수동 루프탑 바',
    '서울 성동구 성수동 656-1234',
    ST_SetSRID(ST_MakePoint(127.0557, 37.5443), 4326)::geography,
    '바',
    ARRAY['뷰맛집', '루프탑', '감성', '석양'],
    '성수동의 핫플레이스. 석양이 아름다운 루프탑 바에서 특별한 시간을 보내세요.',
    4.7,
    false,
    25000,
    'high'
),
(
    'place-003',
    '이태원 북카페',
    '서울 용산구 이태원동 119-25',
    ST_SetSRID(ST_MakePoint(126.9942, 37.5347), 4326)::geography,
    '카페',
    ARRAY['책', '조용한', '독서', '힐링'],
    '책과 함께하는 여유로운 시간. 독서하기 좋은 북카페로 다양한 장르의 책을 구비하고 있습니다.',
    4.3,
    true,
    10000,
    'low'
),
(
    'place-004',
    '홍대 보드게임 카페',
    '서울 마포구 홍대입구 358-120',
    ST_SetSRID(ST_MakePoint(126.9250, 37.5563), 4326)::geography,
    '카페',
    ARRAY['보드게임', '친구', '재미', '소셜'],
    '친구들과 즐기기 좋은 보드게임 카페. 100종 이상의 보드게임을 무료로 즐길 수 있습니다.',
    4.4,
    false,
    15000,
    'medium'
),
(
    'place-005',
    '강남 갤러리 카페',
    '서울 강남구 신사동 542-3',
    ST_SetSRID(ST_MakePoint(127.0205, 37.5172), 4326)::geography,
    '카페',
    ARRAY['예술', '전시', '감성', '인스타'],
    '예술 작품을 감상하며 커피를 즐길 수 있는 갤러리 카페. 매달 새로운 전시가 열립니다.',
    4.6,
    true,
    18000,
    'medium'
),

-- 공원
(
    'place-006',
    '한강공원 여의도',
    '서울 영등포구 여의도동',
    ST_SetSRID(ST_MakePoint(126.9329, 37.5285), 4326)::geography,
    '공원',
    ARRAY['자연', '산책', '힐링', '운동'],
    '한강을 따라 산책하거나 자전거를 타기 좋은 공원. 피크닉과 운동을 즐길 수 있습니다.',
    4.8,
    false,
    0,
    'high'
),
(
    'place-007',
    '서울숲',
    '서울 성동구 성수동1가',
    ST_SetSRID(ST_MakePoint(127.0374, 37.5445), 4326)::geography,
    '공원',
    ARRAY['자연', '산책', '가족', '반려동물'],
    '도심 속 자연을 만끽할 수 있는 서울숲. 사슴과 다양한 동물들을 볼 수 있습니다.',
    4.7,
    false,
    0,
    'high'
),

-- 문화공간
(
    'place-008',
    '국립중앙박물관',
    '서울 용산구 서빙고로 137',
    ST_SetSRID(ST_MakePoint(126.9800, 37.5240), 4326)::geography,
    '박물관',
    ARRAY['문화', '역사', '교육', '실내'],
    '한국의 역사와 문화를 한눈에 볼 수 있는 국립중앙박물관. 무료 입장.',
    4.9,
    false,
    0,
    'medium'
),
(
    'place-009',
    '북촌 한옥마을',
    '서울 종로구 계동길',
    ST_SetSRID(ST_MakePoint(126.9850, 37.5820), 4326)::geography,
    '문화공간',
    ARRAY['전통', '사진', '관광', '한옥'],
    '전통 한옥의 아름다움을 느낄 수 있는 북촌. 사진 찍기 좋은 명소.',
    4.6,
    false,
    0,
    'high'
),
(
    'place-010',
    '삼청동 갤러리 거리',
    '서울 종로구 삼청동',
    ST_SetSRID(ST_MakePoint(126.9820, 37.5860), 4326)::geography,
    '문화공간',
    ARRAY['예술', '갤러리', '산책', '감성'],
    '작은 갤러리들이 모여있는 삼청동. 예술 작품을 감상하며 산책하기 좋습니다.',
    4.5,
    true,
    0,
    'low'
),

-- 맛집
(
    'place-011',
    '익선동 한식당',
    '서울 종로구 익선동',
    ST_SetSRID(ST_MakePoint(126.9900, 37.5710), 4326)::geography,
    '음식점',
    ARRAY['한식', '전통', '맛집', '데이트'],
    '전통 한옥에서 즐기는 현대식 한식. 익선동의 숨은 맛집.',
    4.7,
    true,
    30000,
    'high'
),
(
    'place-012',
    '망원동 맛집 골목',
    '서울 마포구 망원동',
    ST_SetSRID(ST_MakePoint(126.9050, 37.5560), 4326)::geography,
    '음식점',
    ARRAY['다양한', '맛집', '저렴한', '로컬'],
    '다양한 음식을 저렴하게 즐길 수 있는 망원동 맛집 골목.',
    4.4,
    false,
    15000,
    'high'
),

-- 쇼핑
(
    'place-013',
    '성수 카페거리',
    '서울 성동구 성수동2가',
    ST_SetSRID(ST_MakePoint(127.0557, 37.5443), 4326)::geography,
    '쇼핑',
    ARRAY['힙한', '쇼핑', '카페', '감성'],
    '힙한 카페와 편집샵이 모여있는 성수동. 쇼핑과 카페 투어를 동시에.',
    4.6,
    false,
    20000,
    'high'
),
(
    'place-014',
    '경리단길',
    '서울 용산구 이태원동',
    ST_SetSRID(ST_MakePoint(126.9942, 37.5347), 4326)::geography,
    '쇼핑',
    ARRAY['다양한', '맛집', '바', '이국적'],
    '이국적인 분위기의 경리단길. 다양한 음식점과 바가 모여있습니다.',
    4.5,
    false,
    25000,
    'high'
),

-- 야경
(
    'place-015',
    'N서울타워',
    '서울 용산구 남산공원길 105',
    ST_SetSRID(ST_MakePoint(126.9882, 37.5512), 4326)::geography,
    '전망대',
    ARRAY['야경', '뷰맛집', '데이트', '관광'],
    '서울의 야경을 한눈에 볼 수 있는 N서울타워. 특별한 날에 추천.',
    4.8,
    false,
    15000,
    'high'
)
ON CONFLICT (place_id) DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Places table created and sample data inserted successfully!';
    RAISE NOTICE '📊 Total places: %', (SELECT COUNT(*) FROM places);
END $$;
