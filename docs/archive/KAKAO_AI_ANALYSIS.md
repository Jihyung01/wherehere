# 카카오맵 AI 추천 시스템 분석 및 WhereHere 적용 방안

## 🔍 카카오맵 "발견" 기능 분석

### 1. Kakao AI (Kanana) 작동 방식

#### A. 데이터 수집
```
사용자 행동 데이터:
- 검색 기록 (어떤 장소를 찾았는가)
- 방문 기록 (실제로 어디를 갔는가)
- 체류 시간 (얼마나 머물렀는가)
- 리뷰/별점 (어떻게 평가했는가)
- 시간대/요일 패턴
- 이동 경로
```

#### B. AI 추천 알고리즘
```python
# 카카오맵 스타일 추천 시스템 (추정)

class KakaoAIRecommendation:
    def recommend(self, user_id, context):
        # 1. 사용자 프로필 분석
        user_profile = self.analyze_user_behavior(user_id)
        
        # 2. 협업 필터링 (Collaborative Filtering)
        similar_users = self.find_similar_users(user_profile)
        their_favorites = self.get_favorites(similar_users)
        
        # 3. 콘텐츠 기반 필터링 (Content-based)
        user_preferences = user_profile.extract_features()
        matching_places = self.match_by_features(user_preferences)
        
        # 4. 컨텍스트 고려
        context_score = self.apply_context(
            time=context.time,      # 지금 시간
            weather=context.weather, # 날씨
            location=context.location, # 현재 위치
            companions=context.companions # 동행자
        )
        
        # 5. 하이브리드 스코어링
        final_score = (
            0.4 * collaborative_score +
            0.3 * content_score +
            0.2 * context_score +
            0.1 * popularity_score
        )
        
        return sorted_by_score(final_score)
```

### 2. 대화형 AI 구현 방식

#### A. 자연어 처리 (NLU)
```python
# 사용자 입력 → 의도 파악
user_input = "오늘 데이트하기 좋은 조용한 카페 추천해줘"

# NLU 파싱
intent = {
    "purpose": "date",           # 데이트
    "atmosphere": "quiet",       # 조용한
    "category": "cafe",          # 카페
    "time": "today",            # 오늘
    "companions": 2             # 2명
}

# 추천 생성
recommendations = ai.find_places(
    category="cafe",
    vibe_tags=["romantic", "quiet", "cozy"],
    price_tier="medium-high",
    time_slot="evening",
    party_size=2
)

# 자연어 응답 생성
response = f"""
{user_name}님께 딱 맞는 데이트 카페 3곳을 찾았어요! 🌹

1. **연남동 책방 카페** (매치도 94%)
   조용한 분위기에 창가 자리가 예쁜 곳이에요.
   평균 체류 시간이 1시간 30분으로, 여유롭게 대화하기 좋아요.
   
2. **성수 루프탑 카페** (매치도 89%)
   석양 무렵 방문하면 분위기가 정말 좋아요.
   {user_name}님이 좋아하시는 감성적인 공간이에요.
"""
```

#### B. 대화 흐름 관리
```python
class ConversationManager:
    def __init__(self):
        self.context = {}  # 대화 맥락 저장
        self.state = "initial"
    
    def handle_message(self, user_message):
        # 1. 의도 파악
        intent = self.parse_intent(user_message)
        
        # 2. 부족한 정보 확인
        if intent.missing_info:
            return self.ask_clarification(intent.missing_info)
        
        # 3. 추천 생성
        if intent.is_complete:
            recommendations = self.generate_recommendations(intent)
            self.state = "showing_recommendations"
            return recommendations
        
        # 4. 피드백 처리
        if self.state == "showing_recommendations":
            if "좋아" in user_message:
                return self.provide_details(selected_place)
            elif "다른 곳" in user_message:
                return self.show_alternatives()
```

---

## 🎯 WhereHere에 적용하는 방법

### Phase 1: 기본 AI 추천 (1-2주)

#### 1. 사용자 행동 추적 강화
```python
# backend/services/user_behavior_tracker.py

class UserBehaviorTracker:
    async def track_visit(self, user_id: str, place_id: str, data: dict):
        """방문 기록 + 행동 패턴 저장"""
        
        visit_data = {
            "user_id": user_id,
            "place_id": place_id,
            "visited_at": datetime.now(),
            "duration_minutes": data.get("duration"),
            "rating": data.get("rating"),
            "mood": data.get("mood"),
            "companions": data.get("companions"),  # 혼자/친구/연인
            "weather": data.get("weather"),
            "time_of_day": self._get_time_slot(datetime.now()),
        }
        
        await self.db.insert_visit(visit_data)
        
        # 실시간 프로필 업데이트
        await self.update_user_profile(user_id, visit_data)
    
    async def update_user_profile(self, user_id: str, visit: dict):
        """방문할 때마다 프로필 업데이트"""
        
        profile = await self.db.get_user_profile(user_id)
        
        # 선호 카테고리 업데이트
        profile["category_preferences"][visit["category"]] += 1
        
        # 선호 시간대 업데이트
        profile["time_preferences"][visit["time_of_day"]] += 1
        
        # 평균 체류 시간 업데이트
        profile["avg_duration"] = (
            profile["avg_duration"] * profile["total_visits"] + visit["duration"]
        ) / (profile["total_visits"] + 1)
        
        await self.db.update_user_profile(user_id, profile)
```

#### 2. 하이브리드 추천 엔진
```python
# backend/services/hybrid_recommender.py

class HybridRecommendationEngine:
    """카카오맵 스타일 하이브리드 추천"""
    
    async def get_recommendations(
        self,
        user_id: str,
        location: dict,
        context: dict
    ):
        # 1. 사용자 프로필 로드
        profile = await self.db.get_user_profile(user_id)
        history = await self.db.get_user_visits(user_id, days=90)
        
        # 2. 후보 장소 가져오기
        candidates = await self.db.get_places_nearby(
            location["lat"],
            location["lng"],
            radius=3000
        )
        
        # 3. 다중 스코어링
        scored = []
        for place in candidates:
            score = await self._calculate_hybrid_score(
                place, profile, history, context
            )
            scored.append((place, score))
        
        # 4. 상위 N개 선택
        top_places = sorted(scored, key=lambda x: x[1], reverse=True)[:10]
        
        # 5. Claude API로 개인화된 설명 생성
        recommendations = await self._generate_narratives(
            top_places, profile, context
        )
        
        return recommendations
    
    async def _calculate_hybrid_score(
        self, place, profile, history, context
    ):
        """하이브리드 스코어 계산"""
        
        # A. 콘텐츠 기반 (40%)
        content_score = self._content_based_score(place, profile)
        
        # B. 협업 필터링 (30%)
        collaborative_score = await self._collaborative_score(
            place, profile, history
        )
        
        # C. 컨텍스트 (20%)
        context_score = self._context_score(place, context)
        
        # D. 인기도 (10%)
        popularity_score = place.get("average_rating", 0) / 5.0
        
        final_score = (
            0.4 * content_score +
            0.3 * collaborative_score +
            0.2 * context_score +
            0.1 * popularity_score
        )
        
        return final_score
    
    def _content_based_score(self, place, profile):
        """콘텐츠 기반 스코어링"""
        score = 0.0
        
        # 카테고리 매칭
        if place["category"] in profile["favorite_categories"]:
            score += 0.5
        
        # Vibe 태그 매칭
        place_vibes = set(place.get("vibe_tags", []))
        user_vibes = set(profile.get("favorite_vibes", []))
        vibe_match = len(place_vibes & user_vibes) / max(len(user_vibes), 1)
        score += 0.3 * vibe_match
        
        # 가격대 매칭
        if abs(place["price_tier"] - profile["avg_budget"]) < 5000:
            score += 0.2
        
        return min(score, 1.0)
    
    async def _collaborative_score(self, place, profile, history):
        """협업 필터링 스코어"""
        
        # 비슷한 사용자 찾기
        similar_users = await self.db.find_similar_users(profile)
        
        # 그들이 이 장소를 좋아했는지 확인
        ratings = await self.db.get_place_ratings(
            place["id"],
            user_ids=[u["id"] for u in similar_users]
        )
        
        if not ratings:
            return 0.5  # 중립
        
        avg_rating = sum(r["rating"] for r in ratings) / len(ratings)
        return avg_rating / 5.0
    
    def _context_score(self, place, context):
        """컨텍스트 기반 스코어"""
        score = 0.0
        
        # 시간대 적합성
        time_slot = self._get_time_slot(context["time"])
        if time_slot in place.get("best_time_slots", []):
            score += 0.4
        
        # 날씨 적합성
        if context["weather"] == "rainy" and "indoor" in place["vibe_tags"]:
            score += 0.3
        elif context["weather"] == "sunny" and "outdoor" in place["vibe_tags"]:
            score += 0.3
        
        # 동행자 적합성
        if context.get("companions") == "date" and "romantic" in place["vibe_tags"]:
            score += 0.3
        
        return min(score, 1.0)
```

### Phase 2: 대화형 AI (2-3주)

#### 1. 자연어 처리
```python
# backend/services/conversation_ai.py

class ConversationAI:
    """카카오맵 스타일 대화형 AI"""
    
    def __init__(self):
        self.claude = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def chat(
        self,
        user_id: str,
        message: str,
        conversation_history: list
    ):
        # 1. 사용자 프로필 로드
        profile = await self.db.get_user_profile(user_id)
        recent_visits = await self.db.get_user_visits(user_id, days=30)
        
        # 2. Claude API 호출
        response = await self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            system=self._build_system_prompt(profile, recent_visits),
            messages=conversation_history + [
                {"role": "user", "content": message}
            ]
        )
        
        # 3. 응답에서 의도 파악
        intent = self._parse_intent(response.content[0].text)
        
        # 4. 장소 추천이 필요하면 실제 데이터 검색
        if intent["needs_recommendation"]:
            places = await self._search_places(intent, profile)
            enhanced_response = await self._enhance_with_places(
                response.content[0].text,
                places
            )
            return enhanced_response
        
        return response.content[0].text
    
    def _build_system_prompt(self, profile, recent_visits):
        """개인화된 시스템 프롬프트"""
        
        recent_places = ", ".join([v["place_name"] for v in recent_visits[:5]])
        
        return f"""당신은 WhereHere의 AI 큐레이터입니다.

사용자 정보:
- 이름: {profile["name"]}
- 스타일: {profile["exploration_style"]}
- 선호 카테고리: {profile["favorite_categories"]}
- 최근 방문: {recent_places}
- 평균 예산: {profile["avg_budget"]:,}원

역할:
1. 친근하고 공감하는 대화 스타일
2. 구체적인 장소 추천 (실제 DB에서 검색)
3. 사용자 패턴 기반 개인화
4. 컨텍스트 고려 (시간, 날씨, 기분)

응답 형식:
- 자연스러운 대화체
- 이모지 적절히 사용
- 추천 시 구체적인 이유 제시
- 사용자 히스토리 언급

예시:
사용자: "오늘 데이트하기 좋은 곳 추천해줘"
AI: "{profile['name']}님이 최근에 연남동 책방 카페를 좋아하셨죠? 
     비슷한 감성의 성수 루프탑 카페 어때요? 
     석양 무렵 방문하면 분위기가 정말 좋아요. 🌅
     평균 체류 시간도 {profile['name']}님 스타일인 1시간 30분 정도예요."
"""
    
    def _parse_intent(self, ai_response: str) -> dict:
        """AI 응답에서 의도 파악"""
        
        # 간단한 키워드 기반 파싱
        intent = {
            "needs_recommendation": False,
            "category": None,
            "mood": None,
            "companions": None,
        }
        
        # 추천 요청 감지
        recommendation_keywords = ["추천", "찾아줘", "어디", "좋은 곳"]
        if any(kw in ai_response for kw in recommendation_keywords):
            intent["needs_recommendation"] = True
        
        # 카테고리 파악
        category_map = {
            "카페": "cafe",
            "맛집": "restaurant",
            "술집": "bar",
            "공원": "park",
        }
        for kr, en in category_map.items():
            if kr in ai_response:
                intent["category"] = en
        
        return intent
```

#### 2. 실시간 추천 API
```python
# backend/routes/ai_chat.py

@router.post("/api/v1/ai/chat")
async def chat_with_ai(
    request: ChatRequest,
    user_id: str = Depends(get_current_user)
):
    """대화형 AI 추천"""
    
    conversation_ai = ConversationAI()
    
    # 대화 처리
    response = await conversation_ai.chat(
        user_id=user_id,
        message=request.message,
        conversation_history=request.history
    )
    
    return {
        "response": response["text"],
        "recommendations": response.get("places", []),
        "intent": response.get("intent", {}),
    }
```

### Phase 3: 프론트엔드 통합

#### 1. 대화형 UI
```typescript
// frontend-app/components/ai-chat.tsx

export function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  
  const sendMessage = async () => {
    if (!input.trim()) return
    
    // 사용자 메시지 추가
    const userMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)
    
    // AI 응답 요청
    const response = await fetch("/api/v1/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        history: messages
      })
    })
    
    const data = await response.json()
    
    // AI 메시지 추가
    setMessages(prev => [...prev, {
      role: "assistant",
      content: data.response,
      recommendations: data.recommendations
    }])
    setIsTyping(false)
  }
  
  return (
    <div className="chat-container">
      {/* 메시지 목록 */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            
            {/* 추천 장소 카드 */}
            {msg.recommendations?.map(place => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        ))}
        
        {isTyping && <TypingIndicator />}
      </div>
      
      {/* 입력 */}
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="어떤 곳을 찾으시나요?"
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  )
}
```

---

## 🔧 현재 500 에러 해결

500 에러는 `/api/v1/ai/pattern/analyze` 엔드포인트 문제입니다.
