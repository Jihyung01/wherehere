# 카카오맵 AI 추천 시스템 분석 및 WhereHere 적용 방안

## 📌 핵심 요약

### 카카오맵 AI 시스템의 핵심
1. **하이브리드 추천 엔진**: 협업 필터링(40%) + 콘텐츠 기반(30%) + 컨텍스트(20%) + 인기도(10%)
2. **대화형 AI**: 자연어 이해 → 의도 파악 → 실시간 추천 → 자연어 응답
3. **실시간 프로필 업데이트**: 방문할 때마다 사용자 선호도 자동 학습

### WhereHere 구현 전략
1. **Phase 1 (2주)**: 하이브리드 추천 엔진 구현
2. **Phase 2 (2주)**: 대화형 AI 구현
3. **Phase 3 (2주)**: 성능 최적화 및 A/B 테스팅

---

## 🎯 카카오맵 AI 시스템 작동 원리

### 1. 데이터 수집 레이어

```
사용자 행동 데이터:
├─ 검색 기록: "연남동 카페", "데이트 장소" 등
├─ 방문 기록: GPS 기반 실제 방문 확인
├─ 체류 시간: 얼마나 오래 머물렀는가
├─ 평가: 별점, 리뷰, 저장, 공유
├─ 시간 패턴: 주로 언제 방문하는가
└─ 동행자: 혼자, 친구, 연인, 가족
```

### 2. AI 추천 알고리즘 (4가지 방식 결합)

#### A. 협업 필터링 (Collaborative Filtering) - 40%
```
"나와 비슷한 사람들이 좋아한 장소"

예시:
- 사용자 A: 연남동 책방 카페 ⭐⭐⭐⭐⭐
- 사용자 B: 연남동 책방 카페 ⭐⭐⭐⭐⭐
- 사용자 B: 성수 루프탑 카페 ⭐⭐⭐⭐⭐
→ 사용자 A에게 성수 루프탑 카페 추천
```

#### B. 콘텐츠 기반 필터링 (Content-based) - 30%
```
"내가 좋아했던 장소와 비슷한 특성"

예시:
- 과거 방문: 조용한 카페, 북카페, 갤러리 카페
- 공통 특성: ["cozy", "quiet", "artistic"]
→ 비슷한 vibe를 가진 새로운 카페 추천
```

#### C. 컨텍스트 기반 (Context-aware) - 20%
```
"지금 이 상황에 맞는 장소"

예시:
- 시간: 오후 6시 (저녁)
- 날씨: 비 오는 날
- 동행자: 연인
→ 실내, 로맨틱, 저녁 식사 가능한 장소 추천
```

#### D. 인기도 기반 (Popularity) - 10%
```
"많은 사람들이 좋아하는 장소"

예시:
- 평균 별점 4.8/5.0
- 리뷰 수 1,234개
- 저장 수 5,678회
→ 검증된 인기 장소
```

### 3. 대화형 AI ("발견" 기능)

#### 대화 흐름 예시
```
사용자: "오늘 데이트하기 좋은 조용한 카페 추천해줘"

[Step 1] 의도 파악 (NLU)
{
  "action": "recommend",
  "category": "cafe",
  "purpose": "date",
  "atmosphere": ["quiet", "romantic"],
  "time": "today"
}

[Step 2] 부족한 정보 확인
AI: "몇 시쯤 가실 예정이세요?"
사용자: "저녁 6시쯤"

[Step 3] 실시간 추천 생성
- 하이브리드 엔진으로 장소 검색
- 스코어링 및 랭킹
- 상위 3개 선택

[Step 4] 자연어 응답 생성
AI: "민수님께 딱 맞는 데이트 카페를 찾았어요! 🌹

**1. 연남동 책방 카페** (매치도 94%)
📍 서울 마포구 연남동
💬 조용한 분위기에 창가 자리가 예쁜 곳이에요.
   민수님이 지난주에 좋아하셨던 삼청동 갤러리 카페와
   비슷한 감성이에요.
⏱️ 평균 체류 1시간 30분 - 여유롭게 대화하기 좋아요.
💰 1인당 12,000원 내외

어떤 곳이 마음에 드시나요?"
```

---

## 🚀 WhereHere 적용 방안

### 현재 상태
✅ 기본 추천 API 있음 (mock 데이터)
✅ Supabase REST API 연동 완료
✅ 프론트엔드 UI 구현 완료
❌ AI 추천 알고리즘 없음 (랜덤 선택)
❌ 대화형 AI 없음

### 구현 계획

#### Phase 1: 하이브리드 추천 엔진 (2주)

**Week 1: 데이터 수집 및 프로필 시스템**
```python
# 1. 사용자 행동 추적
class UserBehaviorTracker:
    async def track_visit(user_id, place_id, data):
        # 방문 기록 저장
        # 실시간 프로필 업데이트
        # 선호도 학습

# 2. 사용자 프로필 구조
{
  "user_id": "user-001",
  "favorite_categories": ["카페", "갤러리", "공원"],
  "favorite_vibes": ["cozy", "quiet", "artistic"],
  "time_preferences": {
    "morning": 5,
    "afternoon": 15,  # 가장 선호
    "evening": 8
  },
  "avg_duration": 72,  # 분
  "avg_budget": 12000,  # 원
  "total_visits": 32
}
```

**Week 2: 추천 엔진 구현**
```python
# 하이브리드 추천 엔진
class HybridRecommendationEngine:
    async def get_recommendations(user_id, location, context):
        # 1. 후보 장소 가져오기
        candidates = await db.get_places_nearby(location, radius=3000)
        
        # 2. 각 장소 스코어링
        for place in candidates:
            score = (
                0.4 * collaborative_score(place) +
                0.3 * content_based_score(place) +
                0.2 * context_score(place) +
                0.1 * popularity_score(place)
            )
        
        # 3. 상위 N개 선택
        top_places = sort_by_score(candidates)[:10]
        
        # 4. Claude API로 개인화된 설명 생성
        for place in top_places:
            place.narrative = await generate_narrative(place, user_profile)
        
        return top_places
```

#### Phase 2: 대화형 AI (2주)

**Week 3: 대화 시스템 백엔드**
```python
# 대화형 AI
class ConversationAI:
    async def chat(user_id, message, history):
        # 1. 사용자 프로필 로드
        profile = await db.get_user_profile(user_id)
        
        # 2. Claude API 호출 (개인화된 프롬프트)
        response = await claude.messages.create(
            system=build_personalized_prompt(profile),
            messages=history + [{"role": "user", "content": message}]
        )
        
        # 3. 의도 파악
        intent = parse_intent(response.text)
        
        # 4. 추천 필요 시 실제 장소 검색
        if intent.needs_recommendation:
            places = await search_places(intent, profile)
            response = enhance_with_places(response, places)
        
        return response

# API 엔드포인트
@router.post("/api/v1/ai/chat")
async def chat_with_ai(message, history):
    return await conversation_ai.chat(user_id, message, history)
```

**Week 4: 대화형 UI**
```typescript
// 프론트엔드 채팅 인터페이스
function AIChatInterface() {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (text) => {
    // 사용자 메시지 추가
    setMessages([...messages, { role: 'user', content: text }]);
    
    // AI 응답 요청
    const response = await fetch('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text, history: messages })
    });
    
    const data = await response.json();
    
    // AI 메시지 + 추천 장소 카드 추가
    setMessages([...messages, {
      role: 'assistant',
      content: data.text,
      recommendations: data.places
    }]);
  };
  
  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

#### Phase 3: 고도화 (2주)

**Week 5: 성능 최적화**
- 추천 결과 캐싱 (Redis)
- 배치 처리로 DB 쿼리 최적화
- 인덱싱 최적화

**Week 6: A/B 테스팅**
- 추천 정확도 측정 (CTR, 방문율)
- 사용자 피드백 수집
- 알고리즘 가중치 튜닝

---

## 📊 구현 우선순위

### 🔥 즉시 해야 할 일

#### 1순위: 장소 데이터 대폭 확충 (1주일)
```python
# Kakao Local API로 실제 장소 수집
regions = ["강남구", "마포구", "성동구", ...]  # 25개 구
categories = ["카페", "맛집", "술집", "공원", ...]  # 7개 카테고리

# 목표: 서울 전역 500-1000개 실제 장소
for region in regions:
    for category in categories:
        places = await kakao_api.search(f"{region} {category}")
        await supabase.insert(places)
```

**왜 중요한가?**
- 현재 mock 데이터로는 실제 추천 불가능
- AI가 추천할 실제 장소가 있어야 함
- 데이터 없으면 아무것도 안 됨

#### 2순위: 하이브리드 추천 엔진 (1주일)
```python
# backend/services/hybrid_recommender.py 구현
# 기존 /api/v1/recommendations 엔드포인트에 통합
```

#### 3순위: 사용자 행동 추적 (3일)
```python
# backend/services/user_behavior_tracker.py 구현
# 방문 기록 API 수정하여 자동 프로필 업데이트
```

#### 4순위: 대화형 AI (1주일)
```python
# backend/services/conversation_ai.py 구현
# /api/v1/ai/chat 엔드포인트 추가
# 프론트엔드 채팅 UI 구현
```

---

## 🎨 UI/UX 개선 사항

### 현재 구현된 것 (지도 탭)
✅ 방문 기록 시각화 (Canvas 기반 지도)
✅ 통계 대시보드 (카테고리 분포, 주간 활동)
✅ 스타일 분석 (탐험 스타일, AI 추천)
✅ 타임라인 (방문 히스토리)

### 추가할 것
1. **AI 채팅 탭** - 대화형 추천
2. **발견 탭** - 실시간 주변 장소 추천
3. **알림** - 근처에 추천 장소가 있을 때 푸시

---

## 💡 핵심 차별화 포인트

### 카카오맵 vs WhereHere

| 기능 | 카카오맵 | WhereHere |
|------|---------|-----------|
| 추천 방식 | 검색 기반 | AI 큐레이션 |
| 개인화 | 제한적 | 강력한 프로필 학습 |
| 게임화 | 없음 | XP, 뱃지, 챌린지 |
| 소셜 | 리뷰 중심 | 모임, 매칭 |
| 탐험 유도 | 약함 | 강함 (미션, 보상) |

### WhereHere만의 강점
1. **게임화된 탐험**: XP, 레벨, 뱃지로 동기 부여
2. **AI 동행자**: 개인화된 대화형 추천
3. **소셜 탐험**: 비슷한 취향의 사람들과 모임
4. **히든 젬 발굴**: 숨은 명소 발견 시 보상

---

## 📝 다음 단계 체크리스트

### 이번 주 (Week 1)
- [ ] Kakao Local API 스크립트 작성
- [ ] 서울 25개 구 × 7개 카테고리 데이터 수집
- [ ] Supabase에 500개 이상 장소 저장
- [ ] `UserBehaviorTracker` 클래스 구현
- [ ] 방문 기록 API 수정

### 다음 주 (Week 2)
- [ ] `HybridRecommendationEngine` 구현
- [ ] 콘텐츠 기반 필터링 로직
- [ ] 협업 필터링 로직
- [ ] 컨텍스트 기반 스코어링
- [ ] Claude API 통합 (narrative 생성)
- [ ] 기존 추천 API에 통합

### 3주차 (Week 3)
- [ ] `ConversationAI` 클래스 구현
- [ ] 의도 파악 로직
- [ ] 대화 상태 관리
- [ ] `/api/v1/ai/chat` 엔드포인트

### 4주차 (Week 4)
- [ ] 프론트엔드 채팅 UI
- [ ] 실시간 메시지 스트리밍
- [ ] 추천 카드 UI
- [ ] 피드백 수집

---

## 🔗 참고 자료

### API 문서
- [Kakao Local API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Supabase PostgREST](https://postgrest.org/en/stable/)

### 구현 가이드
- `KAKAO_AI_ANALYSIS.md` - 상세 분석
- `IMPLEMENTATION_GUIDE.md` - 구현 가이드
- `NEXT_STEPS_ROADMAP.md` - 전체 로드맵

---

## ✅ 현재 완료된 작업

### 백엔드
✅ Supabase REST API 연동
✅ 실제 DB 연결 (Real data mode)
✅ 추천 API 기본 구조
✅ AI 기능 API 에러 처리 개선
✅ 챌린지 API 에러 처리 개선

### 프론트엔드
✅ 지도 탭 UI 구현 (`/my-map`)
✅ Canvas 기반 방문 경로 시각화
✅ 통계 대시보드 (도넛 차트, 주간 활동)
✅ 스타일 분석 UI
✅ 타임라인 UI

### 문서화
✅ DB 연결 상태 문서 (`DB_CONNECTION_STATUS.md`)
✅ 알려진 이슈 문서 (`KNOWN_ISSUES.md`)
✅ 다음 단계 로드맵 (`NEXT_STEPS_ROADMAP.md`)
✅ 카카오맵 AI 분석 (`KAKAO_AI_ANALYSIS.md`)
✅ 구현 가이드 (`IMPLEMENTATION_GUIDE.md`)
✅ 요약 문서 (이 파일)

---

## 🎯 최종 목표

**"카카오맵보다 더 똑똑하고, 더 재미있는 장소 탐험 앱"**

- AI가 나를 이해하고 딱 맞는 장소를 추천
- 탐험할수록 더 정확한 추천
- 게임처럼 재미있는 탐험 경험
- 비슷한 취향의 사람들과 연결
