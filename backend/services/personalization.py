# -*- coding: utf-8 -*-
"""
사용자 개인화 AI 서비스
- 성격 분석 (Big Five)
- AI 동행자 페르소나 생성
- 개인화된 대화
"""

import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from anthropic import Anthropic

from core.config import settings


class PersonalizationService:
    """
    사용자 개인화 AI 서비스
    """
    
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def analyze_user_personality(
        self,
        user_id: str,
        visits: List[Dict],
        db
    ) -> Dict:
        """
        사용자의 행동 데이터를 분석하여 성격 벡터 생성
        
        Returns:
            {
                "openness": 0.8,
                "conscientiousness": 0.6,
                "extraversion": 0.7,
                "agreeableness": 0.9,
                "neuroticism": 0.3
            }
        """
        
        if len(visits) < 3:
            # 데이터 부족 시 기본값
            return {
                "openness": 0.5,
                "conscientiousness": 0.5,
                "extraversion": 0.5,
                "agreeableness": 0.5,
                "neuroticism": 0.5
            }
        
        # 통계 계산
        stats = self._calculate_user_stats(visits)
        
        prompt = f"""
사용자 행동 데이터 분석 (최근 {len(visits)}회 방문):

방문한 장소:
{self._format_places(visits)}

카테고리 선호도:
{json.dumps(stats['category_distribution'], indent=2, ensure_ascii=False)}

행동 패턴:
- 평균 체류 시간: {stats['avg_duration']}분
- 새로운 장소 비율: {stats['novelty_ratio']*100:.0f}%
- 혼자 방문 비율: {stats['solo_ratio']*100:.0f}%
- 주말 vs 평일: 주말 {stats['weekend_ratio']*100:.0f}%
- 선호 시간대: {stats['preferred_time']}

이 사용자의 성격을 Big Five 모델로 분석하세요:

1. **Openness (개방성)**: 새로운 경험 추구, 창의성, 호기심
   - 높음: 다양한 카테고리, 새로운 장소 선호, 이색적인 곳
   - 낮음: 익숙한 장소 재방문, 안정적인 선택

2. **Conscientiousness (성실성)**: 계획성, 조직성, 목표 지향
   - 높음: 규칙적인 방문 패턴, 미션 완료율 높음
   - 낮음: 즉흥적, 불규칙적

3. **Extraversion (외향성)**: 사교성, 활동성, 자극 추구
   - 높음: 사람 많은 곳, 소셜 활동, 모임 참여
   - 낮음: 조용한 곳, 혼자 방문

4. **Agreeableness (친화성)**: 협조성, 공감, 이타성
   - 높음: 모임 참여, 긍정적 리뷰, 협력적 미션
   - 낮음: 독립적, 개인 활동

5. **Neuroticism (신경성)**: 불안, 스트레스 민감도
   - 높음: 안전한 장소 선호, 계획적
   - 낮음: 모험적, 즉흥적

출력 형식 (0-1 사이 값):
{{
  "openness": 0.75,
  "conscientiousness": 0.60,
  "extraversion": 0.80,
  "agreeableness": 0.85,
  "neuroticism": 0.35,
  "reasoning": {{
    "openness": "다양한 카테고리 방문, 새로운 장소 비율 높음",
    "conscientiousness": "규칙적인 방문 패턴",
    "extraversion": "사교적 장소 선호, 모임 참여",
    "agreeableness": "긍정적 리뷰, 협력적",
    "neuroticism": "모험적 선택, 즉흥적"
  }}
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result = json.loads(response.content[0].text.strip())
            # DB 업데이트는 라우트에서 personality + companion_style 확보 후 한 번에 수행
            print(f"✅ 사용자 {user_id} 성격 분석 완료")
            print(f"   Openness: {result['openness']:.2f}")
            print(f"   Extraversion: {result['extraversion']:.2f}")
            
            return result
        
        except Exception as e:
            print(f"❌ 성격 분석 실패: {e}")
            return {
                "openness": 0.5,
                "conscientiousness": 0.5,
                "extraversion": 0.5,
                "agreeableness": 0.5,
                "neuroticism": 0.5
            }
    
    def _calculate_user_stats(self, visits: List[Dict]) -> Dict:
        """
        사용자 통계 계산
        """
        
        # 카테고리 분포
        categories = {}
        for visit in visits:
            cat = visit.get("category", "기타")
            categories[cat] = categories.get(cat, 0) + 1
        
        total = len(visits)
        category_distribution = {
            cat: count / total for cat, count in categories.items()
        }
        
        # 평균 체류 시간
        durations = [v.get("duration_minutes", 60) for v in visits]
        avg_duration = sum(durations) / len(durations) if durations else 60
        
        # 새로운 장소 비율
        unique_places = len(set(v.get("place_id") for v in visits))
        novelty_ratio = unique_places / total if total > 0 else 0
        
        # 혼자 방문 비율 (임시: 나중에 gathering 데이터 연동)
        solo_ratio = 0.7  # TODO: 실제 데이터로 계산
        
        # 주말 비율
        weekend_count = sum(
            1 for v in visits 
            if datetime.fromisoformat(v.get("completed_at", "")).weekday() >= 5
        )
        weekend_ratio = weekend_count / total if total > 0 else 0.5
        
        # 선호 시간대
        hours = [
            datetime.fromisoformat(v.get("completed_at", "")).hour 
            for v in visits if v.get("completed_at")
        ]
        avg_hour = sum(hours) / len(hours) if hours else 14
        
        if avg_hour < 12:
            preferred_time = "오전 (아침형 인간)"
        elif avg_hour < 18:
            preferred_time = "오후 (점심-저녁)"
        else:
            preferred_time = "저녁-밤 (올빼미형)"
        
        return {
            "category_distribution": category_distribution,
            "avg_duration": int(avg_duration),
            "novelty_ratio": novelty_ratio,
            "solo_ratio": solo_ratio,
            "weekend_ratio": weekend_ratio,
            "preferred_time": preferred_time
        }
    
    def _format_places(self, visits: List[Dict]) -> str:
        """
        방문 장소 포맷팅
        """
        
        places = [
            f"- {v.get('place_name', 'Unknown')} ({v.get('category', '기타')})"
            for v in visits[:10]  # 최근 10개만
        ]
        
        return "\n".join(places)
    
    async def create_ai_companion_style(
        self,
        user_id: str,
        personality: Dict,
        db
    ) -> Dict:
        """
        사용자 성격에 맞는 AI 동행자 스타일 생성
        
        Returns:
            {
                "tone": "friendly",
                "emoji_usage": "medium",
                "formality": "casual",
                "encouragement_level": 0.8
            }
        """
        
        prompt = f"""
사용자 성격 프로필:
- Openness (개방성): {personality['openness']:.2f}
- Conscientiousness (성실성): {personality['conscientiousness']:.2f}
- Extraversion (외향성): {personality['extraversion']:.2f}
- Agreeableness (친화성): {personality['agreeableness']:.2f}
- Neuroticism (신경성): {personality['neuroticism']:.2f}

이 사용자에게 맞는 AI 동행자의 말투와 스타일을 설계하세요:

예시:
- Openness 높음 + Extraversion 높음
  → tone: "energetic", emoji: "high", formality: "casual"
  → "오! 여기 완전 숨은 보석이네요! 같이 탐험해볼까요? 😊✨"

- Openness 낮음 + Extraversion 낮음
  → tone: "calm", emoji: "low", formality: "polite"
  → "조용하고 편안한 곳이에요. 천천히 쉬어가세요."

- Conscientiousness 높음
  → encouragement_level: high (목표 달성 격려)

- Neuroticism 높음
  → tone: "reassuring" (안심시키는)

출력 형식:
{{
  "tone": "friendly",  // "energetic", "calm", "friendly", "formal", "reassuring"
  "emoji_usage": "medium",  // "high", "medium", "low"
  "formality": "casual",  // "casual", "polite", "formal"
  "encouragement_level": 0.7,  // 0-1
  "example_messages": [
    "도착 시: ...",
    "미션 완료 시: ...",
    "추천 시: ..."
  ]
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}]
            )
            
            style = json.loads(response.content[0].text.strip())
            
            # DB 업데이트
            await db.update_user_companion_style(user_id, style)
            
            print(f"✅ AI 동행자 스타일 생성: {style['tone']}, {style['emoji_usage']} emoji")
            
            return style
        
        except Exception as e:
            print(f"❌ AI 동행자 스타일 생성 실패: {e}")
            return {
                "tone": "friendly",
                "emoji_usage": "medium",
                "formality": "casual",
                "encouragement_level": 0.7
            }
    
    async def generate_personalized_message(
        self,
        user_id: str,
        context_type: str,  # "arrival", "mission_complete", "recommendation", etc.
        context_data: Dict,
        db
    ) -> str:
        """
        개인화된 AI 메시지 생성
        """
        
        # 사용자 프로필 가져오기
        profile = await db.get_user_profile(user_id)
        personality = profile.get("personality", {})
        companion_style = profile.get("companion_style", {})
        
        # 시스템 프롬프트 (사용자마다 다름)
        system_prompt = f"""
당신은 사용자의 개인 AI 동행자입니다.

사용자 성격:
- 개방성: {personality.get('openness', 0.5):.2f} ({"높음" if personality.get('openness', 0.5) > 0.7 else "보통" if personality.get('openness', 0.5) > 0.4 else "낮음"})
- 외향성: {personality.get('extraversion', 0.5):.2f} ({"사교적" if personality.get('extraversion', 0.5) > 0.7 else "중간" if personality.get('extraversion', 0.5) > 0.4 else "내향적"})

말투 설정:
- 톤: {companion_style.get('tone', 'friendly')}
- 이모지 사용: {companion_style.get('emoji_usage', 'medium')}
- 격식: {companion_style.get('formality', 'casual')}
- 격려 수준: {companion_style.get('encouragement_level', 0.7):.1f}

규칙:
1. 사용자 성격에 맞는 말투 사용
2. 이모지는 설정에 맞게 조절
3. 격려는 적절히 (과하지 않게)
4. 한국어로 자연스럽게
"""
        
        # 컨텍스트별 프롬프트
        if context_type == "arrival":
            user_prompt = f"""
사용자가 {context_data['place_name']}에 도착했습니다.

장소 정보:
- 카테고리: {context_data['category']}
- 분위기: {', '.join(context_data.get('vibe_tags', []))}

환영 메시지를 작성하세요 (2-3문장):
"""
        
        elif context_type == "mission_complete":
            user_prompt = f"""
사용자가 미션을 완료했습니다:
- 미션: {context_data['mission_title']}
- XP 획득: {context_data['xp']}

축하 메시지를 작성하세요 (1-2문장):
"""
        
        elif context_type == "recommendation":
            user_prompt = f"""
다음 장소를 추천합니다:
- 장소: {context_data['place_name']}
- 이유: {context_data['reason']}

추천 메시지를 작성하세요 (2-3문장):
"""
        
        else:
            user_prompt = f"상황: {context_type}\n데이터: {context_data}\n\n적절한 메시지를 작성하세요."
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            message = response.content[0].text.strip()
            
            # 대화 기록 저장 (학습용)
            await db.save_ai_conversation(
                user_id=user_id,
                context_type=context_type,
                context_id=context_data.get("id"),
                ai_response=message
            )
            
            return message
        
        except Exception as e:
            print(f"❌ 개인화 메시지 생성 실패: {e}")
            
            # 폴백 메시지
            fallback_messages = {
                "arrival": f"잘 오셨어요! {context_data['place_name']}에서 즐거운 시간 보내세요 😊",
                "mission_complete": f"미션 완료! +{context_data.get('xp', 30)} XP 🎉",
                "recommendation": f"{context_data['place_name']}를 추천해요!"
            }
            
            return fallback_messages.get(context_type, "함께 즐거운 시간 보내요!")
    
    async def analyze_user_pattern(
        self,
        user_id: str,
        days: int = 90,
        db = None
    ) -> Dict:
        """
        사용자 패턴 분석 (지도 시각화용)
        """
        
        # 데이터 수집
        visits = await db.get_user_visits(user_id, days=days)
        locations = await db.get_location_history(user_id, days=days)
        
        if len(visits) < 5:
            return {
                "insufficient_data": True,
                "message": "더 많은 장소를 방문하면 패턴 분석이 가능해요!"
            }
        
        # 통계 계산
        stats = self._calculate_detailed_stats(visits, locations)
        
        # AI 분석
        prompt = f"""
사용자 행동 데이터 ({days}일):

방문 통계:
- 총 방문: {stats['total_visits']}회
- 총 이동 거리: {stats['total_distance_km']:.1f}km
- 평균 체류: {stats['avg_duration']}분

카테고리 선호:
{json.dumps(stats['category_distribution'], indent=2, ensure_ascii=False)}

시간대 선호:
{json.dumps(stats['time_preference'], indent=2, ensure_ascii=False)}

예산 패턴:
- 평균: {stats['avg_budget']:,}원
- 최대: {stats['max_budget']:,}원

탐험 반경:
- 주 활동 지역: {stats['main_region']}
- 평균 반경: {stats['exploration_radius_km']:.1f}km

이 사용자를 분석하여:
1. 탐험 스타일 정의 (예: "감성 큐레이터", "도심 탐험가", "힙스터 헌터")
2. 성격 특징 3가지
3. 추천 장소 3곳 (아직 안 가본 곳)
4. 각 추천의 매칭 확률

출력 형식:
{{
  "style_name": "감성 큐레이터",
  "style_emoji": "🎨",
  "style_description": "조용한 공간에서 예술과 문화를 즐기는 당신",
  "characteristics": [
    "주로 조용한 카페를 선호 (68%)",
    "예술 관련 장소 방문 빈도 높음",
    "평균 체류 시간 1.5시간 - 여유롭게 즐기는 타입"
  ],
  "recommendations": [
    {{
      "place_name": "성수동 복합문화공간",
      "category": "갤러리",
      "reason": "당신이 좋아하는 갤러리+카페 조합",
      "match_probability": 0.92,
      "why_match": "과거 방문한 '삼청동 갤러리 카페'와 유사한 분위기"
    }},
    ...
  ]
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )
            
            analysis = json.loads(response.content[0].text.strip())
            
            return {
                "stats": stats,
                "ai_analysis": analysis,
                "journey_map_data": self._prepare_map_data(locations, visits)
            }
        
        except Exception as e:
            print(f"❌ 패턴 분석 실패: {e}")
            return {
                "error": str(e),
                "stats": stats
            }
    
    def _calculate_detailed_stats(self, visits: List[Dict], locations: List[Dict]) -> Dict:
        """
        상세 통계 계산
        """
        
        total_visits = len(visits)
        
        # 카테고리 분포
        categories = {}
        for visit in visits:
            cat = visit.get("category", "기타")
            categories[cat] = categories.get(cat, 0) + 1
        
        category_distribution = {
            cat: f"{(count / total_visits * 100):.0f}%" 
            for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)
        }
        
        # 시간대 선호
        time_slots = {"오전": 0, "오후": 0, "저녁": 0, "밤": 0}
        for visit in visits:
            if visit.get("completed_at"):
                hour = datetime.fromisoformat(visit["completed_at"]).hour
                if hour < 12:
                    time_slots["오전"] += 1
                elif hour < 18:
                    time_slots["오후"] += 1
                elif hour < 22:
                    time_slots["저녁"] += 1
                else:
                    time_slots["밤"] += 1
        
        time_preference = {
            slot: f"{(count / total_visits * 100):.0f}%" 
            for slot, count in time_slots.items()
        }
        
        # 평균 체류 시간
        durations = [v.get("duration_minutes", 60) for v in visits]
        avg_duration = int(sum(durations) / len(durations)) if durations else 60
        
        # 예산 (estimated_cost 또는 spent_amount)
        costs = [v.get("estimated_cost") or v.get("spent_amount") or 10000 for v in visits]
        avg_budget = int(sum(costs) / len(costs)) if costs else 10000
        max_budget = max(costs) if costs else 10000
        
        # 이동 거리 (임시)
        total_distance_km = len(visits) * 2.5  # TODO: 실제 계산
        
        # 탐험 반경
        exploration_radius_km = 5.0  # TODO: 실제 계산
        
        # 주 활동 지역
        main_region = "강남구"  # TODO: 실제 계산
        
        return {
            "total_visits": total_visits,
            "category_distribution": category_distribution,
            "time_preference": time_preference,
            "avg_duration": avg_duration,
            "avg_budget": avg_budget,
            "max_budget": max_budget,
            "total_distance_km": total_distance_km,
            "exploration_radius_km": exploration_radius_km,
            "main_region": main_region
        }
    
    def _prepare_map_data(self, locations: List[Dict], visits: List[Dict]) -> Dict:
        """
        지도 시각화용 데이터 준비. visit에 latitude/longitude 없으면 마커에서 제외.
        """
        polyline = [
            {"lat": loc["latitude"], "lng": loc["longitude"]}
            for loc in locations[:100]
            if loc.get("latitude") is not None and loc.get("longitude") is not None
        ]
        markers = []
        for visit in visits[:50]:
            lat, lng = visit.get("latitude"), visit.get("longitude")
            if lat is None or lng is None:
                continue
            markers.append({
                "lat": lat,
                "lng": lng,
                "place_name": visit.get("place_name", ""),
                "category": visit.get("category", "기타"),
                "completed_at": visit.get("completed_at") or visit.get("visited_at", ""),
            })
        return {"polyline": polyline, "markers": markers}
