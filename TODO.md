# WhereHere 작업 체크리스트

> **현재 상태·기능 정리**: [docs/현재_상태_및_문서_가이드.md](docs/현재_상태_및_문서_가이드.md)

---

## ✅ 이미 구현된 것 (동작 중)

- [x] 카카오 / 구글 / 이메일 로그인·회원가입
- [x] 사용자별 데이터 분리 (방문, 나의 지도, 추천)
- [x] 메인 앱: 역할·무드 선택 → 퀘스트 추천 → 체크인·리뷰 → XP
- [x] **퀘스트 완료 시 visits 자동 저장** (앱에서 "완료하고 XP 받기" → `POST /api/v1/visits` → DB에 저장)
- [x] 나의 지도: 기간별 필터, 지도/통계/스타일 탭, 카카오맵
- [x] 설정: 개인정보(닉네임 표시), 로그아웃, 다크모드
- [x] 백엔드: visits CRUD, AI pattern/personality, **추천 API(DB places 연동·거리/역할 스코어링)**, 퀘스트·챌린지·소셜 라우트

---

## ✅ 실데이터 스키마 적용 (했으면 완료)

- [x] **REAL_DATA_SCHEMA.sql** Supabase SQL Editor에서 실행 → `places`, `visits` 테이블 생성

**확인 방법**

1. Supabase 대시보드 → **Table Editor**
2. 왼쪽에 **places**, **visits** 테이블이 보이는지 확인
3. **places** 클릭 → 컬럼에 `id`, `name`, `latitude`, `longitude`, `primary_category` 등이 있으면 OK

---

## 🎯 지금 할 수 있는 일 (우선순위)

### [x] 1. places 실데이터 채우기 (스키마만 있으면 다음 단계)

- 스키마 적용 후 **places 3000곳 이상 수집 완료** 시 완료로 간주
- 수집 방법: `python scripts/collect_simple.py` (KAKAO + Supabase 키 설정 후), [docs/실데이터_설정_가이드.md](docs/실데이터_설정_가이드.md) 2단계

### [ ] 2. 추천 엔진 고도화 (선택)

- **이미 구현된 것**: DB `places`에서 장소 조회 → 거리·역할·카테고리 반영 스코어링 → 상위 추천
- **고도화** = 개선 단계: PostGIS로 DB에서 거리 필터링 쿼리, 더 세밀한 스코어링 등 (필요 시)

### [x] 3. 퀘스트 Geofencing (일부 완료)

- [x] **도착 인정**: 퀘스트 화면에서 100m 이내일 때 "도착했어요" 버튼으로 "장소 도착하기" 자동 체크 (프론트)
- [x] **체크인 API 위치 검증**: POST /visits 시 `user_latitude`/`user_longitude` 전달하면 100m 이내만 체크인 허용, 위치 검증 시 XP 보너스

### [x] 4. AI 서사 생성

- [x] Claude API 연동 (`backend/services/narrative_generator.py`), 추천 API에서 서사 배치 생성·응답 포함, 프론트에서 퀘스트 서사 표시

### [x] 5. 레벨 & XP UI

- [x] 프로필 화면에 레벨·XP 진행바, 스트릭(연속 방문일) 표시 (GET /api/v1/users/me/stats 연동)

---

## 📋 Phase 3 (나중에)

- [ ] 실시간 알림 (Supabase Realtime)
- [ ] 소셜 (친구, 팔로우)
- [ ] 크리에이터 모드 (장소 등록)
- [ ] 모바일 앱 (React Native)
- [ ] 관리자 대시보드

---

## 🐛 알려진 이슈

- (없음 시 "현재 없음" 유지)

---

## 💡 개선 아이디어

- [ ] 다국어 (i18n)
- [ ] PWA·오프라인
- [ ] 이미지 lazy loading

---

**마지막 업데이트**: 2026-02
