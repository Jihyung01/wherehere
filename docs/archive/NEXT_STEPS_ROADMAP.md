# WhereHere 다음 단계 로드맵

## 🎯 현재 상태 평가

### ✅ 완료된 것
- Supabase DB 연결 (REST API)
- 기본 장소 추천 시스템
- 프론트엔드/백엔드 통신
- 8가지 AI 기능 UI 구조

### ⚠️ 부족한 것
- **실제 데이터 부족** (15개 장소만 존재)
- **AI 기능 미완성** (UI만 있고 실제 작동 안 함)
- **사용자 경험 미흡** (로그인, 개인화 없음)
- **실제 가치 제공 부족** (차별화된 기능 없음)

---

## 🚀 매력적인 앱이 되기 위한 3단계 전략

## 📍 1단계: 핵심 가치 완성 (1-2주)
**목표**: "이 앱을 왜 써야 하는가?"에 대한 명확한 답 제공

### 1.1 실제 장소 데이터 대폭 확충 ⭐⭐⭐
**현재**: 15개 → **목표**: 500-1,000개 (서울 주요 지역)

**방법**:
```python
# Kakao Local API 자동 수집 스크립트
# backend/scripts/populate_places.py

import asyncio
from services.place_discovery import PlaceDiscoveryService

async def populate_seoul_places():
    service = PlaceDiscoveryService()
    
    # 서울 주요 지역 좌표
    seoul_areas = [
        {"name": "강남", "lat": 37.4979, "lng": 127.0276},
        {"name": "홍대", "lat": 37.5563, "lng": 126.9236},
        {"name": "이태원", "lat": 37.5347, "lng": 126.9945},
        {"name": "명동", "lat": 37.5636, "lng": 126.9826},
        {"name": "성수", "lat": 37.5443, "lng": 127.0557},
        # ... 20개 이상 지역
    ]
    
    categories = ["카페", "맛집", "바", "공원", "박물관", "갤러리", "서점"]
    
    for area in seoul_areas:
        for category in categories:
            places = await service.search_and_add_places(
                latitude=area["lat"],
                longitude=area["lng"],
                keyword=category,
                radius=1000
            )
            print(f"{area['name']} - {category}: {len(places)}개 추가")
```

**우선순위**: 🔴 최우선 (데이터 없으면 앱 의미 없음)

### 1.2 AI 추천 알고리즘 실제 구현 ⭐⭐⭐
**현재**: 랜덤 선택 → **목표**: 실제 개인화 추천

**구현**:
```python
# backend/services/recommendation_engine.py

class RecommendationEngine:
    """실제 AI 기반 추천 엔진"""
    
    async def get_personalized_recommendations(
        self,
        user_id: str,
        location: dict,
        context: dict  # 시간, 날씨, 기분
    ):
        # 1. 사용자 히스토리 분석
        history = await self.db.get_user_visits(user_id, days=90)
        preferences = self._analyze_preferences(history)
        
        # 2. 주변 장소 가져오기
        nearby = await self.db.get_places_nearby(
            location["lat"], 
            location["lng"],
            radius=3000
        )
        
        # 3. 스코어링
        scored = []
        for place in nearby:
            score = self._calculate_score(
                place,
                preferences,
                context,
                history
            )
            scored.append((place, score))
        
        # 4. Claude API로 최종 서사 생성
        top_3 = sorted(scored, key=lambda x: x[1], reverse=True)[:3]
        narratives = await self._generate_ai_narratives(top_3, context)
        
        return self._format_recommendations(top_3, narratives)
    
    def _calculate_score(self, place, preferences, context, history):
        """실제 점수 계산 로직"""
        score = 0.0
        
        # 카테고리 선호도 (40%)
        if place["category"] in preferences["favorite_categories"]:
            score += 40
        
        # 거리 (25%)
        distance_score = max(0, 25 - (place["distance"] / 100))
        score += distance_score
        
        # 시간대 적합성 (15%)
        if self._is_time_appropriate(place, context["time"]):
            score += 15
        
        # 날씨 적합성 (10%)
        if self._is_weather_appropriate(place, context["weather"]):
            score += 10
        
        # 신선도 (10%) - 안 가본 곳 우대
        if place["id"] not in [v["place_id"] for v in history]:
            score += 10
        
        return score
```

**우선순위**: 🔴 최우선

### 1.3 사용자 인증 및 프로필 시스템 ⭐⭐
**현재**: 테스트 사용자 → **목표**: 실제 회원가입/로그인

**구현**:
```typescript
// frontend-app/lib/auth.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const auth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },
  
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },
  
  async signOut() {
    await supabase.auth.signOut()
  },
  
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}
```

**우선순위**: 🟡 중요

---

## 🎨 2단계: 차별화된 경험 제공 (2-3주)
**목표**: "다른 앱과 뭐가 다른가?"

### 2.1 실시간 위치 기반 추천 ⭐⭐⭐
**현재**: 수동 입력 → **목표**: 자동 위치 추적 + 실시간 알림

**구현**:
```typescript
// frontend-app/hooks/useLocationTracking.ts

export function useLocationTracking() {
  const [location, setLocation] = useState<Location | null>(null)
  
  useEffect(() => {
    // 실시간 위치 추적
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setLocation(newLocation)
        
        // 백엔드에 위치 전송
        checkNearbyRecommendations(newLocation)
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
  
  return location
}

async function checkNearbyRecommendations(location: Location) {
  // 주변에 추천할 만한 장소가 있으면 알림
  const nearby = await api.getNearbyRecommendations(location)
  
  if (nearby.length > 0) {
    // 푸시 알림: "근처에 당신이 좋아할 만한 카페가 있어요!"
    showNotification(nearby[0])
  }
}
```

**차별화 포인트**: 
- 구글 지도: 검색 중심
- WhereHere: **AI가 먼저 제안**

**우선순위**: 🔴 최우선

### 2.2 AI 큐레이션 맵 (나만의 서울 지도) ⭐⭐⭐
**목표**: 사용자의 방문 패턴을 시각화하고 AI가 분석

**구현**:
```typescript
// frontend-app/components/ai-curated-map.tsx

export function AICuratedMap({ userId }: { userId: string }) {
  const { data: analysis } = useQuery({
    queryKey: ['pattern-analysis', userId],
    queryFn: () => api.analyzePattern(userId)
  })
  
  return (
    <div className="map-container">
      {/* Kakao Map 또는 Mapbox */}
      <Map center={analysis.center} zoom={12}>
        {/* 방문한 장소 마커 */}
        {analysis.visited_places.map(place => (
          <Marker 
            key={place.id}
            position={place.location}
            icon={getIconByCategory(place.category)}
          />
        ))}
        
        {/* AI가 발견한 패턴 영역 표시 */}
        {analysis.patterns.map(pattern => (
          <Circle
            center={pattern.center}
            radius={pattern.radius}
            fillColor={pattern.color}
            fillOpacity={0.2}
          />
        ))}
      </Map>
      
      {/* AI 분석 결과 */}
      <div className="analysis-panel">
        <h3>{analysis.ai_summary}</h3>
        <p>당신은 주로 <strong>{analysis.favorite_area}</strong>에서 활동하며,
           <strong>{analysis.favorite_category}</strong>를 선호합니다.</p>
        
        {/* 추천 지역 */}
        <div className="recommendations">
          <h4>아직 가보지 않은 비슷한 지역</h4>
          {analysis.similar_areas.map(area => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**차별화 포인트**: 
- 다른 앱: 단순 기록
- WhereHere: **AI가 패턴을 발견하고 새로운 곳 제안**

**우선순위**: 🔴 최우선

### 2.3 소셜 기능 강화 ⭐⭐
**목표**: "혼자 가기 애매한 곳" 해결

**구현**:
```typescript
// 1. 모임 생성
interface Gathering {
  id: string
  creator_id: string
  place_id: string
  title: string
  description: string
  max_participants: number
  scheduled_at: Date
  participants: User[]
}

// 2. AI 매칭
async function findCompatibleUsers(userId: string, placeId: string) {
  // 비슷한 취향의 사용자 찾기
  const userProfile = await db.getUserProfile(userId)
  const candidates = await db.findSimilarUsers(userProfile)
  
  // Claude API로 매칭 이유 생성
  const matches = await ai.generateMatchReasons(userProfile, candidates)
  
  return matches
}
```

**차별화 포인트**:
- 다른 앱: 친구끼리만
- WhereHere: **AI가 취향 맞는 사람 연결**

**우선순위**: 🟡 중요

---

## 💎 3단계: 중독성 있는 경험 (3-4주)
**목표**: "매일 열어보게 만들기"

### 3.1 게임화 (Gamification) ⭐⭐⭐
**현재**: 단순 배지 → **목표**: 실제 보상 시스템

**구현**:
```python
# backend/services/gamification.py

class GamificationEngine:
    async def check_achievements(self, user_id: str, action: str):
        """행동에 따른 업적 체크"""
        
        achievements = {
            "first_visit": {
                "condition": lambda stats: stats["total_visits"] == 1,
                "reward": {"xp": 100, "badge": "first_step"},
                "notification": "첫 발걸음! 🎉"
            },
            "explorer": {
                "condition": lambda stats: len(stats["unique_places"]) >= 10,
                "reward": {"xp": 500, "badge": "explorer", "unlock": "hidden_places"},
                "notification": "탐험가 등급 달성! 히든 플레이스 해금 🗺️"
            },
            "social_butterfly": {
                "condition": lambda stats: stats["gatherings_joined"] >= 5,
                "reward": {"xp": 300, "badge": "social", "discount": "10%"},
                "notification": "소셜 버터플라이! 제휴 카페 10% 할인 ☕"
            },
            "night_owl": {
                "condition": lambda stats: stats["night_visits"] >= 20,
                "reward": {"xp": 400, "badge": "night_owl", "unlock": "night_mode"},
                "notification": "야행성! 밤 추천 모드 해금 🌙"
            }
        }
        
        stats = await self.get_user_stats(user_id)
        
        for achievement_id, achievement in achievements.items():
            if achievement["condition"](stats):
                await self.grant_achievement(user_id, achievement)
```

**중독성 요소**:
1. **레벨 시스템**: 방문할수록 레벨 업
2. **히든 플레이스**: 특정 조건 달성 시 해금
3. **실제 혜택**: 제휴 업체 할인 (수익 모델)
4. **주간 챌린지**: "이번 주 3곳 이상 방문 시 스타벅스 쿠폰"

**우선순위**: 🔴 최우선 (재방문율 핵심)

### 3.2 AI 동행자 (Companion) 강화 ⭐⭐
**목표**: 진짜 친구처럼 대화하는 AI

**구현**:
```python
# backend/services/ai_companion.py

class AICompanion:
    async def chat(self, user_id: str, message: str, context: dict):
        """사용자와 자연스러운 대화"""
        
        # 사용자 히스토리 로드
        history = await self.db.get_user_history(user_id)
        personality = await self.db.get_user_personality(user_id)
        
        # Claude API 호출
        response = await self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=f"""당신은 WhereHere의 AI 동행자입니다.
            사용자 이름: {context['user_name']}
            성격: {personality['traits']}
            최근 방문: {history['recent_places']}
            
            친근하고 공감하며, 구체적인 장소를 추천하세요.
            사용자의 기분과 상황을 고려하세요.""",
            messages=[
                {"role": "user", "content": message}
            ]
        )
        
        # 추천이 포함되어 있으면 실제 장소 데이터 첨부
        if "추천" in response.content:
            places = await self._find_relevant_places(
                response.content, 
                context["location"]
            )
            response.places = places
        
        return response
```

**대화 예시**:
```
사용자: "오늘 기분이 좀 우울해..."
AI: "그럴 때는 따뜻한 곳이 필요하죠. 
     홍대에 있는 '책과 커피' 카페 어때요? 
     창가 자리에서 책 읽으면 마음이 편해질 거예요.
     지금 날씨도 좋고, 여기 단골 고양이도 있어요 🐱"
```

**우선순위**: 🟡 중요

### 3.3 스토리텔링 강화 ⭐⭐
**목표**: 각 장소에 이야기 부여

**구현**:
```python
async def generate_place_story(place: dict, user_context: dict):
    """장소에 대한 개인화된 스토리 생성"""
    
    prompt = f"""
    장소: {place['name']}
    카테고리: {place['category']}
    특징: {place['vibe_tags']}
    
    사용자 성향: {user_context['personality']}
    현재 기분: {user_context['mood']}
    
    이 장소가 지금 이 사용자에게 특별한 이유를 
    감성적이고 구체적으로 2-3문장으로 설명하세요.
    """
    
    story = await claude_api.generate(prompt)
    return story
```

**예시**:
```
"성수동 카페거리의 이 작은 로스터리는 
당신처럼 조용히 자기만의 시간을 즐기는 사람들이 모이는 곳이에요.
창밖으로 보이는 공장 풍경과 갓 볶은 원두 향이 
복잡한 생각을 정리하는 데 도움을 줄 거예요."
```

**우선순위**: 🟢 선택

---

## 🎯 우선순위 실행 계획

### Week 1-2: 핵심 가치 완성
```
Day 1-3:   장소 데이터 500개 수집 (Kakao API)
Day 4-7:   AI 추천 알고리즘 구현
Day 8-10:  사용자 인증 시스템
Day 11-14: 실시간 위치 추적 + 알림
```

### Week 3-4: 차별화
```
Day 15-18: AI 큐레이션 맵 구현
Day 19-21: 게임화 시스템 (레벨, 배지, 보상)
Day 22-24: AI 동행자 대화 기능
Day 25-28: 소셜 기능 (모임, 매칭)
```

### Week 5-6: 완성도
```
Day 29-32: 스토리텔링 강화
Day 33-35: 성능 최적화
Day 36-38: 버그 수정 및 테스트
Day 39-42: 베타 테스트 및 피드백 반영
```

---

## 💰 수익 모델 (나중에)

### 1. 프리미엄 구독 ($4.99/월)
- 무제한 AI 추천
- 히든 플레이스 접근
- 광고 제거
- 우선 매칭

### 2. 제휴 수수료
- 카페/레스토랑 예약 시 수수료
- 할인 쿠폰 제공 시 수수료

### 3. 기업 솔루션
- 관광청/지자체에 데이터 판매
- 상권 분석 리포트

---

## 📊 성공 지표 (KPI)

### 단기 (1-2개월)
- [ ] DAU (일일 활성 사용자): 100명
- [ ] 평균 세션 시간: 5분 이상
- [ ] 재방문율: 40% 이상

### 중기 (3-6개월)
- [ ] MAU (월간 활성 사용자): 5,000명
- [ ] 장소 방문 전환율: 20% 이상
- [ ] 평균 평점: 4.5/5.0 이상

### 장기 (6-12개월)
- [ ] MAU: 50,000명
- [ ] 프리미엄 전환율: 5%
- [ ] 제휴 업체: 100개 이상

---

## 🚨 가장 중요한 것

> **"데이터 없으면 아무것도 안 됨"**

1. **먼저**: 장소 데이터 500-1,000개 수집 (1주일)
2. **그 다음**: AI 추천 알고리즘 (1주일)
3. **마지막**: 나머지 기능들

**데이터가 있어야 AI가 의미 있고, AI가 좋아야 사용자가 온다.**
