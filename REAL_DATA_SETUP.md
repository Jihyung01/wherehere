# 실제 데이터로 전환하기 (Mock → Real Data)

## 🎯 현재 상황

### ❌ 문제점
1. **나의 지도 UI 안 보임** - 버튼만 있고 페이지 이동 안 됨
2. **거리 0m** - DB에 위치 정보 없음
3. **같은 장소만 추천** - 15개 샘플 데이터뿐
4. **Mock 데이터 같음** - 실제로는 DB 연결되어 있지만 데이터 부족

### ✅ 해결 완료
1. ✅ 나의 지도 페이지 라우팅 수정
2. ✅ Kakao Local API 수집 스크립트 작성
3. ✅ 거리 계산 로직 구현
4. ✅ DB 마이그레이션 SQL 준비

---

## 🚀 실행 순서 (5분 안에 완료)

### 1단계: Kakao API 키 발급 (2분)
```
1. https://developers.kakao.com/ 접속
2. 로그인 → 내 애플리케이션 → 애플리케이션 추가
3. REST API 키 복사
4. backend/.env 파일에 추가:
   KAKAO_REST_API_KEY=복사한키
```

**자세한 가이드**: `KAKAO_API_SETUP.md` 참조

### 2단계: DB 마이그레이션 실행 (1분)
```sql
-- Supabase SQL Editor에서 실행
-- https://supabase.com/dashboard

ALTER TABLE places 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;

CREATE INDEX IF NOT EXISTS idx_places_lat_lon ON places(latitude, longitude);
```

### 3단계: 장소 데이터 수집 (10-15분)
```powershell
# WhereHere 프로젝트 루트에서
cd scripts
powershell -ExecutionPolicy Bypass -File run_collection.ps1
```

**예상 결과**: 500-1,500개 실제 장소 수집

### 4단계: 백엔드 재시작 (10초)
```powershell
# 기존 프로세스 종료
taskkill /F /IM python.exe

# 재시작
cd backend
python -m uvicorn main:app --reload
```

### 5단계: 테스트 (1분)
```powershell
# API 테스트
powershell -ExecutionPolicy Bypass -File test_api.ps1

# 프론트엔드 확인
# http://localhost:3003 접속
# "나의 지도" 버튼 클릭
```

---

## 📊 Before & After

### Before (현재)
```
추천 장소:
- 연남동 책방 카페 (거리: 0m, 항상 같은 장소)
- 빈티지 레코드 카페 (거리: 0m, 항상 같은 장소)
- 한남동 숨은 정원 (거리: 0m, 항상 같은 장소)

총 장소: 15개 (샘플 데이터)
```

### After (실행 후)
```
추천 장소:
- 강남역 스타벅스 (거리: 523m, 평점: 4.5)
- 신사동 가로수길 카페 (거리: 847m, 평점: 4.7)
- 청담동 루프탑 바 (거리: 1,234m, 평점: 4.8)

총 장소: 1,234개 (실제 데이터)
매번 다른 장소 추천!
```

---

## 🎨 UI 개선 사항

### 1. 나의 지도 페이지
**URL**: http://localhost:3003/my-map

**기능**:
- 방문 기록 시각화 (Canvas 기반 지도)
- 통계 대시보드 (카테고리 분포, 주간 활동)
- 스타일 분석 (탐험 스타일, AI 추천)
- 타임라인 (방문 히스토리)

**수정 완료**:
- ✅ 버튼 클릭 시 `/my-map` 페이지로 이동

### 2. 추천 시스템
**개선 사항**:
- ✅ 실제 거리 계산 (Haversine 공식)
- ✅ 거리 기반 스코어링
- ✅ 다양한 장소 추천 (랜덤 선택)

**향후 개선**:
- ⏳ AI 기반 개인화 추천
- ⏳ 사용자 선호도 학습
- ⏳ 컨텍스트 기반 추천 (시간, 날씨, 동행자)

---

## 🔧 문제 해결

### Q1: 여전히 거리가 0m
**A**: DB 마이그레이션 실행 안 됨
```sql
-- Supabase SQL Editor에서 확인
SELECT COUNT(*) FROM places WHERE latitude IS NOT NULL;
-- 결과가 0이면 마이그레이션 미실행
```

### Q2: 나의 지도 페이지가 안 보임
**A**: 프론트엔드 재시작 필요
```powershell
# 프론트엔드 재시작
cd frontend-app
npm run dev
```

### Q3: 장소 수집 스크립트 에러
**A**: API 키 확인
```bash
# backend/.env 파일 확인
KAKAO_REST_API_KEY=실제키값
```

### Q4: 같은 장소만 추천됨
**A**: 장소 데이터 수집 안 됨
```sql
-- Supabase에서 확인
SELECT COUNT(*) FROM places;
-- 결과가 15개면 수집 안 됨
```

---

## 📈 데이터 수집 상세

### 수집 범위
- **지역**: 서울 25개 구
- **카테고리**: 카페, 음식점, 술집, 공원, 문화시설, 편의점
- **예상 수집량**: 500-1,500개 장소

### 수집 데이터
```json
{
  "id": "kakao-12345678",
  "name": "강남역 스타벅스",
  "address": "서울 강남구 강남대로 396",
  "latitude": 37.4979,
  "longitude": 127.0276,
  "primary_category": "카페",
  "vibe_tags": ["cozy", "quiet", "trendy"],
  "average_rating": 4.5,
  "average_price": 8000,
  "is_active": true
}
```

### 수집 시간
- 1개 지역 × 1개 카테고리: 약 10초
- 25개 지역 × 6개 카테고리: 약 10-15분
- Rate limiting: 0.5초 대기

---

## 🎯 다음 단계

### 즉시 (오늘)
1. ✅ Kakao API 키 발급
2. ✅ DB 마이그레이션
3. ✅ 장소 데이터 수집
4. ✅ 테스트

### 단기 (1-2주)
1. ⏳ AI 추천 알고리즘 고도화
   - 하이브리드 추천 엔진
   - 사용자 선호도 학습
   - 컨텍스트 기반 추천

2. ⏳ 실시간 위치 추적
   - 사용자 현재 위치 기반 추천
   - 가까운 순 정렬
   - 실시간 거리 업데이트

### 중기 (1개월)
1. ⏳ 리뷰 데이터 수집
   - Kakao Place API (리뷰, 평점)
   - 사용자 리뷰 시스템
   - 평점 기반 추천

2. ⏳ 대화형 AI
   - 자연어 추천
   - 의도 파악
   - 개인화된 응답

---

## 📞 지원

### 문서
- `KAKAO_API_SETUP.md` - Kakao API 설정 가이드
- `FIX_DISTANCE_ISSUE.md` - 거리 0m 문제 해결
- `IMPLEMENTATION_GUIDE.md` - 전체 구현 가이드

### 스크립트
- `scripts/collect_kakao_places.py` - 장소 수집 스크립트
- `scripts/run_collection.ps1` - 실행 스크립트
- `test_api.ps1` - API 테스트 스크립트

### 마이그레이션
- `supabase/migrations/ADD_LAT_LON.sql` - DB 마이그레이션

---

## ✅ 체크리스트

실행 전 확인:
- [ ] Kakao API 키 발급 완료
- [ ] backend/.env에 API 키 추가
- [ ] Supabase 접속 가능
- [ ] Python 3.8+ 설치
- [ ] httpx 라이브러리 설치 (`pip install httpx`)

실행 후 확인:
- [ ] Supabase에 장소 데이터 500개 이상
- [ ] API 테스트 시 거리 표시 (0m 아님)
- [ ] 매번 다른 장소 추천
- [ ] 나의 지도 페이지 접속 가능

---

## 🎉 완료 시 기대 효과

1. **다양한 추천**: 매번 다른 장소 추천 (500-1,500개 중)
2. **실제 거리**: 사용자 위치 기반 정확한 거리 표시
3. **실제 장소**: 카카오맵에서 검색 가능한 실제 장소
4. **AI 추천 준비**: 충분한 데이터로 AI 학습 가능

**이제 진짜 상용화 가능한 앱이 됩니다!** 🚀
