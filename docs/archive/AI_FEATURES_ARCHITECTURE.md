# WhereHere AI 기능 아키텍처 설계
> CTO 기술 문서 | 2026-02-13

---

## 🎯 8대 핵심 기능 구현 계획

### 우선순위
1. **[우선순위 1]** AI 빅데이터 기반 장소 수집 시스템
2. **[우선순위 1]** 개인화 AI 프로필 시스템
3. **[우선순위 1]** 맞춤형 미션 생성 시스템
4. **[우선순위 2]** 소셜 공유 기능
5. **[우선순위 1]** AI 동행자 - 위치 기반 실시간 가이드
6. **[우선순위 1]** 당신만의 서울 지도 - 패턴 분석
7. **[우선순위 1]** AI 소셜 매칭
8. **[우선순위 2]** AI 챌린지 메이커

---

## 📊 [1] AI 빅데이터 기반 장소 수집 시스템

### 현재 문제
- Mock 데이터 15개만 존재
- 수동으로 장소 추가 불가능 (확장성 0)

### 해결 방안: AI 크롤링 + 공공 API 통합

#### 데이터 소스
```
1. Kakao Local API (카카오 장소 검색)
   - 무료: 하루 30만건
   - 카테고리별 장소 검색
   - 평점, 리뷰, 주소, 전화번호

2. Google Places API
   - 유료: $17/1000건
   - 더 상세한 정보
   - 사진, 영업시간, 인기 시간대

3. 네이버 지역 API
   - 무료: 하루 25,000건
   - 한국 로컬 정보 강함

4. 공공데이터포털
   - 무료
   - 서울시 문화공간, 공원, 관광지
```

#### 구현 파이프라인

```python
# 1단계: 카테고리별 장소 수집
categories = ["카페", "갤러리", "공원", "맛집", "이색장소", "북카페", ...]

for category in categories:
    for region in ["강남구", "마포구", "종로구", ...]:
        places = kakao_api.search(
            query=f"{region} {category}",
            radius=5000,
            sort="accuracy"
        )
        
        for place in places:
            # 2단계: AI로 vibe_tags 생성
            vibe_tags = await ai_analyze_place(
                name=place.name,
                category=place.category,
                reviews=place.reviews[:10]  # 최근 리뷰 10개
            )
            
            # 3단계: DB 저장
            await db.insert_place({
                "name": place.name,
                "location": (place.lat, place.lng),
                "category": category,
                "vibe_tags": vibe_tags,
                "rating": place.rating,
                "price_range": ai_estimate_price(place),
                "crowd_level": ai_estimate_crowd(place),
                "is_hidden_gem": place.review_count < 50 and place.rating > 4.5
            })
```

#### AI Vibe Tags 생성

```python
async def ai_analyze_place(name: str, category: str, reviews: list[str]) -> list[str]:
    """
    Claude API로 장소의 분위기 태그 생성
    """
    prompt = f"""
장소: {name}
카테고리: {category}
최근 리뷰:
{chr(10).join(reviews[:5])}

이 장소의 분위기를 나타내는 영어 태그 3-5개를 생성하세요.
예시: cozy, trendy, peaceful, artistic, vintage, modern, hidden, social

출력 형식: ["tag1", "tag2", "tag3"]
"""
    
    response = await claude_api.call(prompt)
    return json.loads(response)
```

#### 자동 업데이트 시스템

```python
# 매일 자동 실행 (Cron Job)
async def daily_place_update():
    """
    1. 새로운 장소 추가 (오픈한 지 1개월 이내)
    2. 폐업한 장소 제거
    3. 평점/리뷰 업데이트
    4. 인기도 재계산
    """
    
    # 신규 장소 발견
    new_places = await kakao_api.search(
        query="서울 신규 오픈",
        sort="recency"
    )
    
    for place in new_places:
        if not await db.place_exists(place.id):
            await ai_process_and_insert(place)
    
    # 폐업 체크
    old_places = await db.get_places_not_updated(days=30)
    for place in old_places:
        if await verify_still_open(place):
            await db.update_place(place.id, last_verified=now())
        else:
            await db.mark_closed(place.id)
```

#### 제휴 업체 시스템

```python
# 제휴 업체 노출 부스팅
class PartnerPlace:
    place_id: str
    partner_tier: str  # "premium", "standard", "basic"
    boost_score: int   # 20, 10, 5
    featured_until: datetime
    
# 추천 알고리즘에 반영
def calculate_final_score(place, base_score):
    if place.is_partner:
        boost = PARTNER_BOOST[place.partner_tier]
        return base_score + boost
    return base_score
```

---

## 👤 [2] 개인화 AI 프로필 시스템

### 목표
ChatGPT처럼 사용자마다 다른 성격의 AI 동행자

### 구현 방법

#### 2-1. 사용자 프로필 수집

```python
class UserProfile:
    # 기본 정보
    user_id: str
    nickname: str
    age_range: str  # "20대 초반", "30대 중반"
    
    # 성격 벡터 (AI가 학습)
    personality: {
        "openness": 0.8,        # 개방성 (새로운 경험 추구)
        "conscientiousness": 0.6, # 성실성 (계획적)
        "extraversion": 0.7,    # 외향성 (사교적)
        "agreeableness": 0.9,   # 친화성 (협조적)
        "neuroticism": 0.3,     # 신경성 (불안 정도)
    }
    
    # 행동 패턴
    behavior: {
        "preferred_categories": ["카페", "갤러리", "공원"],
        "avg_budget": 15000,
        "avg_duration": 90,  # 분
        "preferred_time": "14:00-18:00",
        "preferred_crowd": "low",
        "visit_frequency": 3.5,  # 주당 방문 횟수
    }
    
    # 감정 히스토리
    mood_history: [
        {"date": "2026-02-12", "mood": "curious", "intensity": 0.8},
        {"date": "2026-02-11", "mood": "tired", "intensity": 0.6},
    ]
    
    # 방문 기록
    visit_history: [
        {
            "place_id": "...",
            "visited_at": "2026-02-12 14:30",
            "duration": 90,
            "rating": 4.5,
            "completed_missions": 3,
        }
    ]
```

#### 2-2. AI 성격 학습

```python
async def update_user_personality(user_id: str):
    """
    사용자의 행동을 분석하여 성격 벡터 업데이트
    """
    
    # 최근 30일 행동 데이터
    visits = await db.get_user_visits(user_id, days=30)
    
    # AI 분석
    prompt = f"""
사용자 행동 데이터:
- 방문한 장소: {[v.place_name for v in visits]}
- 선호 카테고리: {calculate_category_preference(visits)}
- 평균 체류 시간: {calculate_avg_duration(visits)}분
- 혼자 vs 함께: {calculate_social_ratio(visits)}
- 새로운 장소 vs 재방문: {calculate_novelty_ratio(visits)}

이 사용자의 성격을 Big Five 모델로 분석하세요:
- Openness (0-1): 새로운 경험 추구 정도
- Conscientiousness (0-1): 계획적 정도
- Extraversion (0-1): 사교적 정도
- Agreeableness (0-1): 협조적 정도
- Neuroticism (0-1): 불안 정도

출력 형식: {{"openness": 0.8, ...}}
"""
    
    personality = await claude_api.analyze(prompt)
    await db.update_user_personality(user_id, personality)
```

#### 2-3. AI 동행자 페르소나 생성

```python
async def create_ai_companion(user_profile: UserProfile) -> str:
    """
    사용자 성격에 맞는 AI 동행자 페르소나 생성
    """
    
    prompt = f"""
사용자 프로필:
- 성격: Openness {user_profile.personality.openness}, 
        Extraversion {user_profile.personality.extraversion}
- 선호: {user_profile.behavior.preferred_categories}
- 나이: {user_profile.age_range}

이 사용자에게 맞는 AI 동행자의 말투와 성격을 설계하세요:

예시:
- Openness 높음 + Extraversion 높음 
  → "오! 여기 완전 숨은 보석이네요! 같이 탐험해볼까요? 😊"
  
- Openness 낮음 + Extraversion 낮음
  → "조용하고 편안한 곳이에요. 천천히 쉬어가세요."

출력:
- tone: "친근한" / "정중한" / "활기찬" / "차분한"
- emoji_usage: "많음" / "보통" / "적음"
- formality: "반말" / "존댓말"
- encouragement_level: 0-1 (격려 정도)
"""
    
    companion_style = await claude_api.create_persona(prompt)
    return companion_style
```

#### 2-4. 개인화된 대화

```python
async def ai_chat(user_id: str, context: str, message: str = None) -> str:
    """
    사용자 프로필을 반영한 AI 응답
    """
    
    profile = await db.get_user_profile(user_id)
    companion_style = profile.ai_companion_style
    
    # 시스템 프롬프트 (사용자마다 다름)
    system_prompt = f"""
당신은 {profile.nickname}님의 개인 AI 동행자입니다.

사용자 성격:
- 개방성: {profile.personality.openness} ({"높음" if profile.personality.openness > 0.7 else "보통"})
- 외향성: {profile.personality.extraversion} ({"사교적" if profile.personality.extraversion > 0.7 else "내향적"})

말투 설정:
- 톤: {companion_style.tone}
- 이모지: {companion_style.emoji_usage}
- 격려: {companion_style.encouragement_level}

과거 대화 맥락:
{get_recent_conversations(user_id, limit=5)}

현재 상황:
{context}
"""
    
    response = await claude_api.chat(
        system=system_prompt,
        message=message or "지금 상황에 맞는 조언을 해주세요"
    )
    
    return response
```

---

## 🎮 [3] 맞춤형 미션 생성 시스템

### 현재 문제
- 모든 퀘스트가 동일한 3가지 미션
- 장소/역할/레벨과 무관

### 해결: AI 기반 동적 미션 생성

#### 3-1. 미션 템플릿 시스템

```python
MISSION_TEMPLATES = {
    "explorer": {
        "basic": [
            "숨겨진 입구 찾기",
            "로컬에게 길 물어보기",
            "지도에 없는 골목 발견하기",
        ],
        "photo": [
            "가장 독특한 간판 촬영하기",
            "숨은 디테일 3가지 찾아 촬영",
            "이 장소만의 특징 클로즈업",
        ],
        "social": [
            "사장님께 이곳의 역사 듣기",
            "단골 손님과 대화하기",
        ],
        "challenge": [
            "메뉴판 없이 주문하기",
            "현지인처럼 행동하기 30분",
        ]
    },
    "healer": {
        "basic": [
            "5분간 명상하기",
            "창밖 풍경 바라보기",
            "디지털 디톡스 (폰 끄기 30분)",
        ],
        "sensory": [
            "향기 기억하기",
            "소리에 집중하기",
            "촉감 느끼기",
        ],
        "reflection": [
            "오늘 감사한 일 3가지 떠올리기",
            "내면의 소리 듣기",
        ]
    },
    # ... 다른 역할들
}
```

#### 3-2. AI 미션 생성

```python
async def generate_missions(
    place: dict,
    role_type: str,
    user_level: int,
    user_personality: dict,
    weather: str,
    time_of_day: str
) -> list[dict]:
    """
    장소와 사용자에 맞는 맞춤형 미션 생성
    """
    
    prompt = f"""
장소: {place['name']}
카테고리: {place['category']}
분위기: {', '.join(place['vibe_tags'])}
역할: {role_type}
사용자 레벨: Lv.{user_level}
사용자 성격: 개방성 {user_personality['openness']}, 외향성 {user_personality['extraversion']}
날씨: {weather}
시간: {time_of_day}

이 장소와 사용자에게 딱 맞는 **3-5개의 미션**을 생성하세요.

규칙:
1. 기본 미션 1개 (도착, 체류)
2. 역할 특화 미션 1-2개
3. 장소 특화 미션 1-2개
4. 챌린지 미션 0-1개 (레벨 높을 때만)

예시 (탐험가 + 카페 + Lv.8):
1. ✅ 기본: "장소에 도착하기"
2. 🧭 탐험: "메뉴판에 없는 숨은 메뉴 발견하기"
3. 📸 장소: "창가 자리에서 거리 풍경 촬영하기"
4. 💬 소셜: "바리스타에게 원두 이야기 듣기"
5. 🏆 챌린지: "30분 안에 현지인 친구 1명 사귀기"

출력 형식:
[
  {
    "type": "basic",
    "title": "장소에 도착하기",
    "description": "GPS 기준 50m 이내",
    "xp": 30,
    "difficulty": "easy"
  },
  ...
]
"""
    
    missions = await claude_api.generate_missions(prompt)
    return missions
```

#### 3-3. 동적 난이도 조정

```python
def adjust_mission_difficulty(missions: list, user_level: int, success_rate: float):
    """
    사용자 레벨과 성공률에 따라 난이도 조정
    """
    
    if user_level < 5:
        # 초보자: 쉬운 미션만
        return [m for m in missions if m['difficulty'] in ['easy', 'medium']]
    
    elif success_rate > 0.9:
        # 고수: 챌린지 미션 추가
        missions.append(generate_challenge_mission(user_level))
    
    return missions
```

---

## 📱 [4] 소셜 공유 기능

### 구현 방법

#### 4-1. Web Share API (네이티브 공유)

```typescript
// 프론트엔드
async function shareQuest(quest: Quest) {
  // 공유 이미지 생성
  const shareImage = await generateShareImage(quest)
  
  // Web Share API
  if (navigator.share) {
    await navigator.share({
      title: `WhereHere - ${quest.name} 퀘스트 완료!`,
      text: `나는 ${quest.name}에서 ${quest.xp} XP를 획득했어요! 🎉\n\n"${quest.narrative}"`,
      url: `https://wherehere.app/quest/${quest.id}`,
      files: [shareImage]
    })
  }
}
```

#### 4-2. 공유 이미지 자동 생성

```typescript
async function generateShareImage(quest: Quest): Promise<File> {
  // Canvas로 이미지 생성
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630  // OG Image 표준 사이즈
  
  const ctx = canvas.getContext('2d')
  
  // 배경 그라데이션
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630)
  gradient.addColorStop(0, role.color)
  gradient.addColorStop(1, role.colorDark)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1200, 630)
  
  // 텍스트
  ctx.fillStyle = '#FFF'
  ctx.font = 'bold 48px Noto Sans KR'
  ctx.fillText(quest.name, 60, 120)
  
  ctx.font = '32px Noto Sans KR'
  ctx.fillText(`+${quest.xp} XP 획득!`, 60, 180)
  
  // 서사
  ctx.font = 'italic 28px Noto Sans KR'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  wrapText(ctx, `"${quest.narrative}"`, 60, 280, 1080, 40)
  
  // 로고
  ctx.font = 'bold 24px Space Grotesk'
  ctx.fillText('WhereHere', 60, 570)
  
  // Canvas → Blob → File
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(new File([blob], 'wherehere-quest.png', { type: 'image/png' }))
    })
  })
}
```

#### 4-3. 소셜 링크 생성

```python
# 백엔드: 공유 링크 생성
@router.post("/quests/{quest_id}/share")
async def create_share_link(quest_id: str, user_id: str):
    """
    퀘스트 완료 공유 링크 생성
    """
    
    quest = await db.get_completed_quest(quest_id, user_id)
    
    # 짧은 URL 생성
    share_id = generate_short_id()
    
    await db.save_share({
        "share_id": share_id,
        "quest_id": quest_id,
        "user_id": user_id,
        "created_at": datetime.now()
    })
    
    return {
        "share_url": f"https://wherehere.app/s/{share_id}",
        "og_image": f"https://wherehere.app/api/og/{share_id}.png",
        "title": f"{quest.user_nickname}님이 {quest.place_name} 퀘스트를 완료했어요!",
        "description": quest.narrative
    }
```

#### 4-4. 간단한 구현 (우선)

```typescript
// 가장 간단한 버전: 텍스트만 공유
function shareToKakao(quest: Quest) {
  // Kakao SDK
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `${quest.name} 퀘스트 완료!`,
      description: quest.narrative,
      imageUrl: 'https://wherehere.app/og-image.png',
      link: {
        mobileWebUrl: 'https://wherehere.app',
        webUrl: 'https://wherehere.app',
      },
    },
    buttons: [
      {
        title: '나도 도전하기',
        link: {
          mobileWebUrl: 'https://wherehere.app',
        },
      },
    ],
  })
}
```

---

## 📍 [5] AI 동행자 - 위치 기반 실시간 가이드

### 구현 파이프라인

#### 5-1. 위치 추적 시스템

```typescript
// 프론트엔드: 실시간 위치 추적
class LocationTracker {
  watchId: number | null = null
  currentQuest: Quest | null = null
  
  startTracking(quest: Quest) {
    this.currentQuest = quest
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.onLocationUpdate(position)
      },
      (error) => console.error(error),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    )
  }
  
  async onLocationUpdate(position: GeolocationPosition) {
    const { latitude, longitude } = position.coords
    
    // 목적지까지 거리 계산
    const distance = calculateDistance(
      latitude, longitude,
      this.currentQuest.latitude, this.currentQuest.longitude
    )
    
    // 도착 감지 (50m 이내)
    if (distance < 50) {
      await this.onArrival()
    }
    
    // 백엔드에 위치 전송 (AI 분석용)
    await api.post('/api/v1/location/update', {
      user_id: userId,
      quest_id: this.currentQuest.id,
      location: { latitude, longitude },
      distance_to_target: distance
    })
  }
  
  async onArrival() {
    // 도착 알림
    showNotification('목적지에 도착하셨습니다! 🎉')
    
    // AI 가이드 요청
    const guide = await api.post('/api/v1/ai/arrival-guide', {
      quest_id: this.currentQuest.id,
      user_id: userId
    })
    
    // AI 가이드 표시
    showAIGuide(guide)
  }
}
```

#### 5-2. AI 도착 가이드

```python
@router.post("/ai/arrival-guide")
async def get_arrival_guide(quest_id: str, user_id: str):
    """
    사용자가 장소에 도착했을 때 AI 가이드 제공
    """
    
    quest = await db.get_quest(quest_id)
    user = await db.get_user_profile(user_id)
    place = await db.get_place(quest.place_id)
    
    # 현재 시간, 날씨
    now = datetime.now()
    weather = await get_weather(place.latitude, place.longitude)
    
    # 리뷰 분석 (최근 10개)
    reviews = await get_place_reviews(place.id, limit=10)
    
    prompt = f"""
사용자가 {place.name}에 도착했습니다.

장소 정보:
- 카테고리: {place.category}
- 분위기: {', '.join(place.vibe_tags)}
- 평점: {place.rating}

사용자:
- 역할: {user.role_type}
- 레벨: Lv.{user.level}
- 성격: {user.personality}

현재 상황:
- 시간: {now.strftime('%H:%M')}
- 날씨: {weather.condition_kr}, {weather.temperature}°C

최근 리뷰 분석:
{analyze_reviews_summary(reviews)}

다음을 제공하세요:
1. 환영 메시지 (사용자 성격 반영)
2. 추천 좌석/위치
3. 추천 메뉴 (리뷰 기반)
4. 포토 스팟
5. 로컬 팁
6. 예상 체류 시간

출력 형식:
{{
  "welcome": "잘 오셨어요! ...",
  "recommended_spot": "2층 창가 자리를 추천해요...",
  "recommended_menu": "시그니처 커피 (리뷰 분석: 90% 만족)",
  "photo_spot": "계단 중간에서 위를 보고 찍으면...",
  "local_tip": "사장님께 원두 이야기를 물어보세요",
  "estimated_duration": 60,
  "review_sources": ["네이버 리뷰 15개 분석", "카카오맵 리뷰 8개 분석"]
}}
"""
    
    guide = await claude_api.generate_guide(prompt)
    
    return {
        "guide": guide,
        "missions": await generate_missions(place, user),
        "next_recommendations": await get_nearby_next_spots(place, user)
    }
```

#### 5-3. 30분 후 자동 제안

```python
# 백그라운드 작업
async def check_user_progress():
    """
    진행 중인 퀘스트 모니터링
    """
    
    active_quests = await db.get_active_quests()
    
    for quest in active_quests:
        # 도착 후 경과 시간
        elapsed = (datetime.now() - quest.arrived_at).seconds / 60
        
        if elapsed >= 30:
            # AI 다음 제안
            suggestion = await ai_suggest_next(quest)
            
            # 푸시 알림
            await send_push_notification(
                user_id=quest.user_id,
                title="다음 장소를 추천해드릴까요?",
                body=suggestion.message,
                data={"next_place_id": suggestion.place_id}
            )
```

#### 5-4. 리뷰 출처 표시

```python
# UI에 표시
"""
💡 AI 추천 메뉴: 시그니처 아메리카노

출처: 
- 네이버 리뷰 15개 분석
- 카카오맵 리뷰 8개 분석
- 인스타그램 해시태그 #이곳메뉴 23개 분석

신뢰도: 92% (23명 중 21명이 추천)
"""
```

---

## 🗺️ [6] 당신만의 서울 지도 - 패턴 분석 (최우선!)

### 구현 파이프라인

#### 6-1. 위치 추적 데이터 수집

```python
class LocationHistory(BaseModel):
    user_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    accuracy: float
    speed: Optional[float]  # m/s
    activity: str  # "walking", "still", "in_vehicle"
```

```typescript
// 프론트엔드: 백그라운드 위치 추적
class BackgroundLocationTracker {
  async startTracking() {
    // 5분마다 위치 기록
    setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await api.post('/api/v1/location/track', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            timestamp: new Date().toISOString()
          })
        })
      }
    }, 5 * 60 * 1000)  // 5분
  }
}
```

#### 6-2. 경로 시각화

```typescript
// Kakao Maps로 경로 표시
function renderUserJourney(locations: Location[]) {
  const map = new kakao.maps.Map(container, options)
  
  // 폴리라인으로 경로 그리기
  const path = locations.map(loc => 
    new kakao.maps.LatLng(loc.latitude, loc.longitude)
  )
  
  const polyline = new kakao.maps.Polyline({
    path: path,
    strokeWeight: 5,
    strokeColor: '#E8740C',
    strokeOpacity: 0.7,
    strokeStyle: 'solid'
  })
  
  polyline.setMap(map)
  
  // 방문한 장소 마커
  locations.forEach((loc, i) => {
    if (loc.place_id) {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(loc.latitude, loc.longitude),
        image: createCustomMarker(i + 1, loc.category)
      })
      marker.setMap(map)
    }
  })
}
```

#### 6-3. AI 패턴 분석

```python
@router.get("/users/{user_id}/pattern-analysis")
async def analyze_user_pattern(user_id: str):
    """
    사용자의 이동 패턴 및 선호도 AI 분석
    """
    
    # 데이터 수집
    visits = await db.get_user_visits(user_id, days=90)
    locations = await db.get_location_history(user_id, days=90)
    
    # 통계 계산
    stats = {
        "total_visits": len(visits),
        "total_distance": calculate_total_distance(locations),
        "avg_duration": calculate_avg_duration(visits),
        "category_distribution": calculate_category_dist(visits),
        "time_preference": calculate_time_preference(visits),
        "budget_pattern": calculate_budget_pattern(visits),
        "social_ratio": calculate_social_ratio(visits),
        "exploration_radius": calculate_exploration_radius(locations),
    }
    
    # AI 분석
    prompt = f"""
사용자 행동 데이터 (90일):

방문 통계:
- 총 방문: {stats['total_visits']}회
- 총 이동 거리: {stats['total_distance']}km
- 평균 체류: {stats['avg_duration']}분

카테고리 선호:
{json.dumps(stats['category_distribution'], indent=2, ensure_ascii=False)}

시간대 선호:
{json.dumps(stats['time_preference'], indent=2, ensure_ascii=False)}

예산 패턴:
- 평균: {stats['budget_pattern']['avg']}원
- 최대: {stats['budget_pattern']['max']}원

탐험 반경:
- 주로 활동하는 지역: {stats['exploration_radius']['center']}
- 평균 반경: {stats['exploration_radius']['radius']}km

이 사용자를 분석하여:
1. 탐험 스타일 정의 (예: "감성 큐레이터", "도심 탐험가")
2. 성격 특징 3가지
3. 추천 장소 3곳 (아직 안 가본 곳)
4. 각 추천의 매칭 확률

출력 형식:
{{
  "style_name": "감성 큐레이터",
  "style_description": "조용한 공간에서 예술과 문화를 즐기는 당신",
  "characteristics": [
    "주로 조용한 카페를 선호 (68%)",
    "예술 관련 장소 방문 빈도 높음",
    "평균 체류 시간 1.5시간 - 여유롭게 즐기는 타입"
  ],
  "recommendations": [
    {{
      "place_name": "성수동 복합문화공간",
      "reason": "당신이 좋아하는 갤러리+카페 조합",
      "match_probability": 0.92,
      "why_match": "과거 방문한 '삼청동 갤러리 카페'와 유사한 분위기"
    }},
    ...
  ]
}}
"""
    
    analysis = await claude_api.analyze_pattern(prompt)
    
    return {
        "stats": stats,
        "ai_analysis": analysis,
        "journey_map": generate_journey_map(locations),
        "achievements": calculate_achievements(visits)
    }
```

#### 6-4. 지도 UI (벤치마킹)

```
참고할 서비스:
1. Strava - 운동 경로 추적 & 히트맵
2. Google Timeline - 위치 기록 & 타임라인
3. Arc App - AI 기반 이동 패턴 분석
4. Swarm (Foursquare) - 체크인 지도

구현할 UI:
- 히트맵: 자주 가는 지역 색상으로 표시
- 타임라인: 날짜별 방문 기록
- 통계 대시보드: 카테고리별 파이 차트
- 성취 뱃지: "강남 마스터", "카페 러버" 등
```

---

## 🤝 [7] AI 소셜 매칭 시스템

### 구현 파이프라인

#### 7-1. 사용자 매칭 벡터

```python
class UserMatchingProfile:
    user_id: str
    
    # 매칭 벡터
    interests: list[str]  # ["보드게임", "카페", "갤러리"]
    personality: dict     # Big Five
    age_range: str
    preferred_group_size: int  # 2-4명
    social_style: str     # "외향적", "내향적", "중간"
    
    # 매칭 선호도
    preferences: {
        "gender_preference": "any",  # "male", "female", "any"
        "age_range_preference": [20, 35],
        "max_distance": 5000,  # 미터
    }
```

#### 7-2. AI 매칭 알고리즘

```python
async def find_matches(user_id: str, activity: dict) -> list[dict]:
    """
    AI 기반 사용자 매칭
    """
    
    user = await db.get_user_profile(user_id)
    
    # 후보 찾기
    candidates = await db.find_nearby_users(
        location=user.current_location,
        radius=activity.location_radius,
        exclude=[user_id]
    )
    
    # AI 매칭 점수 계산
    matches = []
    for candidate in candidates:
        score = await calculate_match_score(user, candidate, activity)
        
        if score > 0.7:  # 70% 이상만
            matches.append({
                "user": candidate,
                "score": score,
                "reasons": await ai_explain_match(user, candidate, score)
            })
    
    return sorted(matches, key=lambda x: x['score'], reverse=True)


async def calculate_match_score(user1, user2, activity) -> float:
    """
    AI로 매칭 점수 계산
    """
    
    prompt = f"""
사용자 A:
- 관심사: {user1.interests}
- 성격: Openness {user1.personality.openness}, Extraversion {user1.personality.extraversion}
- 나이: {user1.age_range}
- 선호 활동: {user1.preferred_categories}

사용자 B:
- 관심사: {user2.interests}
- 성격: Openness {user2.personality.openness}, Extraversion {user2.personality.extraversion}
- 나이: {user2.age_range}
- 선호 활동: {user2.preferred_categories}

활동: {activity.name} ({activity.category})

이 두 사용자가 이 활동을 함께 하기에 얼마나 잘 맞는지 0-1 점수로 평가하세요.

고려 사항:
- 공통 관심사
- 성격 궁합 (너무 비슷하거나 보완적)
- 활동 스타일 (조용함 vs 활발함)
- 나이대 차이

출력: {{"score": 0.87, "reasons": ["공통 관심사: 보드게임, 카페", ...]}}
"""
    
    result = await claude_api.calculate_match(prompt)
    return result['score']
```

#### 7-3. 모임 생성 & 참여

```python
@router.post("/social/create-gathering")
async def create_gathering(
    user_id: str,
    place_id: str,
    scheduled_time: datetime,
    max_participants: int = 4
):
    """
    모임 생성
    """
    
    gathering = await db.create_gathering({
        "creator_id": user_id,
        "place_id": place_id,
        "scheduled_time": scheduled_time,
        "max_participants": max_participants,
        "status": "open"
    })
    
    # AI가 매칭 가능한 사용자 찾기
    matches = await find_matches(user_id, gathering)
    
    # 매칭된 사용자에게 알림
    for match in matches[:10]:  # 상위 10명
        await send_notification(
            user_id=match.user_id,
            title=f"🤝 {gathering.place_name} 모임 초대",
            body=f"매칭 점수 {int(match.score*100)}% - {match.reasons[0]}"
        )
    
    return gathering
```

---

## 🏆 [8] AI 챌린지 메이커

### 구현 파이프라인

#### 8-1. 챌린지 생성

```python
@router.post("/challenges/generate")
async def generate_weekly_challenge(user_id: str):
    """
    사용자 레벨에 맞는 주간 챌린지 생성
    """
    
    user = await db.get_user_profile(user_id)
    completed_places = await db.get_completed_places(user_id)
    
    prompt = f"""
사용자 프로필:
- 레벨: Lv.{user.level}
- 역할: {user.primary_role}
- 완료한 장소: {len(completed_places)}곳
- 선호 카테고리: {user.preferred_categories}

이번 주 챌린지를 생성하세요:

난이도: {
    "easy" if user.level < 5 else
    "medium" if user.level < 10 else
    "hard"
}

요구사항:
1. 테마가 있어야 함 (예: "서울 5대 루프탑 정복")
2. 5-7개 장소
3. 7일 안에 완료 가능
4. 사용자가 아직 안 가본 곳
5. 보상이 매력적

출력 형식:
{{
  "title": "서울 5대 루프탑 정복",
  "description": "도심 위에서 바라보는 특별한 시선",
  "difficulty": "hard",
  "duration_days": 7,
  "places": [
    {{
      "name": "을지로 루프탑 바",
      "why": "석양이 가장 아름다운 곳",
      "order": 1
    }},
    ...
  ],
  "rewards": {{
    "xp": 1000,
    "badge": "스카이라인 마스터",
    "unlock": "부산 지역 해금"
  }},
  "tips": "주말 오후 5-7시가 골든아워예요"
}}
"""
    
    challenge = await claude_api.generate_challenge(prompt)
    
    # DB 저장
    challenge_id = await db.create_challenge(user_id, challenge)
    
    return challenge
```

#### 8-2. 진행 상황 추적

```python
@router.get("/challenges/{challenge_id}/progress")
async def get_challenge_progress(challenge_id: str, user_id: str):
    """
    챌린지 진행 상황 조회
    """
    
    challenge = await db.get_challenge(challenge_id)
    completed = await db.get_completed_places_in_challenge(challenge_id, user_id)
    
    progress = len(completed) / len(challenge.places)
    days_left = (challenge.deadline - datetime.now()).days
    
    # AI 코멘트
    if progress < 0.3 and days_left < 3:
        ai_comment = "서두르세요! 시간이 얼마 안 남았어요 ⏰"
    elif progress > 0.8:
        ai_comment = "거의 다 왔어요! 마지막 스퍼트! 🔥"
    else:
        ai_comment = await ai_generate_encouragement(progress, days_left, user_id)
    
    return {
        "challenge": challenge,
        "completed": completed,
        "progress": progress,
        "days_left": days_left,
        "ai_comment": ai_comment
    }
```

---

## 🗄️ 데이터베이스 스키마 확장

### 새로운 테이블

```sql
-- 위치 추적 기록
CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    location GEOGRAPHY(POINT, 4326),
    accuracy FLOAT,
    speed FLOAT,
    activity VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_time (user_id, recorded_at)
);

-- 완료한 퀘스트
CREATE TABLE completed_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    quest_id UUID,
    place_id UUID REFERENCES places(id),
    completed_at TIMESTAMP DEFAULT NOW(),
    duration_minutes INT,
    missions_completed JSONB,
    user_rating FLOAT,
    user_comment TEXT
);

-- 챌린지
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200),
    description TEXT,
    difficulty VARCHAR(20),
    places JSONB,  -- [{place_id, order, completed}]
    rewards JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP,
    completed_at TIMESTAMP
);

-- 모임
CREATE TABLE gatherings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id),
    place_id UUID REFERENCES places(id),
    scheduled_time TIMESTAMP,
    max_participants INT,
    current_participants INT DEFAULT 1,
    status VARCHAR(20),  -- "open", "full", "completed", "cancelled"
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gathering_participants (
    gathering_id UUID REFERENCES gatherings(id),
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    match_score FLOAT,
    PRIMARY KEY (gathering_id, user_id)
);

-- 제휴 업체
CREATE TABLE partner_places (
    place_id UUID REFERENCES places(id) PRIMARY KEY,
    partner_tier VARCHAR(20),  -- "premium", "standard", "basic"
    boost_score INT,
    featured_until TIMESTAMP,
    contact_info JSONB
);
```

---

## 🚀 구현 순서

### Week 1: 데이터 인프라
- [x] DB 스키마 확장
- [ ] Kakao Local API 통합
- [ ] 장소 자동 수집 크론잡
- [ ] 위치 추적 시스템

### Week 2: AI 개인화
- [ ] 사용자 프로필 수집
- [ ] AI 성격 분석
- [ ] 개인화 추천 엔진

### Week 3: 핵심 기능
- [ ] 맞춤형 미션 생성
- [ ] AI 동행자 가이드
- [ ] 패턴 분석 & 지도 시각화

### Week 4: 소셜 기능
- [ ] 소셜 공유
- [ ] AI 매칭 시스템
- [ ] 모임 생성/참여

### Week 5: 게임화
- [ ] AI 챌린지 메이커
- [ ] 뱃지 시스템
- [ ] 리더보드

---

## 💰 비용 추정

### API 비용 (월간, 사용자 1000명 기준)

| 기능 | 호출 빈도 | 월 호출 | 비용 |
|------|----------|--------|------|
| 장소 vibe 분석 | 신규 장소당 1회 | 300회 | $3 |
| 개인화 프로필 | 주 1회 | 4,000회 | $40 |
| 맞춤 미션 생성 | 퀘스트당 1회 | 10,000회 | $100 |
| 도착 가이드 | 도착당 1회 | 10,000회 | $100 |
| 패턴 분석 | 월 1회 | 1,000회 | $30 |
| 매칭 점수 | 모임당 10회 | 2,000회 | $20 |
| 챌린지 생성 | 주 1회 | 4,000회 | $40 |
| **합계** | | | **$333/월** |

### 수익 모델
- 무료 사용자: 하루 3퀘스트 제한
- 프리미엄 ($9.99/월): 무제한 + AI 동행자
- 제휴 업체: 노출 부스팅 ($100-500/월)

**손익분기점**: 사용자 50명

---

## 🔧 기술 스택 추가

### 새로 필요한 것
```
1. Kakao Local API - 장소 검색
2. 백그라운드 위치 추적 (PWA Service Worker)
3. 푸시 알림 (Firebase Cloud Messaging)
4. 이미지 생성 (Canvas API)
5. 크론잡 (APScheduler)
6. 캐싱 (Redis) - AI 응답 캐싱
```

---

## 📋 다음 단계

지금부터 순서대로 구현하겠습니다:

1. ✅ 문서 작성 완료
2. ⏳ DB 스키마 확장
3. ⏳ Kakao Local API 통합
4. ⏳ 위치 추적 시스템
5. ⏳ AI 개인화 프로필
6. ⏳ 맞춤형 미션 생성
7. ⏳ 패턴 분석 & 지도
8. ⏳ AI 소셜 매칭

**바로 시작하겠습니다!** 🚀
