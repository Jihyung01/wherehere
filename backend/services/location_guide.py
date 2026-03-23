# -*- coding: utf-8 -*-
"""
AI 동행자 - 위치 기반 실시간 가이드
- 도착 감지
- 실시간 가이드 제공
- 다음 장소 제안
"""

import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from anthropic import Anthropic

from core.config import settings


class LocationGuideService:
    """
    위치 기반 AI 가이드 서비스
    """
    
    def __init__(self, db):
        self.db = db
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def on_arrival(
        self,
        user_id: str,
        quest_id: str,
        place_id: str
    ) -> Dict:
        """
        사용자가 장소에 도착했을 때 AI 가이드 제공
        
        Returns:
            {
                "welcome": "잘 오셨어요! ...",
                "recommended_spot": "2층 창가 자리를 추천해요...",
                "recommended_menu": "시그니처 커피 (리뷰 분석: 90% 만족)",
                "photo_spot": "계단 중간에서 위를 보고 찍으면...",
                "local_tip": "사장님께 원두 이야기를 물어보세요",
                "estimated_duration": 60,
                "review_sources": ["네이버 리뷰 15개 분석", "카카오맵 리뷰 8개 분석"]
            }
        """
        
        # 데이터 수집
        quest = await self.db.get_quest(quest_id)
        user = await self.db.get_user_profile(user_id)
        place = await self.db.get_place(place_id)
        
        # 현재 시간, 날씨
        now = datetime.now()
        weather = await self._get_weather(place["latitude"], place["longitude"])
        
        # 리뷰 분석 (최근 10개)
        reviews = await self._get_place_reviews(place_id, limit=10)
        review_summary = self._analyze_reviews(reviews)
        
        # AI 가이드 생성
        guide = await self._generate_arrival_guide(
            place=place,
            user=user,
            weather=weather,
            time=now,
            review_summary=review_summary
        )
        
        # 미션 생성
        from services.mission_generator import MissionGenerator
        mission_gen = MissionGenerator()
        missions = await mission_gen.generate_missions(
            place=place,
            role_type=user.get("primary_role", "explorer"),
            user_level=user.get("level", 1),
            user_personality=user.get("personality", {}),
            weather=weather.get("condition_kr"),
            time_of_day=self._get_time_of_day(now)
        )
        
        # 다음 추천 장소
        next_recommendations = await self._get_nearby_next_spots(place, user)
        
        # 도착 기록
        await self.db.record_arrival(user_id, quest_id, place_id, now)
        
        return {
            "guide": guide,
            "missions": missions,
            "next_recommendations": next_recommendations,
            "weather": weather
        }
    
    async def _generate_arrival_guide(
        self,
        place: Dict,
        user: Dict,
        weather: Dict,
        time: datetime,
        review_summary: Dict
    ) -> Dict:
        """
        AI 도착 가이드 생성
        """
        
        prompt = f"""
사용자가 {place['name']}에 도착했습니다.

장소 정보:
- 카테고리: {place['category']}
- 분위기: {', '.join(place.get('vibe_tags', []))}
- 평점: {place.get('average_rating', 4.0)}

사용자:
- 역할: {user.get('primary_role', 'explorer')}
- 레벨: Lv.{user.get('level', 1)}
- 성격: 개방성 {user.get('personality', {}).get('openness', 0.5):.2f}, 외향성 {user.get('personality', {}).get('extraversion', 0.5):.2f}

현재 상황:
- 시간: {time.strftime('%H:%M')} ({self._get_time_of_day(time)})
- 날씨: {weather.get('condition_kr', '맑음')}, {weather.get('temperature', 20)}°C

리뷰 분석:
- 추천 메뉴: {review_summary.get('top_menu', '시그니처 메뉴')}
- 추천 좌석: {review_summary.get('best_seat', '창가 자리')}
- 인기 시간대: {review_summary.get('popular_time', '오후 2-5시')}
- 평균 체류: {review_summary.get('avg_duration', 60)}분
- 리뷰 출처: {', '.join(review_summary.get('sources', ['네이버 리뷰 10개']))}

다음을 제공하세요:
1. 환영 메시지 (사용자 성격 반영, 1-2문장)
2. 추천 좌석/위치 (리뷰 기반)
3. 추천 메뉴 (리뷰 기반, 신뢰도 포함)
4. 포토 스팟
5. 로컬 팁 (사장님/직원과 대화 주제 등)
6. 예상 체류 시간

출력 형식:
{{
  "welcome": "잘 오셨어요! 이곳은 조용하고 아늑한 분위기가 일품이에요 ☕",
  "recommended_spot": "2층 창가 자리를 추천해요. 거리 풍경을 보며 여유를 즐기기 좋아요.",
  "recommended_menu": "시그니처 아메리카노 (리뷰 분석: 23명 중 21명 추천, 신뢰도 92%)",
  "photo_spot": "계단 중간에서 위를 보고 찍으면 천장 조명이 예술적으로 담겨요 📸",
  "local_tip": "사장님께 원두 이야기를 물어보세요. 직접 로스팅하신다고 해요!",
  "estimated_duration": 60,
  "review_sources": ["네이버 리뷰 15개 분석", "카카오맵 리뷰 8개 분석"]
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            
            guide_text = response.content[0].text.strip()
            
            if "```json" in guide_text:
                guide_text = guide_text.split("```json")[1].split("```")[0].strip()
            elif "```" in guide_text:
                guide_text = guide_text.split("```")[1].split("```")[0].strip()
            
            guide = json.loads(guide_text)
            
            print(f"✅ 도착 가이드 생성: {place['name']}")
            
            return guide
        
        except Exception as e:
            print(f"❌ 도착 가이드 생성 실패: {e}")
            
            # 폴백
            return {
                "welcome": f"잘 오셨어요! {place['name']}에서 즐거운 시간 보내세요 😊",
                "recommended_spot": "편안한 자리를 찾아보세요",
                "recommended_menu": "시그니처 메뉴를 추천해요",
                "photo_spot": "이곳만의 특별한 순간을 사진으로 담아보세요 📸",
                "local_tip": "직원분께 추천 메뉴를 물어보세요",
                "estimated_duration": 60,
                "review_sources": []
            }
    
    async def check_progress_and_suggest(
        self,
        user_id: str,
        quest_id: str
    ) -> Optional[Dict]:
        """
        진행 중인 퀘스트 체크 및 다음 제안
        (30분 후 자동 실행)
        
        Returns:
            {
                "message": "다음 장소로 이동할까요?",
                "next_place": {...},
                "reason": "여기서 도보 10분 거리에 빈티지 서점이 있어요",
                "timing_tip": "지금 가면 골든아워 빛을 받을 수 있어요"
            }
        """
        
        # 퀘스트 정보
        quest = await self.db.get_quest(quest_id)
        arrival_time = quest.get("arrived_at")
        
        if not arrival_time:
            return None
        
        # 경과 시간
        elapsed_minutes = (datetime.now() - arrival_time).seconds / 60
        
        if elapsed_minutes < 30:
            return None  # 아직 30분 안 됨
        
        # 사용자 정보
        user = await self.db.get_user_profile(user_id)
        current_place = await self.db.get_place(quest["place_id"])
        
        # 다음 장소 추천
        next_place = await self._find_next_place(current_place, user)
        
        if not next_place:
            return None
        
        # AI 제안 메시지
        suggestion = await self._generate_next_suggestion(
            current_place=current_place,
            next_place=next_place,
            user=user,
            elapsed_minutes=elapsed_minutes
        )
        
        return suggestion
    
    async def _find_next_place(
        self,
        current_place: Dict,
        user: Dict
    ) -> Optional[Dict]:
        """
        다음 추천 장소 찾기
        """
        
        # 근처 장소 검색 (1km 이내)
        nearby_places = await self.db.find_nearby_places(
            latitude=current_place["latitude"],
            longitude=current_place["longitude"],
            radius_km=1.0,
            limit=10
        )
        
        # 아직 안 가본 곳만
        visited_place_ids = await self.db.get_visited_place_ids(user["id"])
        unvisited = [p for p in nearby_places if p["id"] not in visited_place_ids]
        
        if not unvisited:
            return None
        
        # 사용자 선호도 기반 정렬
        scored_places = []
        for place in unvisited:
            score = self._calculate_preference_score(place, user)
            scored_places.append((score, place))
        
        scored_places.sort(reverse=True)
        
        return scored_places[0][1] if scored_places else None
    
    def _calculate_preference_score(self, place: Dict, user: Dict) -> float:
        """
        사용자 선호도 점수 계산
        """
        
        score = 0.0
        
        # 카테고리 선호도
        preferred_categories = user.get("preferred_categories", [])
        if place["category"] in preferred_categories:
            score += 10.0
        
        # vibe_tags 매칭
        user_personality = user.get("personality", {})
        if user_personality.get("openness", 0.5) > 0.7:
            if "artistic" in place.get("vibe_tags", []) or "hidden" in place.get("vibe_tags", []):
                score += 5.0
        
        # 평점
        score += place.get("average_rating", 4.0) * 2
        
        return score
    
    async def _generate_next_suggestion(
        self,
        current_place: Dict,
        next_place: Dict,
        user: Dict,
        elapsed_minutes: float
    ) -> Dict:
        """
        다음 장소 제안 메시지 생성
        """
        
        distance_meters = self._calculate_distance(
            current_place["latitude"], current_place["longitude"],
            next_place["latitude"], next_place["longitude"]
        )
        
        walk_minutes = int(distance_meters / 80)  # 80m/분
        
        now = datetime.now()
        time_context = self._get_time_context(now)
        
        prompt = f"""
사용자가 {current_place['name']}에서 {int(elapsed_minutes)}분 체류 중입니다.

다음 추천 장소:
- 이름: {next_place['name']}
- 카테고리: {next_place['category']}
- 거리: 도보 {walk_minutes}분 ({distance_meters}m)
- 분위기: {', '.join(next_place.get('vibe_tags', []))}

현재 시간: {now.strftime('%H:%M')}
시간 컨텍스트: {time_context}

다음 장소로 이동을 제안하는 메시지를 작성하세요:
1. 부드러운 제안 (강요하지 않음)
2. 이동 이유 (왜 지금 가면 좋은지)
3. 타이밍 팁 (골든아워, 한적한 시간 등)

출력 형식:
{{
  "message": "다음 장소로 이동할까요?",
  "reason": "여기서 도보 {walk_minutes}분 거리에 {next_place['name']}이(가) 있어요. {next_place['category']} 분위기가 좋아요.",
  "timing_tip": "지금 가면 골든아워 빛을 받을 수 있어요 🌅"
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            
            suggestion_text = response.content[0].text.strip()
            
            if "```json" in suggestion_text:
                suggestion_text = suggestion_text.split("```json")[1].split("```")[0].strip()
            elif "```" in suggestion_text:
                suggestion_text = suggestion_text.split("```")[1].split("```")[0].strip()
            
            suggestion = json.loads(suggestion_text)
            suggestion["next_place"] = next_place
            
            return suggestion
        
        except Exception as e:
            print(f"❌ 다음 제안 생성 실패: {e}")
            
            return {
                "message": "다음 장소로 이동할까요?",
                "next_place": next_place,
                "reason": f"여기서 도보 {walk_minutes}분 거리에 {next_place['name']}이(가) 있어요.",
                "timing_tip": "지금 가기 좋은 시간이에요!"
            }
    
    def _get_time_of_day(self, time: datetime) -> str:
        """
        시간대 구분
        """
        hour = time.hour
        
        if hour < 6:
            return "새벽"
        elif hour < 12:
            return "오전"
        elif hour < 18:
            return "오후"
        elif hour < 22:
            return "저녁"
        else:
            return "밤"
    
    def _get_time_context(self, time: datetime) -> str:
        """
        시간 컨텍스트
        """
        hour = time.hour
        
        if 16 <= hour <= 18:
            return "골든아워 (석양)"
        elif 18 <= hour <= 20:
            return "저녁 식사 시간"
        elif 14 <= hour <= 16:
            return "오후 티타임"
        elif 11 <= hour <= 13:
            return "점심 시간"
        else:
            return "한적한 시간"
    
    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> int:
        """
        두 지점 간 거리 계산 (미터)
        """
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371000  # 지구 반지름 (미터)
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lng = radians(lng2 - lng1)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        distance = R * c
        
        return int(distance)
    
    async def _get_weather(self, latitude: float, longitude: float) -> Dict:
        """OpenWeather 실제 데이터만 (mock 없음). 실패 시 WeatherUnavailableError."""
        from services.weather_service import get_weather

        return await get_weather(latitude, longitude)
    
    async def _get_place_reviews(self, place_id: str, limit: int = 10) -> List[Dict]:
        """
        장소 리뷰 가져오기
        """
        # TODO: 실제 리뷰 API 연동 (네이버, 카카오)
        return []
    
    def _analyze_reviews(self, reviews: List[Dict]) -> Dict:
        """
        리뷰 분석
        """
        if not reviews:
            return {
                "top_menu": "시그니처 메뉴",
                "best_seat": "창가 자리",
                "popular_time": "오후 2-5시",
                "avg_duration": 60,
                "sources": []
            }
        
        # TODO: AI로 리뷰 분석
        return {
            "top_menu": "시그니처 아메리카노",
            "best_seat": "2층 창가 자리",
            "popular_time": "오후 2-5시",
            "avg_duration": 90,
            "sources": ["네이버 리뷰 15개 분석", "카카오맵 리뷰 8개 분석"]
        }
    
    async def _get_nearby_next_spots(self, place: Dict, user: Dict) -> List[Dict]:
        """
        근처 다음 추천 장소 3개
        """
        nearby = await self.db.find_nearby_places(
            latitude=place["latitude"],
            longitude=place["longitude"],
            radius_km=1.0,
            limit=5
        )
        
        # 사용자 선호도 기반 정렬
        scored = [(self._calculate_preference_score(p, user), p) for p in nearby]
        scored.sort(reverse=True)
        
        return [p for _, p in scored[:3]]
