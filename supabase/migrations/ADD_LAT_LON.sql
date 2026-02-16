-- latitude, longitude 컬럼 추가
ALTER TABLE places 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- 기존 location 데이터에서 lat/lon 추출 (있는 경우)
UPDATE places 
SET 
    latitude = ST_Y(location::geometry),
    longitude = ST_X(location::geometry)
WHERE location IS NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_places_lat_lon ON places(latitude, longitude);

-- 샘플 데이터 업데이트 (서울 주요 지역)
UPDATE places SET latitude = 37.5656, longitude = 126.9254 WHERE id = 'kakao-place-001';
UPDATE places SET latitude = 37.5563, longitude = 126.9240 WHERE id = 'kakao-place-002';
UPDATE places SET latitude = 37.5347, longitude = 127.0023 WHERE id = 'kakao-place-003';
UPDATE places SET latitude = 37.5445, longitude = 127.0557 WHERE id = 'kakao-place-004';
UPDATE places SET latitude = 37.5858, longitude = 126.9823 WHERE id = 'kakao-place-005';
UPDATE places SET latitude = 37.5665, longitude = 126.9910 WHERE id = 'kakao-place-006';
UPDATE places SET latitude = 37.5826, longitude = 126.9849 WHERE id = 'kakao-place-007';
UPDATE places SET latitude = 37.5547, longitude = 126.9198 WHERE id = 'kakao-place-008';
UPDATE places SET latitude = 37.5172, longitude = 127.0473 WHERE id = 'kakao-place-009';
UPDATE places SET latitude = 37.5794, longitude = 126.9770 WHERE id = 'kakao-place-010';
UPDATE places SET latitude = 37.5512, longitude = 126.9882 WHERE id = 'kakao-place-011';
UPDATE places SET latitude = 37.5443, longitude = 127.0557 WHERE id = 'kakao-place-012';
UPDATE places SET latitude = 37.5665, longitude = 126.9784 WHERE id = 'kakao-place-013';
UPDATE places SET latitude = 37.5172, longitude = 127.0286 WHERE id = 'kakao-place-014';
UPDATE places SET latitude = 37.5443, longitude = 127.0557 WHERE id = 'kakao-place-015';
