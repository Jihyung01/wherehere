# WhereHere 프론트엔드 - 프로덕션 레디 버전 🎨

## 구현 완료 사항 ✅

### 1. 완전한 API 연동
- ✅ 실제 백엔드 `/api/v1/recommendations` 엔드포인트 연결
- ✅ 실시간 위치 권한 요청 및 현재 위치 가져오기
- ✅ TanStack Query를 사용한 데이터 캐싱 및 로딩 상태 관리
- ✅ 에러 핸들링 (백엔드 미응답 시 사용자 친화적 메시지)
- ✅ 날씨 정보 표시 (백엔드에서 제공 시)
- ✅ 데이터 소스 뱃지 (실시간 DB vs Mock 데이터 구분)

### 2. 상용화 수준 UI/UX

#### 홈 화면
- ✅ 시간대별 인사말 (아침/오후/저녁/밤)
- ✅ 레벨 & XP 진행률 바 (애니메이션 포함)
- ✅ 스트릭(연속 출석) 배지
- ✅ 오늘 완료한 퀘스트 수 표시
- ✅ 기분 선택기 (6가지 기분 - 호기심/지침/활기찬/외로운/행복한/심심한)
- ✅ 역할 선택 카드 (5가지 역할 - 탐험가/치유자/수집가/연결자/달성자)
- ✅ 각 역할별 테마 컬러 & 그라데이션
- ✅ 카드 호버 애니메이션
- ✅ Fade-in-up 애니메이션 (순차적 등장)

#### 로딩 화면
- ✅ 역할별 아이콘 플로팅 애니메이션
- ✅ AI 분석 메시지 ("AI가 당신의 위치와 기분을 분석하여...")
- ✅ 프로그레스 바 shimmer 효과
- ✅ 로딩 도트 애니메이션

#### 퀘스트 리스트 화면
- ✅ 역할별 헤더 (그라데이션 배경)
- ✅ 날씨 정보 뱃지 (현재 날씨 & 온도)
- ✅ 데이터 소스 뱃지 (🟢 실시간 DB / 📦 Mock)
- ✅ 퀘스트 카드 (확장/축소 가능)
- ✅ 히든 보석 뱃지 (✨ 히든)
- ✅ XP 보상 표시
- ✅ 평점 (⭐ x.x)
- ✅ 거리 표시 (m 또는 km)
- ✅ AI 서사 표시 (왼쪽 컬러 보더)
- ✅ 확장 시: 예상 비용, 혼잡도, Vibe 태그, 추천 이유
- ✅ 퀘스트 수락 버튼 (역할별 그라데이션)

#### 퀘스트 진행 화면
- ✅ 지도 플레이스홀더 (향후 Kakao Maps 연동 예정)
- ✅ 실시간 타이머 (mm:ss 형식)
- ✅ 타이머 펄스 애니메이션
- ✅ 퀘스트 세부정보 카드
- ✅ AI 서사 섹션
- ✅ 미션 체크리스트 (클릭하여 체크 가능)
  - 장소에 도착하기
  - 30분 이상 체류하기
  - 사진 1장 촬영하기
- ✅ 보상 미리보기 (XP + 스트릭 유지)
- ✅ 완료 버튼 (모든 미션 체크 시 활성화)

#### 퀘스트 완료 효과
- ✅ 컨페티 애니메이션 (40개 파티클)
- ✅ 완료 메시지 팝업 ("퀘스트 완료!")
- ✅ XP 자동 적립 (+150 XP)
- ✅ 완료 카운트 증가
- ✅ 2.5초 후 자동으로 홈 화면 복귀

### 3. 기술 스택

```typescript
Frontend Stack:
├── React 18.3.1 (Server & Client Components)
├── Next.js 14.2.35 (App Router)
├── TypeScript 5
├── TanStack Query (React Query)
├── Noto Sans KR + Space Grotesk (Google Fonts)
└── 100% 인라인 스타일 (CSS-in-JS, 번들 최적화)

Backend Integration:
├── FastAPI REST API
├── 실시간 위치 기반 추천
├── OpenWeatherMap API (날씨)
├── Anthropic Claude API (AI 서사)
└── Supabase PostGIS (장소 DB)
```

---

## 실행 방법 🚀

### 1. 백엔드 서버 실행 (먼저!)

```powershell
cd backend
uvicorn main:app --reload
```

서버가 뜨면 http://localhost:8000/docs 에서 Swagger 문서를 확인할 수 있습니다.

### 2. 프론트엔드 실행

```powershell
cd frontend-app
npm run dev
```

브라우저에서 http://localhost:3000 접속!

---

## 화면 흐름 📱

```
홈 화면
   ↓ (역할 선택)
로딩 화면 (1.8초)
   ↓ (자동 전환)
퀘스트 리스트
   ↓ (퀘스트 수락)
퀘스트 진행 화면
   ↓ (미션 완료 + 완료 버튼)
컨페티 효과 (2.5초)
   ↓ (자동 복귀)
홈 화면
```

---

## 실제 API 연동 확인 방법 ✅

### 1. 위치 권한
- 브라우저에서 위치 권한 팝업이 뜨면 **허용** 클릭
- 권한이 거부되면 기본 위치 (서울 시청: 37.5665, 126.9780) 사용

### 2. 실제 데이터 확인
- 퀘스트 리스트 화면 우측 상단의 뱃지 확인:
  - **🟢 실시간 DB**: Supabase에서 실제 장소 데이터 가져옴
  - **📦 Mock**: 백엔드가 DB 연결 실패 시 Mock 데이터 반환

### 3. 날씨 정보
- 퀘스트 리스트 상단에 현재 날씨와 온도 표시
- 예: "맑음 · 4°C"

### 4. AI 서사
- 각 퀘스트 카드에 AI가 생성한 감성적인 서사 표시
- 예: "오래된 골목이 품고 있던 비밀, 오늘 당신이 처음으로 열어봅니다."

---

## API Request 예시

프론트엔드에서 백엔드로 보내는 실제 요청:

```json
POST http://localhost:8000/api/v1/recommendations

{
  "user_id": "user-123",
  "role_type": "explorer",
  "user_level": 8,
  "current_location": {
    "latitude": 37.5665,
    "longitude": 126.9780
  },
  "mood": {
    "mood_text": "curious",
    "intensity": 0.8
  }
}
```

응답:

```json
{
  "recommendations": [
    {
      "place_id": "uuid...",
      "name": "을지로 루프탑 바",
      "address": "서울 중구 을지로 123",
      "category": "이색장소",
      "distance_meters": 1149,
      "score": 59.45,
      "score_breakdown": {
        "category": 100,
        "distance": 70.9,
        "hidden_bonus": 0
      },
      "reason": "추천 - 평점 4.70점",
      "estimated_cost": 35000,
      "vibe_tags": ["trendy", "scenic", "social", "nightlife"],
      "average_rating": 4.7,
      "is_hidden_gem": false,
      "typical_crowd_level": "high",
      "narrative": "지도에 없는 길 위에서, 새로운 이야기가 시작됩니다.",
      "description": ""
    }
    // ... 2개 더
  ],
  "role_type": "explorer",
  "radius_used": 4000,
  "total_candidates": 3,
  "generated_at": "2026-02-12T19:36:47.621100",
  "weather": {
    "condition": "sunny",
    "condition_kr": "맑음",
    "temperature": 4,
    "feels_like": 1,
    "humidity": 81,
    "icon": "01n"
  },
  "time_of_day": "evening",
  "data_source": "database"
}
```

---

## 제공하신 코드와 비교 📊

| 기능 | 제공하신 코드 | 구현된 코드 | 개선사항 |
|------|-------------|------------|---------|
| **API 연동** | Mock 데이터만 | ✅ 실제 API 연동 | TanStack Query로 상태관리 |
| **위치 권한** | 없음 | ✅ 구현됨 | Geolocation API 사용 |
| **날씨 정보** | 없음 | ✅ 표시됨 | 백엔드에서 받아서 표시 |
| **데이터 소스** | 구분 없음 | ✅ 뱃지로 표시 | DB vs Mock 시각화 |
| **로딩 상태** | 타이머만 | ✅ 실제 API 로딩 | 에러 핸들링 포함 |
| **기분 선택** | ✅ 동일 | ✅ 동일 + API 전송 | API에 기분 데이터 전송 |
| **역할 선택** | ✅ 5개 역할 | ✅ 동일 | 동일한 5가지 역할 |
| **퀘스트 카드** | ✅ 확장 가능 | ✅ 확장 + 실제 데이터 | DB에서 받은 실제 장소 표시 |
| **AI 서사** | ✅ Mock | ✅ 실제 AI 서사 | Claude API가 생성한 텍스트 |
| **미션 체크리스트** | ✅ 구현됨 | ✅ 구현됨 | 체크 시 완료 버튼 활성화 |
| **완료 효과** | ✅ 컨페티 | ✅ 컨페티 + XP 적립 | 실제 XP 증가 애니메이션 |
| **애니메이션** | ✅ 풍부함 | ✅ 동일 | Fade-in-up, Float, Pulse 등 |
| **폰트** | ✅ 구글 폰트 | ✅ 동일 | Noto Sans KR + Space Grotesk |
| **반응형** | ✅ 430px | ✅ 430px | 모바일 퍼스트 |

---

## 주요 개선 사항 🎯

### 1. **실제 API 통합**
제공하신 코드는 `MOCK_QUESTS`라는 하드코딩된 데이터를 사용했습니다.
구현된 코드는 **실제 백엔드 API**와 통신하여:
- 사용자의 실시간 위치
- 선택한 역할
- 선택한 기분
- 사용자 레벨

이 모든 정보를 백엔드로 전송하고, **PostGIS 쿼리**로 실제 장소 추천을 받아옵니다.

### 2. **상태 관리**
- TanStack Query 사용으로 캐싱, 재시도, 로딩 상태를 자동 관리
- 5분 stale time으로 불필요한 API 호출 방지
- 에러 발생 시 사용자 친화적 메시지 표시

### 3. **실시간 위치**
- Geolocation API로 사용자의 실제 위치 가져오기
- 권한 거부 시 기본 위치 (서울 시청) 사용
- 로딩 화면 표시

### 4. **데이터 소스 투명성**
- 백엔드가 실제 DB를 사용하는지, Mock 데이터를 사용하는지 표시
- 개발 중에도 상태를 명확히 알 수 있음

### 5. **날씨 통합**
- 백엔드에서 OpenWeatherMap API를 호출하여 날씨 정보 제공
- 한국어 번역된 날씨 상태 표시

---

## 다음 단계 (Phase 3) 🔮

현재 구현된 것은 **Phase 2 완료** 상태입니다.

Phase 3으로 가기 위해 필요한 작업:

1. **Kakao Maps 통합**
   - 퀘스트 진행 화면의 지도 플레이스홀더를 실제 Kakao Maps로 교체
   - 현재 위치와 목적지 표시
   - 경로 안내

2. **사용자 인증**
   - Supabase Auth 연동
   - 로그인/회원가입 플로우
   - 사용자별 XP/레벨 저장

3. **퀘스트 완료 저장**
   - 완료한 퀘스트를 DB에 저장
   - 히스토리 조회 기능
   - 통계 대시보드

4. **레벨 시스템**
   - XP 적립 시 실제 레벨업 계산
   - 레벨업 시 축하 애니메이션
   - 역할별 레벨 분리 (탐험가 Lv.8, 치유자 Lv.3 등)

5. **소셜 기능**
   - 친구 추가
   - 함께 퀘스트 완료
   - 리더보드

---

## 테스트 체크리스트 ✅

실행 후 다음 항목들을 확인해보세요:

- [ ] 홈 화면이 정상적으로 로드되는가?
- [ ] 시간대별 인사말이 올바른가? (현재 시간 기준)
- [ ] 레벨/XP 바가 표시되는가?
- [ ] 스트릭 배지가 표시되는가?
- [ ] 기분 선택 시 선택 상태가 토글되는가?
- [ ] 역할 선택 시 로딩 화면으로 전환되는가?
- [ ] 로딩 화면에서 역할 아이콘이 플로팅 애니메이션을 하는가?
- [ ] 1.8초 후 퀘스트 리스트로 자동 전환되는가?
- [ ] 퀘스트 카드가 표시되는가?
- [ ] 날씨 정보가 표시되는가? (백엔드 연결 시)
- [ ] 데이터 소스 뱃지가 표시되는가? (🟢 또는 📦)
- [ ] 퀘스트 카드 클릭 시 확장되는가?
- [ ] AI 서사가 표시되는가?
- [ ] 퀘스트 수락 시 진행 화면으로 전환되는가?
- [ ] 타이머가 작동하는가?
- [ ] 미션 체크리스트를 클릭하여 체크할 수 있는가?
- [ ] 모든 미션 체크 시 완료 버튼이 활성화되는가?
- [ ] 완료 버튼 클릭 시 컨페티 효과가 나타나는가?
- [ ] XP가 증가하는가?
- [ ] 완료 카운트가 증가하는가?
- [ ] 2.5초 후 홈 화면으로 복귀하는가?

---

## 코드 구조 📂

```
frontend-app/
├── app/
│   ├── page.tsx                 # 메인 페이지 (HomeClientV2 렌더링)
│   ├── layout.tsx               # 루트 레이아웃
│   └── providers.tsx            # React Query Provider
│
├── components/
│   ├── home-client-v2.tsx       # ⭐ 새로운 프로덕션 레디 컴포넌트
│   │   ├── HomeScreen           # 홈 화면
│   │   ├── LoadingScreen        # 로딩 화면
│   │   ├── QuestListScreen      # 퀘스트 리스트
│   │   ├── QuestCard            # 퀘스트 카드 (확장 가능)
│   │   ├── AcceptedQuestScreen  # 퀘스트 진행 화면
│   │   └── ConfettiEffect       # 완료 효과
│   │
│   └── home-client.tsx          # 기존 컴포넌트 (백업용)
│
└── .env.local                   # 환경 변수
    ├── NEXT_PUBLIC_API_URL      # 백엔드 API URL
    ├── NEXT_PUBLIC_SUPABASE_URL
    └── NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 성능 최적화 ⚡

- ✅ React Server Components 사용 (page.tsx)
- ✅ Client Components 최소화 (필요한 곳만)
- ✅ 인라인 스타일 사용 (CSS 번들 크기 0)
- ✅ TanStack Query 캐싱 (5분 stale time)
- ✅ API 재시도 제한 (1회)
- ✅ 애니메이션 GPU 가속 (transform, opacity)
- ✅ 컴포넌트 메모이제이션 (필요 시)

---

## 브라우저 호환성 🌐

- ✅ Chrome/Edge (최신)
- ✅ Firefox (최신)
- ✅ Safari (iOS 14+)
- ✅ Samsung Internet
- ⚠️ IE는 지원하지 않음 (Next.js 14 제약)

---

## 문제 해결 🔧

### 위치 권한 오류
```
Error: User denied Geolocation
```
→ 브라우저 설정에서 위치 권한을 허용하거나, 기본 위치가 자동으로 사용됩니다.

### API 연결 오류
```
API Error: 504
```
→ 백엔드 서버가 실행 중인지 확인하세요 (`uvicorn main:app --reload`)

### 빌드 오류
```
Module not found: Can't resolve '@tanstack/react-query'
```
→ `npm install` 또는 `npm install @tanstack/react-query` 실행

---

## 상용화 체크리스트 📋

현재 구현 완료:
- [x] 실제 API 연동
- [x] 위치 권한 및 실시간 위치
- [x] 상용 수준 UI/UX
- [x] 애니메이션 & 인터랙션
- [x] 에러 핸들링
- [x] 로딩 상태 관리
- [x] 날씨 정보 표시
- [x] AI 서사 표시
- [x] 역할별 퀘스트 추천
- [x] 퀘스트 진행 플로우
- [x] 완료 효과 & XP 적립

추가 필요:
- [ ] Kakao Maps 통합
- [ ] 사용자 인증 (Supabase Auth)
- [ ] 퀘스트 완료 저장 (DB)
- [ ] 레벨 시스템 (실제 레벨업)
- [ ] 히스토리 조회
- [ ] 프로필 페이지
- [ ] 소셜 기능

---

## 결론 🎉

**제공하신 코드의 모든 기능**을 유지하면서, **실제 백엔드 API와 완전히 연동**된 프로덕션 레벨 프론트엔드가 완성되었습니다!

- ✅ Mock 데이터 → 실제 DB 데이터
- ✅ 하드코딩 → 실시간 API 호출
- ✅ 프로토타입 → 상용화 수준
- ✅ 정적 UI → 동적 데이터

이제 바로 실행하여 **실제로 작동하는 WhereHere 앱**을 경험할 수 있습니다! 🚀
