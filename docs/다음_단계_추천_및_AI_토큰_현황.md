# 다음 단계 추천 현황 & AI API 토큰 호출 현황

> 상용화 직전 핵심 기능 기준으로 “이미 구현된 것”과 “남은 것”, 그리고 **어디서 AI(Claude) 토큰이 쓰이는지** 정리했습니다.

---

## 1. 필수 우선순위별 구현 여부

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| **1** | **레벨(Lv), 스트릭(Streak), XP 실데이터** | ✅ **구현됨** | `GET /api/v1/users/me/stats` → `get_user_stats_full()`이 visits 기반으로 level, total_xp, xp_to_next_level, current_streak, longest_streak, badges 반환. 프로필 UI 연동 완료. |
| **2** | **푸시 알림 (진짜 구현)** | ⚠️ **부분** | DB + API + **앱 내 알림 센터**(🔔, 60초 폴링)까지 구현됨. **기기 푸시(FCM/Web Push)** 는 미구현. "오늘 퀘스트 도착", "N일 연속", "근처 80점 장소" 등 **발송 트리거/메시지 설계**만 하면 됨. |
| **3** | **소셜 (친구/팔로우/활동 보기)** | ✅ **구현됨** | `follows`, `feed_activities` 테이블 + `GET /social/feed`, POST/DELETE `/social/follow`, 소셜 탭 UI(피드)까지 구현. **팔로우 목록/검색 UI** 등은 추가 가능. |
| **4** | **장소 리뷰/사진 업로드 (UGC)** | ⚠️ **부분** | 체크인 시 **rating**은 저장됨. **리뷰 텍스트·사진**은 앱에서 입력 UI는 있으나, `VisitCreate`/`visits` 테이블에 **review, photos 필드 없음** → DB 스키마 + API 확장 후 저장·노출 필요. |
| **5** | **히트맵 기반 탐험 반경** | ✅ **반경만 구현** | **탐험 반경(숫자)** 는 구현됨: `my-map-real`에서 방문 좌표 기준 **중심→가장 먼 점 거리**로 `exploration_radius_km`, `this_month_radius_km` 계산. **히트맵(색상 밀도 시각화)** 는 없음 → 원하면 지도 위 히트맵 레이어 추가 필요. |

---

## 2. AI(Claude) API 토큰 호출 현황

모든 AI 호출은 **Anthropic Claude** (`claude-sonnet-4-20250514`) 사용.

### 2.1 호출하는 기능과 위치

| 기능 | 파일 | 언제 호출 | 호출 횟수/요청 | max_tokens | 비고 |
|------|------|-----------|-----------------|------------|------|
| **퀘스트 서사(한 줄)** | `services/narrative_generator.py` | **클릭한 퀘스트 상세 진입 시** (`POST /recommendations/narrative`) | **1회/클릭** (선택한 1곳만) | 150 | 추천 목록에서는 서사 미생성, 상세에서만 생성해 토큰 절감 |
| **성격 분석** | `services/personalization.py` | 프로필 탭 → **성격 분석** 버튼 클릭 시 | 1회/클릭 | 500 | `analyze_user_personality()` |
| **AI 동행자 스타일** | `services/personalization.py` | 위와 동일 (분석 시 함께) | 1회/클릭 | 별도 호출 | `create_ai_companion_style()` |
| **맞춤형 미션** | `services/mission_generator.py` | `/api/v1/ai` 챌린지·미션 API 사용 시 | 요청당 1~2회 | 354 등 | complete-app 기본 플로우에는 미포함 |
| **위치 가이드** | `services/location_guide.py` | `/api/v1/ai` 위치 가이드 API 사용 시 | 요청당 1~2회 | 152 등 | complete-app 기본 플로우에는 미포함 |
| **소셜 매칭** | `services/social_matching.py` | 소셜 매칭 API 사용 시 | 요청당 | 189 등 | 현재 앱 플로우에서 자동 호출 여부는 미확인 |
| **챌린지 메이커** | `services/challenge_maker.py` | 챌린지 생성/완료 API 사용 시 | 요청당 | 다수 | complete-app 챌린지 탭에서 사용 가능 |
| **Kakao 장소 요약** | `services/kakao_places.py` | 카카오 장소 상세 요약 시 (해당 API 경로 사용 시) | 1회/장소 | - | 선택적 |

### 2.2 실제로 자주 타는 경로 (비용 영향 큰 것)

- **장소 추천 (역할+무드 → 퀘스트 3곳)**  
  - **POST /api/v1/recommendations**: 서사 생성 없음 (목록에는 `narrative` 비움).  
  - **클릭한 1곳 상세** 진입 시 **POST /api/v1/recommendations/narrative** 1회 → **Claude 1회**, max_tokens 150.  
  - 따라서 “퀘스트 받기” 1번 = **0회**, “퀘스트 1곳 클릭” 1번 = **1회**.

- **프로필 → 성격 분석**  
  - 사용자가 “성격 분석하기” 버튼 누를 때만  
  - → `analyze_user_personality` 1회 + `create_ai_companion_style` 1회  
  - 호출 빈도는 낮지만, 호출당 토큰은 500 등으로 큼.

### 2.3 예상 토큰량 (참고)

- **입력**: 역할/무드/장소 메타 등으로 프롬프트 약 300~500자 수준 가정.
- **출력**: 서사 1건당 max 150 토큰 → 한글 기준 대략 1~2문장.
- **클릭한 1곳 서사 1회**: 입력 약 400 토큰, 출력 약 80 토큰 수준 가정 시, **호출 1회당 약 500 토큰** 수준 예상 (모델/실측과는 다를 수 있음).

추가 절감: 서사 **캐싱**(같은 장소+역할+무드 조합 재사용)을 도입하면 동일 장소 재방문 시 토큰을 더 줄일 수 있습니다.

---

## 3. 요약

| 구분 | 내용 |
|------|------|
| **이미 구현** | 레벨/XP/스트릭 실데이터, 소셜(팔로우·피드), 탐험 반경(숫자), 앱 내 알림 |
| **부분/추가 필요** | 푸시(기기 알림), 리뷰/사진 UGC(스키마+API), 히트맵 시각화 |
| **AI 토큰** | **추천 1회 = 서사 3회(Claude 3회)** 가 주된 호출. 성격 분석은 버튼 클릭 시만. 캐싱·호출 축소 시 비용 절감 가능. |

이 문서는 `docs/상용화_및_발전_방향.md`, `TODO.md`와 맞춰 두었습니다.

**마지막 업데이트**: 2026-02
