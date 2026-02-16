# 장소 데이터 수집 실행 가이드

## 🚀 실행 방법

### 1. 스크립트 실행
```powershell
# WhereHere/scripts 폴더에서
cd c:\Users\tbvj1\Projects\WhereHere\scripts
python collect_simple.py
```

## 📊 수집 범위

### 서울 (25개 구)
강남구, 강동구, 강북구, 강서구, 관악구, 광진구, 구로구, 금천구, 노원구, 도봉구, 동대문구, 동작구, 마포구, 서대문구, 서초구, 성동구, 성북구, 송파구, 양천구, 영등포구, 용산구, 은평구, 종로구, 중구, 중랑구

### 경기 분당 (성남시)
- 분당구 정자동 ⭐ (추가됨!)
- 분당구 서현동 ⭐ (추가됨!)
- 분당구 야탑동

### 경기 주요 지역
- 일산동구, 일산서구
- 수지구, 기흥구
- 광교동

### 카테고리
- 카페 ☕
- 음식점 🍽️
- 술집 🍺

## 📈 예상 수집량

**총 33개 지역 × 3개 카테고리 × 30개 = 약 3,000개 장소**

- 서울: 25 × 3 × 30 = 2,250개
- 분당: 3 × 3 × 30 = 270개
- 기타 경기: 5 × 3 × 30 = 450개

## ⏱️ 예상 소요 시간

약 **8-12분**

## 🔍 진행 상황 확인

스크립트 실행 중 다음과 같이 표시됩니다:

```
============================================================
Kakao Place Collection (Simple)
============================================================

Searching: 서울 강남구 카페
  Found: 30 places

Searching: 서울 강남구 음식점
  Found: 30 places
  [OK] Saved 50 places

...

Searching: 경기 분당구 정자동 카페
  Found: 30 places

Searching: 경기 분당구 서현동 카페
  Found: 30 places
  [OK] Saved 50 places

...

============================================================
[DONE] Total collected: 2,847 places
============================================================
```

## ✅ 수집 완료 후 확인

### Supabase에서 확인
```sql
-- 총 장소 수
SELECT COUNT(*) FROM places;

-- 지역별 장소 수
SELECT 
    CASE 
        WHEN address LIKE '%분당%' THEN '분당'
        WHEN address LIKE '%강남%' THEN '강남'
        WHEN address LIKE '%일산%' THEN '일산'
        ELSE '기타'
    END as region,
    COUNT(*) as count
FROM places
GROUP BY region;

-- 카테고리별 장소 수
SELECT primary_category, COUNT(*) 
FROM places 
GROUP BY primary_category;
```

## 🎯 다음 단계

1. ✅ 데이터 수집 완료 (3,000개)
2. ⏳ DB 마이그레이션 실행
   ```sql
   -- Supabase SQL Editor에서 실행
   ALTER TABLE places 
   ADD COLUMN IF NOT EXISTS latitude FLOAT,
   ADD COLUMN IF NOT EXISTS longitude FLOAT;
   
   CREATE INDEX IF NOT EXISTS idx_places_lat_lon ON places(latitude, longitude);
   ```

3. ⏳ 백엔드 재시작
   ```powershell
   cd c:\Users\tbvj1\Projects\WhereHere\backend
   python -m uvicorn main:app --reload
   ```

4. ⏳ API 테스트
   ```powershell
   cd c:\Users\tbvj1\Projects\WhereHere
   powershell -ExecutionPolicy Bypass -File test_api.ps1
   ```

## 💡 팁

### 특정 지역만 수집하고 싶다면?
`collect_simple.py` 파일을 열어서 `REGIONS` 리스트를 수정:

```python
REGIONS = [
    "분당구 정자동",
    "분당구 서현동",
    "강남구",
    "서초구"
]
```

### 카테고리 추가하고 싶다면?
```python
CATEGORIES = {
    "카페": "CE7",
    "음식점": "FD6",
    "술집": "FD6",
    "공원": "AT4",      # 추가
    "문화시설": "CT1",  # 추가
}
```

## 🔧 문제 해결

### Q: 중복 에러 (409)가 나옵니다
**A**: 정상입니다! 이미 DB에 있는 장소는 자동으로 건너뜁니다.

### Q: API 에러 (429)가 나옵니다
**A**: API 호출 한도 초과. 잠시 후 다시 시도하거나 내일 실행하세요.

### Q: 수집이 너무 느립니다
**A**: 정상입니다. Rate limiting으로 0.5초씩 대기하면서 수집합니다.

---

**이제 실행하세요!** 🚀

```powershell
cd c:\Users\tbvj1\Projects\WhereHere\scripts
python collect_simple.py
```
