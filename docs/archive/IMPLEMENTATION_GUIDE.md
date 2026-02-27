# 카카오맵 스타일 AI 추천 시스템 구현 가이드

## 📋 목차
1. [카카오맵 AI 시스템 분석](#1-카카오맵-ai-시스템-분석)
2. [WhereHere 적용 방안](#2-wherehere-적용-방안)
3. [단계별 구현 계획](#3-단계별-구현-계획)
4. [현재 상태 및 다음 단계](#4-현재-상태-및-다음-단계)

---

## 1. 카카오맵 AI 시스템 분석

### 1.1 Kakao AI (Kanana) 작동 원리

#### A. 데이터 수집 레이어
```
사용자 행동 데이터:
├─ 검색 기록: 어떤 장소를 찾았는가
├─ 방문 기록: 실제로 어디를 갔는가 (위치 기반)
├─ 체류 시간: 얼마나 머물렀는가
├─ 평가 데이터: 리뷰, 별점, 저장
├─ 시간 패턴: 선호 시간대, 요일
└─ 동행자: 혼자, 친구, 연인, 가족
```

#### B. AI 추천 알고리즘 구조

```python
# 카카오맵 스타일 하이브리드 추천 시스템 (추정)

class KakaoRecommendationEngine:
    """
    4가지 추천 방식을 결합한 하이브리드 시스템
    """
    
    def recommend(self, user_id, context):
        # 1. 협업 필터링 (Collaborative Filtering) - 40%
        #    "나와 비슷한 사람들이 좋아한 장소"
        similar_users = self.find_similar_users(user_id)
        cf_score = self.calculate_cf_score(similar_users)
        
        # 2. 콘텐츠 기반 필터링 (Content-based) - 30%
        #    "내가 좋아했던 장소와 비슷한 특성"
        user_preferences = self.extract_user_features(user_id)
        cb_score = self.calculate_cb_score(user_preferences)
        
        # 3. 컨텍스트 기반 (Context-aware) - 20%
        #    "지금 이 상황에 맞는 장소"
        context_score = self.calculate_context_score(
            time=context.time,           # 현재 시간
            weather=context.weather,     # 날씨
            location=context.location,   # 현재 위치
            companions=context.companions # 동행자
        )
        
        # 4. 인기도 기반 (Popularity) - 10%
        #    "많은 사람들이 좋아하는 장소"
        popularity_score = self.calculate_popularity()
        
        # 최종 스코어 계산
        final_score = (
            0.4 * cf_score +
            0.3 * cb_score +
            0.2 * context_score +
            0.1 * popularity_score
        )
        
        return self.rank_by_score(final_score)
```

### 1.2 대화형 AI ("발견" 기능) 구조

#### A. 자연어 이해 (NLU) 파이프라인

```python
# 사용자 입력 → 구조화된 의도

user_input = "오늘 데이트하기 좋은 조용한 카페 추천해줘"

# Step 1: 의도 파악 (Intent Recognition)
intent = NLUParser.parse(user_input)
# {
#   "action": "recommend",
#   "category": "cafe",
#   "purpose": "date",
#   "atmosphere": ["quiet", "romantic"],
#   "time": "today",
#   "party_size": 2
# }

# Step 2: 슬롯 채우기 (Slot Filling)
if intent.missing_slots:
    return "몇 시쯤 가실 예정이세요?"

# Step 3: 추천 생성
recommendations = RecommendationEngine.find(
    category="cafe",
    vibe_tags=["romantic", "quiet", "cozy"],
    price_tier="medium-high",
    time_slot="afternoon",
    party_size=2,
    location=user.current_location
)

# Step 4: 자연어 응답 생성 (NLG)
response = f"""
{user.name}님께 딱 맞는 데이트 카페를 찾았어요! 🌹

**1. 연남동 책방 카페** (매치도 94%)
📍 서울 마포구 연남동
💬 조용한 분위기에 창가 자리가 예쁜 곳이에요.
⏱️ 평균 체류 1시간 30분 - 여유롭게 대화하기 좋아요.
💰 1인당 12,000원 내외

**2. 성수 루프탑 카페** (매치도 89%)
📍 서울 성동구 성수동
💬 석양 무렵 방문하면 분위기가 정말 좋아요.
⏱️ {user.name}님이 좋아하시는 감성적인 공간이에요.
💰 1인당 15,000원 내외

어떤 곳이 마음에 드시나요?
"""
```

#### B. 대화 상태 관리 (Conversation Management)

```python
class ConversationManager:
    """
    대화 흐름을 관리하고 컨텍스트를 유지
    """
    
    def __init__(self):
        self.state = "initial"
        self.context = {}  # 대화 맥락 저장
        self.history = []  # 대화 기록
    
    def handle_message(self, user_message):
        # 1. 의도 파악
        intent = self.parse_intent(user_message)
        
        # 2. 상태별 처리
        if self.state == "initial":
            # 첫 요청 처리
            if intent.is_complete:
                recommendations = self.generate_recommendations(intent)
                self.state = "showing_recommendations"
                return recommendations
            else:
                # 부족한 정보 확인
                return self.ask_clarification(intent.missing_info)
        
        elif self.state == "showing_recommendations":
            # 추천 결과에 대한 피드백 처리
            if "좋아" in user_message or "가고싶어" in user_message:
                selected = self.identify_selected_place(user_message)
                return self.provide_details(selected)
            
            elif "다른 곳" in user_message or "더 보여줘" in user_message:
                return self.show_alternatives()
            
            elif "비슷한" in user_message:
                return self.find_similar_places()
        
        elif self.state == "showing_details":
            # 상세 정보 제공 후
            if "예약" in user_message:
                return self.help_reservation()
            elif "길 안내" in user_message:
                return self.provide_navigation()
    
    def update_context(self, key, value):
        """대화 맥락 업데이트"""
        self.context[key] = value
        self.history.append({"key": key, "value": value})
```

---

## 2. WhereHere 적용 방안

### 2.1 기본 AI 추천 시스템 (Phase 1)

#### A. 사용자 행동 추적 강화

```python
# backend/services/user_behavior_tracker.py

from datetime import datetime
from typing import Dict, Any

class UserBehaviorTracker:
    """
    사용자 행동을 추적하고 프로필을 실시간 업데이트
    """
    
    async def track_visit(
        self,
        user_id: str,
        place_id: str,
        data: Dict[str, Any]
    ):
        """방문 기록 + 행동 패턴 저장"""
        
        # 1. 방문 데이터 저장
        visit_data = {
            "user_id": user_id,
            "place_id": place_id,
            "visited_at": datetime.now(),
            "duration_minutes": data.get("duration"),
            "rating": data.get("rating"),
            "mood": data.get("mood"),
            "companions": data.get("companions"),  # 혼자/친구/연인/가족
            "weather": data.get("weather"),
            "time_of_day": self._get_time_slot(datetime.now()),
            "day_of_week": datetime.now().strftime("%A"),
        }
        
        await self.db.insert_visit(visit_data)
        
        # 2. 실시간 프로필 업데이트
        await self.update_user_profile(user_id, visit_data)
    
    async def update_user_profile(
        self,
        user_id: str,
        visit: Dict[str, Any]
    ):
        """방문할 때마다 프로필 실시간 업데이트"""
        
        profile = await self.db.get_user_profile(user_id)
        
        # 카테고리 선호도 업데이트
        category = visit.get("category", "기타")
        profile["category_preferences"][category] = \
            profile["category_preferences"].get(category, 0) + 1
        
        # 시간대 선호도 업데이트
        time_slot = visit["time_of_day"]
        profile["time_preferences"][time_slot] = \
            profile["time_preferences"].get(time_slot, 0) + 1
        
        # 평균 체류 시간 업데이트 (이동 평균)
        total_visits = profile["total_visits"]
        current_avg = profile["avg_duration"]
        new_duration = visit["duration_minutes"]
        profile["avg_duration"] = (
            (current_avg * total_visits + new_duration) / (total_visits + 1)
        )
        
        # 평균 예산 업데이트
        if visit.get("cost"):
            current_avg_budget = profile["avg_budget"]
            new_cost = visit["cost"]
            profile["avg_budget"] = (
                (current_avg_budget * total_visits + new_cost) / (total_visits + 1)
            )
        
        # 방문 횟수 증가
        profile["total_visits"] += 1
        
        await self.db.update_user_profile(user_id, profile)
    
    def _get_time_slot(self, dt: datetime) -> str:
        """시간대 분류"""
        hour = dt.hour
        if 6 <= hour < 11:
            return "morning"
        elif 11 <= hour < 14:
            return "lunch"
        elif 14 <= hour < 18:
            return "afternoon"
        elif 18 <= hour < 22:
            return "evening"
        else:
            return "night"
```

#### B. 하이브리드 추천 엔진

```python
# backend/services/hybrid_recommender.py

class HybridRecommendationEngine:
    """
    카카오맵 스타일 하이브리드 추천 시스템
    """
    
    async def get_recommendations(
        self,
        user_id: str,
        location: Dict[str, float],  # {lat, lng}
        context: Dict[str, Any],      # {time, weather, companions}
        limit: int = 10
    ):
        """
        메인 추천 함수
        """
        
        # 1. 사용자 프로필 및 히스토리 로드
        profile = await self.db.get_user_profile(user_id)
        history = await self.db.get_user_visits(user_id, days=90)
        
        # 2. 후보 장소 가져오기 (위치 기반)
        candidates = await self.db.get_places_nearby(
            lat=location["lat"],
            lng=location["lng"],
            radius=3000  # 3km
        )
        
        # 3. 각 장소에 대해 다중 스코어링
        scored_places = []
        for place in candidates:
            score = await self._calculate_hybrid_score(
                place=place,
                profile=profile,
                history=history,
                context=context
            )
            scored_places.append((place, score))
        
        # 4. 스코어 순으로 정렬
        scored_places.sort(key=lambda x: x[1], reverse=True)
        top_places = scored_places[:limit]
        
        # 5. Claude API로 개인화된 설명 생성
        recommendations = await self._generate_narratives(
            places=top_places,
            profile=profile,
            context=context
        )
        
        return recommendations
    
    async def _calculate_hybrid_score(
        self,
        place: Dict,
        profile: Dict,
        history: List[Dict],
        context: Dict
    ) -> float:
        """
        하이브리드 스코어 계산
        """
        
        # A. 콘텐츠 기반 스코어 (40%)
        content_score = self._content_based_score(place, profile)
        
        # B. 협업 필터링 스코어 (30%)
        collaborative_score = await self._collaborative_score(
            place, profile, history
        )
        
        # C. 컨텍스트 스코어 (20%)
        context_score = self._context_score(place, context)
        
        # D. 인기도 스코어 (10%)
        popularity_score = place.get("average_rating", 0) / 5.0
        
        # 최종 스코어
        final_score = (
            0.4 * content_score +
            0.3 * collaborative_score +
            0.2 * context_score +
            0.1 * popularity_score
        )
        
        return final_score
    
    def _content_based_score(
        self,
        place: Dict,
        profile: Dict
    ) -> float:
        """
        콘텐츠 기반 스코어링
        사용자가 과거에 좋아했던 장소의 특성과 비교
        """
        score = 0.0
        
        # 1. 카테고리 매칭 (50%)
        place_category = place.get("primary_category")
        favorite_categories = profile.get("favorite_categories", [])
        
        if place_category in favorite_categories:
            # 선호도 순위에 따라 차등 점수
            rank = favorite_categories.index(place_category) + 1
            score += 0.5 * (1.0 / rank)
        
        # 2. Vibe 태그 매칭 (30%)
        place_vibes = set(place.get("vibe_tags", []))
        user_vibes = set(profile.get("favorite_vibes", []))
        
        if user_vibes:
            vibe_match_ratio = len(place_vibes & user_vibes) / len(user_vibes)
            score += 0.3 * vibe_match_ratio
        
        # 3. 가격대 매칭 (20%)
        place_price = place.get("average_price", 0)
        user_avg_budget = profile.get("avg_budget", 10000)
        
        price_diff = abs(place_price - user_avg_budget)
        if price_diff < 5000:
            score += 0.2 * (1.0 - price_diff / 5000)
        
        return min(score, 1.0)
    
    async def _collaborative_score(
        self,
        place: Dict,
        profile: Dict,
        history: List[Dict]
    ) -> float:
        """
        협업 필터링 스코어
        나와 비슷한 사용자들이 이 장소를 좋아했는지
        """
        
        # 1. 비슷한 사용자 찾기 (코사인 유사도)
        similar_users = await self.db.find_similar_users(
            user_profile=profile,
            top_k=50
        )
        
        if not similar_users:
            return 0.5  # 중립
        
        # 2. 비슷한 사용자들의 이 장소에 대한 평가
        ratings = await self.db.get_place_ratings(
            place_id=place["id"],
            user_ids=[u["id"] for u in similar_users]
        )
        
        if not ratings:
            return 0.5  # 중립
        
        # 3. 가중 평균 (유사도가 높은 사용자의 평가에 더 큰 가중치)
        weighted_sum = 0.0
        weight_sum = 0.0
        
        for rating in ratings:
            similarity = rating["user_similarity"]
            rating_value = rating["rating"] / 5.0
            weighted_sum += similarity * rating_value
            weight_sum += similarity
        
        return weighted_sum / weight_sum if weight_sum > 0 else 0.5
    
    def _context_score(
        self,
        place: Dict,
        context: Dict
    ) -> float:
        """
        컨텍스트 기반 스코어
        현재 상황 (시간, 날씨, 동행자)에 맞는지
        """
        score = 0.0
        
        # 1. 시간대 적합성 (40%)
        time_slot = self._get_time_slot(context.get("time"))
        best_time_slots = place.get("best_time_slots", [])
        
        if time_slot in best_time_slots:
            score += 0.4
        
        # 2. 날씨 적합성 (30%)
        weather = context.get("weather", "")
        place_vibes = place.get("vibe_tags", [])
        
        if weather == "rainy" and "indoor" in place_vibes:
            score += 0.3
        elif weather == "sunny" and "outdoor" in place_vibes:
            score += 0.3
        elif weather == "cloudy":
            score += 0.15  # 중립
        
        # 3. 동행자 적합성 (30%)
        companions = context.get("companions", "alone")
        
        if companions == "date" and "romantic" in place_vibes:
            score += 0.3
        elif companions == "friends" and "social" in place_vibes:
            score += 0.3
        elif companions == "family" and "family-friendly" in place_vibes:
            score += 0.3
        elif companions == "alone" and "quiet" in place_vibes:
            score += 0.3
        
        return min(score, 1.0)
    
    async def _generate_narratives(
        self,
        places: List[Tuple[Dict, float]],
        profile: Dict,
        context: Dict
    ) -> List[Dict]:
        """
        Claude API를 사용해 개인화된 추천 이유 생성
        """
        
        recommendations = []
        
        for place, score in places:
            # Claude API 호출
            narrative = await self._call_claude_for_narrative(
                place=place,
                score=score,
                profile=profile,
                context=context
            )
            
            recommendations.append({
                "place_id": place["id"],
                "name": place["name"],
                "address": place["address"],
                "category": place["primary_category"],
                "score": score * 100,  # 0-100 스케일
                "narrative": narrative,
                "vibe_tags": place.get("vibe_tags", []),
                "average_rating": place.get("average_rating", 0),
                "average_price": place.get("average_price"),
            })
        
        return recommendations
    
    async def _call_claude_for_narrative(
        self,
        place: Dict,
        score: float,
        profile: Dict,
        context: Dict
    ) -> str:
        """
        Claude API로 개인화된 추천 이유 생성
        """
        
        prompt = f"""
당신은 WhereHere의 AI 큐레이터입니다.

사용자 정보:
- 선호 카테고리: {profile.get('favorite_categories', [])}
- 선호 분위기: {profile.get('favorite_vibes', [])}
- 평균 예산: {profile.get('avg_budget', 0):,}원
- 최근 방문: {profile.get('recent_places', [])}

추천 장소:
- 이름: {place['name']}
- 카테고리: {place['primary_category']}
- 분위기: {place.get('vibe_tags', [])}
- 평점: {place.get('average_rating', 0)}

현재 상황:
- 시간: {context.get('time')}
- 날씨: {context.get('weather')}
- 동행자: {context.get('companions')}

매치도: {score * 100:.0f}%

위 정보를 바탕으로, 이 장소를 추천하는 이유를 2-3문장으로 작성해주세요.
친근하고 공감하는 톤으로, 사용자의 과거 패턴과 현재 상황을 언급하세요.
"""
        
        response = await self.claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
```

### 2.2 대화형 AI (Phase 2)

#### A. 자연어 처리

```python
# backend/services/conversation_ai.py

import anthropic
from typing import List, Dict, Any

class ConversationAI:
    """
    카카오맵 스타일 대화형 AI
    """
    
    def __init__(self):
        self.claude = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.conversation_states = {}  # 대화 상태 저장
    
    async def chat(
        self,
        user_id: str,
        message: str,
        conversation_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        메인 대화 처리 함수
        """
        
        # 1. 사용자 프로필 및 최근 방문 로드
        profile = await self.db.get_user_profile(user_id)
        recent_visits = await self.db.get_user_visits(user_id, days=30)
        
        # 2. 시스템 프롬프트 생성 (개인화)
        system_prompt = self._build_system_prompt(profile, recent_visits)
        
        # 3. Claude API 호출
        response = await self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            system=system_prompt,
            messages=conversation_history + [
                {"role": "user", "content": message}
            ]
        )
        
        ai_text = response.content[0].text
        
        # 4. 응답에서 의도 파악
        intent = self._parse_intent(ai_text, message)
        
        # 5. 장소 추천이 필요하면 실제 DB 검색
        recommendations = []
        if intent["needs_recommendation"]:
            recommendations = await self._search_and_rank_places(
                intent=intent,
                profile=profile,
                user_id=user_id
            )
            
            # 추천 결과를 자연어로 통합
            ai_text = await self._enhance_with_places(
                ai_text,
                recommendations
            )
        
        return {
            "text": ai_text,
            "recommendations": recommendations,
            "intent": intent,
        }
    
    def _build_system_prompt(
        self,
        profile: Dict,
        recent_visits: List[Dict]
    ) -> str:
        """
        개인화된 시스템 프롬프트 생성
        """
        
        recent_places = ", ".join([
            v["place_name"] for v in recent_visits[:5]
        ])
        
        favorite_categories = ", ".join(
            profile.get("favorite_categories", [])
        )
        
        return f"""당신은 WhereHere의 AI 큐레이터입니다.

**사용자 정보:**
- 이름: {profile.get("name", "사용자")}
- 탐험 스타일: {profile.get("exploration_style", "초보 탐험가")}
- 선호 카테고리: {favorite_categories}
- 최근 방문: {recent_places}
- 평균 예산: {profile.get("avg_budget", 0):,}원
- 총 방문: {profile.get("total_visits", 0)}곳

**역할:**
1. 친근하고 공감하는 대화 스타일 유지
2. 구체적인 장소 추천 (실제 DB 데이터 기반)
3. 사용자의 과거 패턴을 언급하며 개인화
4. 현재 컨텍스트 고려 (시간, 날씨, 기분, 동행자)

**응답 형식:**
- 자연스러운 대화체 사용
- 이모지 적절히 활용 (과하지 않게)
- 추천 시 구체적인 이유 제시
- 사용자 히스토리 자연스럽게 언급

**예시:**
사용자: "오늘 데이트하기 좋은 곳 추천해줘"
AI: "{profile.get('name')}님이 최근에 연남동 책방 카페를 좋아하셨죠? 
     비슷한 감성의 성수 루프탑 카페는 어때요? 
     석양 무렵 방문하면 분위기가 정말 좋아요. 🌅
     평균 체류 시간도 {profile.get('name')}님 스타일인 1시간 30분 정도예요."

**중요:**
- 추천이 필요한 경우, 응답에 [RECOMMEND] 태그를 포함하세요.
- 예: "[RECOMMEND: category=cafe, vibe=romantic, time=evening]"
"""
    
    def _parse_intent(
        self,
        ai_response: str,
        user_message: str
    ) -> Dict[str, Any]:
        """
        AI 응답과 사용자 메시지에서 의도 파악
        """
        
        intent = {
            "needs_recommendation": False,
            "category": None,
            "vibe": [],
            "time": None,
            "companions": None,
        }
        
        # [RECOMMEND] 태그 확인
        if "[RECOMMEND" in ai_response:
            intent["needs_recommendation"] = True
            # 태그에서 파라미터 추출
            # 예: [RECOMMEND: category=cafe, vibe=romantic, time=evening]
            # ... 파싱 로직 ...
        
        # 키워드 기반 파싱 (fallback)
        recommendation_keywords = ["추천", "찾아줘", "어디", "좋은 곳", "알려줘"]
        if any(kw in user_message for kw in recommendation_keywords):
            intent["needs_recommendation"] = True
        
        # 카테고리 파악
        category_map = {
            "카페": "cafe",
            "맛집": "restaurant",
            "술집": "bar",
            "공원": "park",
            "갤러리": "gallery",
        }
        for kr, en in category_map.items():
            if kr in user_message or kr in ai_response:
                intent["category"] = en
        
        # 분위기 파악
        vibe_keywords = {
            "조용한": "quiet",
            "활기찬": "lively",
            "로맨틱": "romantic",
            "아늑한": "cozy",
            "트렌디": "trendy",
        }
        for kr, en in vibe_keywords.items():
            if kr in user_message:
                intent["vibe"].append(en)
        
        # 동행자 파악
        if "데이트" in user_message or "연인" in user_message:
            intent["companions"] = "date"
        elif "친구" in user_message:
            intent["companions"] = "friends"
        elif "가족" in user_message:
            intent["companions"] = "family"
        elif "혼자" in user_message:
            intent["companions"] = "alone"
        
        return intent
    
    async def _search_and_rank_places(
        self,
        intent: Dict,
        profile: Dict,
        user_id: str
    ) -> List[Dict]:
        """
        의도에 맞는 장소 검색 및 랭킹
        """
        
        # 하이브리드 추천 엔진 사용
        recommender = HybridRecommendationEngine()
        
        # 현재 위치 (프로필에서 또는 기본값)
        location = profile.get("last_location", {
            "lat": 37.5665,
            "lng": 126.9780
        })
        
        # 컨텍스트 구성
        context = {
            "time": datetime.now(),
            "weather": await self._get_current_weather(location),
            "companions": intent.get("companions", "alone"),
        }
        
        # 추천 생성
        recommendations = await recommender.get_recommendations(
            user_id=user_id,
            location=location,
            context=context,
            limit=3
        )
        
        # 카테고리/vibe 필터링
        if intent.get("category"):
            recommendations = [
                r for r in recommendations
                if r["category"] == intent["category"]
            ]
        
        if intent.get("vibe"):
            recommendations = [
                r for r in recommendations
                if any(v in r["vibe_tags"] for v in intent["vibe"])
            ]
        
        return recommendations[:3]
    
    async def _enhance_with_places(
        self,
        ai_text: str,
        recommendations: List[Dict]
    ) -> str:
        """
        AI 응답에 실제 장소 정보 통합
        """
        
        if not recommendations:
            return ai_text
        
        # [RECOMMEND] 태그를 실제 장소 정보로 대체
        places_text = "\n\n"
        for i, place in enumerate(recommendations, 1):
            places_text += f"""
**{i}. {place['name']}** (매치도 {place['score']:.0f}%)
📍 {place['address']}
💬 {place['narrative']}
💰 {place.get('average_price', 0):,}원 내외
⭐ {place['average_rating']:.1f}/5.0

"""
        
        # [RECOMMEND] 태그 제거 및 장소 정보 추가
        ai_text = ai_text.replace("[RECOMMEND]", "").replace("[RECOMMEND:", "").split("]")[0] if "[RECOMMEND" in ai_text else ai_text
        ai_text += places_text
        
        return ai_text
```

#### B. 프론트엔드 대화형 UI

```typescript
// frontend-app/components/ai-chat-interface.tsx

'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  timestamp: Date;
}

export function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 어떤 장소를 찾으시나요? 😊',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    try {
      // AI 응답 요청
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });
      
      const data = await response.json();
      
      // AI 메시지 추가
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        recommendations: data.recommendations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송해요, 일시적인 오류가 발생했어요. 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#0A0E14]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D1117] to-[#161B22] p-4 border-b border-white/5">
        <h1 className="text-xl font-bold text-white">AI 큐레이터</h1>
        <p className="text-sm text-white/50">무엇을 도와드릴까요?</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user'
                ? 'bg-[#E8740C] text-white'
                : 'bg-white/5 text-white'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {/* 추천 장소 카드 */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-4 space-y-3">
                  {msg.recommendations.map((place, j) => (
                    <div key={j} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-white">{place.name}</div>
                          <div className="text-xs text-white/50">{place.address}</div>
                        </div>
                        <div className="text-[#E8740C] font-bold text-sm">
                          {place.score}%
                        </div>
                      </div>
                      <div className="text-sm text-white/70 mb-2">{place.narrative}</div>
                      <div className="flex gap-2 flex-wrap">
                        {place.vibe_tags?.map((tag: string, k: number) => (
                          <span key={k} className="text-xs px-2 py-1 bg-white/5 rounded-full text-white/60">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-white/30 mt-2">
                {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 bg-[#0D1117] border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="어떤 장소를 찾으시나요?"
            className="flex-1 bg-white/5 text-white rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8740C]"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="bg-[#E8740C] text-white rounded-full px-6 py-3 font-bold disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. 단계별 구현 계획

### Phase 1: 기본 AI 추천 (2주)

#### Week 1: 데이터 수집 및 프로필 시스템
- [ ] `UserBehaviorTracker` 구현
- [ ] 방문 기록 자동 추적
- [ ] 실시간 프로필 업데이트
- [ ] 사용자 유사도 계산 함수

#### Week 2: 하이브리드 추천 엔진
- [ ] `HybridRecommendationEngine` 구현
- [ ] 콘텐츠 기반 필터링
- [ ] 협업 필터링
- [ ] 컨텍스트 기반 스코어링
- [ ] Claude API 통합 (narrative 생성)

### Phase 2: 대화형 AI (2주)

#### Week 3: 대화 시스템 백엔드
- [ ] `ConversationAI` 구현
- [ ] 의도 파악 (Intent Recognition)
- [ ] 대화 상태 관리
- [ ] 추천 통합

#### Week 4: 대화형 UI
- [ ] `AIChatInterface` 컴포넌트
- [ ] 실시간 메시지 스트리밍
- [ ] 추천 카드 UI
- [ ] 피드백 수집

### Phase 3: 고도화 (2주)

#### Week 5: 성능 최적화
- [ ] 추천 캐싱
- [ ] 배치 처리
- [ ] 인덱싱 최적화

#### Week 6: A/B 테스팅 및 개선
- [ ] 추천 정확도 측정
- [ ] 사용자 피드백 수집
- [ ] 알고리즘 튜닝

---

## 4. 현재 상태 및 다음 단계

### 현재 완료된 것
✅ 기본 추천 API (`/api/v1/recommendations`)
✅ Supabase REST API 연동
✅ 프론트엔드 UI (지도, 통계, 스타일, 타임라인)
✅ Mock 데이터 기반 동작

### 즉시 해야 할 일 (우선순위 순)

#### 1순위: 장소 데이터 대폭 확충 (1주일)
```python
# scripts/collect_places.py
# Kakao Local API로 실제 장소 데이터 수집

import httpx
import asyncio

async def collect_seoul_places():
    """서울 주요 지역의 장소 데이터 수집"""
    
    regions = [
        "강남구", "서초구", "송파구", "강동구",
        "마포구", "서대문구", "은평구", "종로구",
        "중구", "용산구", "성동구", "광진구",
        "동대문구", "중랑구", "성북구", "강북구",
        "도봉구", "노원구", "영등포구", "동작구",
        "관악구", "금천구", "구로구", "양천구", "강서구"
    ]
    
    categories = [
        "카페", "음식점", "술집", "공원",
        "갤러리", "박물관", "서점"
    ]
    
    all_places = []
    
    for region in regions:
        for category in categories:
            places = await search_kakao_places(
                query=f"{region} {category}",
                category_group_code=get_category_code(category)
            )
            all_places.extend(places)
    
    # Supabase에 저장
    await save_to_supabase(all_places)
    
    print(f"총 {len(all_places)}개 장소 수집 완료")

# 실행
asyncio.run(collect_seoul_places())
```

**목표: 최소 500-1000개 실제 장소 데이터**

#### 2순위: 하이브리드 추천 엔진 구현 (1주일)
- `HybridRecommendationEngine` 클래스 구현
- 기존 `/api/v1/recommendations` 엔드포인트에 통합
- 스코어링 로직 테스트

#### 3순위: 사용자 행동 추적 (3일)
- `UserBehaviorTracker` 구현
- 방문 기록 API 수정
- 프로필 자동 업데이트

#### 4순위: 대화형 AI (1주일)
- `ConversationAI` 구현
- `/api/v1/ai/chat` 엔드포인트
- 프론트엔드 채팅 UI

---

## 5. 참고 자료

### API 문서
- [Kakao Local API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Supabase PostgREST](https://postgrest.org/en/stable/)

### 추천 시스템 논문
- "Hybrid Recommender Systems: Survey and Experiments" (Burke, 2002)
- "Context-Aware Recommender Systems" (Adomavicius & Tuzhilin, 2011)
- "Deep Learning based Recommender System: A Survey" (Zhang et al., 2019)

### 구현 예제
- [Surprise (Python 추천 시스템 라이브러리)](https://surpriselib.com/)
- [LightFM (하이브리드 추천)](https://github.com/lyst/lightfm)
