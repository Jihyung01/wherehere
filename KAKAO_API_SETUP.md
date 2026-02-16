# Kakao Local API 설정 가이드

## 🎯 목표
실제 카카오맵 장소 데이터를 수집하여 DB에 저장
- 서울 25개 구 × 6개 카테고리 = **수백 개 실제 장소**
- 실제 위치, 주소, 카테고리 정보
- AI가 다양한 장소 중에서 추천 가능

---

## 📝 1단계: Kakao Developers 계정 생성

### 1. 카카오 개발자 사이트 접속
https://developers.kakao.com/

### 2. 로그인 / 회원가입
- 카카오 계정으로 로그인
- 없으면 회원가입

### 3. 애플리케이션 추가
1. **내 애플리케이션** 메뉴 클릭
2. **애플리케이션 추가하기** 클릭
3. 앱 이름: `WhereHere` (또는 원하는 이름)
4. 사업자명: 개인 이름
5. **저장** 클릭

---

## 🔑 2단계: REST API 키 발급

### 1. 앱 설정 페이지로 이동
생성한 앱을 클릭

### 2. REST API 키 복사
- **앱 키** 탭에서 **REST API 키** 확인
- 예시: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 3. .env 파일에 추가
```bash
# backend/.env 파일 열기
# 아래 줄 추가

KAKAO_REST_API_KEY=여기에_복사한_키_붙여넣기
```

**예시**:
```bash
KAKAO_REST_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🚀 3단계: 장소 데이터 수집 실행

### 1. 스크립트 실행
```powershell
# WhereHere 프로젝트 루트에서
cd scripts
python collect_kakao_places.py
```

### 2. 예상 출력
```
============================================================
🚀 Starting Kakao Place Collection
============================================================
🔍 Searching: 서울 강남구 카페
   Found 45 places
✅ Saved 45 places to Supabase

🔍 Searching: 서울 강남구 음식점
   Found 45 places
✅ Saved 45 places to Supabase

...

============================================================
✅ Collection Complete!
   Total Places Collected: 1,234
============================================================
```

### 3. 수집 시간
- 약 10-15분 소요
- 서울 25개 구 × 6개 카테고리
- 예상 수집량: **500-1,500개 장소**

---

## 📊 4단계: 데이터 확인

### Supabase에서 확인
1. https://supabase.com/dashboard 접속
2. WhereHere 프로젝트 선택
3. **Table Editor** → `places` 테이블
4. 데이터가 들어왔는지 확인

### SQL로 확인
```sql
-- 총 장소 수
SELECT COUNT(*) FROM places;

-- 카테고리별 장소 수
SELECT primary_category, COUNT(*) 
FROM places 
GROUP BY primary_category;

-- 위치 정보가 있는 장소 수
SELECT COUNT(*) 
FROM places 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## 🎨 5단계: AI 추천 테스트

### 1. 백엔드 재시작
```powershell
cd backend
python -m uvicorn main:app --reload
```

### 2. API 테스트
```powershell
# 프로젝트 루트에서
powershell -ExecutionPolicy Bypass -File test_api.ps1
```

### 3. 예상 결과
```
=== Recommendations Test ===
Data Source: database_rest
Total Candidates: 1,234

Place: 강남역 스타벅스
  Distance: 523.4m      ← 실제 거리!
  Score: 92.3           ← AI 스코어
  Category: 카페

Place: 신사동 가로수길 카페
  Distance: 847.2m
  Score: 89.1
  Category: 카페

Place: 청담동 루프탑 바
  Distance: 1,234.5m
  Score: 87.8
  Category: 술집
```

**이제 매번 다른 장소가 추천됩니다!**

---

## 🔧 문제 해결

### Q1: "KAKAO_REST_API_KEY not set" 에러
**A**: `.env` 파일에 API 키가 제대로 설정되었는지 확인
```bash
# backend/.env 파일 확인
KAKAO_REST_API_KEY=실제키값
```

### Q2: "Kakao API Error: 401" 에러
**A**: API 키가 잘못되었거나 만료됨
- Kakao Developers에서 키 재확인
- 새로운 앱을 만들어서 새 키 발급

### Q3: "Kakao API Error: 429" 에러
**A**: API 호출 한도 초과 (하루 10,000건)
- 내일 다시 시도
- 또는 유료 플랜 고려

### Q4: 수집된 장소가 적음
**A**: 
- Kakao API는 한 번에 최대 45개만 반환
- 여러 지역 × 카테고리 조합으로 다양하게 수집
- 스크립트를 여러 번 실행해도 됨 (중복은 자동 제거)

### Q5: 여전히 거리가 0m
**A**: DB 마이그레이션 실행 필요
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE places 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;

CREATE INDEX IF NOT EXISTS idx_places_lat_lon ON places(latitude, longitude);
```

---

## 📈 고급 기능 (선택사항)

### 1. 특정 지역만 수집
```python
# collect_kakao_places.py 수정
SEOUL_REGIONS = [
    "강남구", "서초구", "송파구"  # 원하는 지역만
]
```

### 2. 특정 카테고리만 수집
```python
CATEGORIES = {
    "카페": "CE7",
    "음식점": "FD6"
}
```

### 3. 수집 범위 조정
```python
# search_places 함수에서
radius: int = 20000,  # 20km → 원하는 반경으로 변경
```

---

## 🎯 다음 단계

1. ✅ Kakao API 키 발급
2. ✅ 장소 데이터 수집 (500-1,500개)
3. ✅ DB 마이그레이션 실행
4. ⏳ AI 추천 알고리즘 고도화
   - 하이브리드 추천 엔진
   - 사용자 선호도 학습
   - 컨텍스트 기반 추천

---

## 💡 참고 자료

- [Kakao Local API 문서](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Supabase REST API](https://postgrest.org/en/stable/)
- [WhereHere 구현 가이드](./IMPLEMENTATION_GUIDE.md)
