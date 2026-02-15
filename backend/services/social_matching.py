# -*- coding: utf-8 -*-
"""
AI 소셜 매칭 시스템
- 비슷한 취향의 사용자 매칭
- 모임 생성 및 참여
- 안전한 매칭 (AI 성향 분석)
"""

import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from anthropic import Anthropic

from core.config import settings


class SocialMatchingService:
    """
    AI 기반 소셜 매칭 서비스
    """
    
    def __init__(self, db):
        self.db = db
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def find_matches(
        self,
        user_id: str,
        place_id: str,
        scheduled_time: datetime,
        max_distance_km: float = 5.0
    ) -> List[Dict]:
        """
        비슷한 취향의 사용자 매칭
        
        Returns:
            [
                {
                    "user": {...},
                    "match_score": 0.87,
                    "reasons": ["공통 관심사: 보드게임, 카페", ...]
                },
                ...
            ]
        """
        
        # 사용자 프로필
        user = await self.db.get_user_profile(user_id)
        place = await self.db.get_place(place_id)
        
        # 후보 찾기 (근처 + 비슷한 시간대 활동)
        candidates = await self._find_candidates(
            user_location=user.get("current_location", place),
            max_distance_km=max_distance_km,
            scheduled_time=scheduled_time,
            exclude_user_ids=[user_id]
        )
        
        if not candidates:
            return []
        
        # AI 매칭 점수 계산
        matches = []
        for candidate in candidates:
            score = await self._calculate_match_score(
                user1=user,
                user2=candidate,
                place=place
            )
            
            if score["score"] >= 0.7:  # 70% 이상만
                matches.append({
                    "user": candidate,
                    "match_score": score["score"],
                    "reasons": score["reasons"],
                    "compatibility": score.get("compatibility", "good")
                })
        
        # 점수 순 정렬
        matches.sort(key=lambda x: x["match_score"], reverse=True)
        
        return matches[:10]  # 상위 10명
    
    async def _find_candidates(
        self,
        user_location: Dict,
        max_distance_km: float,
        scheduled_time: datetime,
        exclude_user_ids: List[str]
    ) -> List[Dict]:
        """
        매칭 후보 찾기
        """
        
        # 근처 활동 중인 사용자
        candidates = await self.db.find_nearby_active_users(
            latitude=user_location["latitude"],
            longitude=user_location["longitude"],
            radius_km=max_distance_km,
            exclude_user_ids=exclude_user_ids
        )
        
        # 시간대 필터 (±2시간)
        time_window_start = scheduled_time - timedelta(hours=2)
        time_window_end = scheduled_time + timedelta(hours=2)
        
        filtered = []
        for candidate in candidates:
            # 선호 시간대 체크
            preferred_time_start = candidate.get("preferred_time_start", "14:00")
            preferred_time_end = candidate.get("preferred_time_end", "18:00")
            
            # TODO: 시간대 매칭 로직
            filtered.append(candidate)
        
        return filtered
    
    async def _calculate_match_score(
        self,
        user1: Dict,
        user2: Dict,
        place: Dict
    ) -> Dict:
        """
        AI로 매칭 점수 계산
        
        Returns:
            {
                "score": 0.87,
                "reasons": ["공통 관심사: 보드게임, 카페", ...],
                "compatibility": "excellent"
            }
        """
        
        prompt = f"""
두 사용자의 매칭 점수를 계산하세요.

사용자 A:
- 관심사: {user1.get('interests', ['탐험', '카페'])}
- 성격: Openness {user1.get('personality', {}).get('openness', 0.5):.2f}, Extraversion {user1.get('personality', {}).get('extraversion', 0.5):.2f}
- 나이대: {user1.get('age_range', '20대')}
- 선호 활동: {user1.get('preferred_categories', ['카페', '갤러리'])}
- 레벨: Lv.{user1.get('level', 1)}

사용자 B:
- 관심사: {user2.get('interests', ['탐험', '카페'])}
- 성격: Openness {user2.get('personality', {}).get('openness', 0.5):.2f}, Extraversion {user2.get('personality', {}).get('extraversion', 0.5):.2f}
- 나이대: {user2.get('age_range', '20대')}
- 선호 활동: {user2.get('preferred_categories', ['카페', '갤러리'])}
- 레벨: Lv.{user2.get('level', 1)}

활동 장소:
- 이름: {place['name']}
- 카테고리: {place['category']}
- 분위기: {', '.join(place.get('vibe_tags', []))}

이 두 사용자가 이 장소에서 함께 활동하기에 얼마나 잘 맞는지 평가하세요.

고려 사항:
1. 공통 관심사 (가중치 30%)
2. 성격 궁합 (가중치 30%)
   - 비슷한 성격 (편안함)
   - 보완적 성격 (균형)
3. 활동 스타일 (가중치 20%)
   - 조용함 vs 활발함
   - 계획적 vs 즉흥적
4. 레벨 차이 (가중치 10%)
   - 너무 차이 나면 감점
5. 나이대 (가중치 10%)

출력 형식:
{{
  "score": 0.87,
  "reasons": [
    "공통 관심사: 카페, 갤러리 탐험",
    "성격 궁합: 둘 다 개방적이고 사교적 (Extraversion 높음)",
    "비슷한 레벨: Lv.7, Lv.9 (함께 성장 가능)",
    "나이대 비슷: 20대 후반"
  ],
  "compatibility": "excellent",
  "potential_issues": []
}}

compatibility: "excellent" (90%+), "good" (70-89%), "fair" (50-69%), "poor" (<50%)
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            return result
        
        except Exception as e:
            print(f"❌ 매칭 점수 계산 실패: {e}")
            
            # 폴백: 간단한 점수 계산
            score = 0.5
            
            # 공통 관심사
            common_interests = set(user1.get('interests', [])) & set(user2.get('interests', []))
            score += len(common_interests) * 0.1
            
            # 성격 유사도
            p1 = user1.get('personality', {})
            p2 = user2.get('personality', {})
            personality_diff = abs(p1.get('extraversion', 0.5) - p2.get('extraversion', 0.5))
            score += (1 - personality_diff) * 0.2
            
            return {
                "score": min(score, 1.0),
                "reasons": ["기본 매칭"],
                "compatibility": "good" if score >= 0.7 else "fair"
            }
    
    async def create_gathering(
        self,
        creator_id: str,
        place_id: str,
        scheduled_time: datetime,
        title: Optional[str] = None,
        description: Optional[str] = None,
        max_participants: int = 4
    ) -> Dict:
        """
        모임 생성
        
        Returns:
            {
                "gathering_id": "...",
                "title": "...",
                "place": {...},
                "scheduled_time": "...",
                "creator": {...},
                "matches": [...]
            }
        """
        
        place = await self.db.get_place(place_id)
        creator = await self.db.get_user_profile(creator_id)
        
        # 제목 자동 생성
        if not title:
            title = f"{place['name']}에서 만나요!"
        
        # 모임 생성
        gathering_data = {
            "creator_id": creator_id,
            "place_id": place_id,
            "title": title,
            "description": description or f"{place['category']} 함께 즐겨요!",
            "scheduled_time": scheduled_time,
            "max_participants": max_participants,
            "current_participants": 1,
            "status": "open"
        }
        
        gathering_id = await self.db.create_gathering(gathering_data)
        
        # 매칭 가능한 사용자 찾기
        matches = await self.find_matches(
            user_id=creator_id,
            place_id=place_id,
            scheduled_time=scheduled_time
        )
        
        # 상위 10명에게 알림
        for match in matches[:10]:
            await self._send_gathering_invitation(
                gathering_id=gathering_id,
                invitee_id=match["user"]["id"],
                match_score=match["match_score"],
                reasons=match["reasons"]
            )
        
        return {
            "gathering_id": gathering_id,
            "title": title,
            "place": place,
            "scheduled_time": scheduled_time,
            "creator": creator,
            "matches": matches[:10]
        }
    
    async def join_gathering(
        self,
        gathering_id: str,
        user_id: str
    ) -> Dict:
        """
        모임 참여
        """
        
        gathering = await self.db.get_gathering(gathering_id)
        
        # 정원 체크
        if gathering["current_participants"] >= gathering["max_participants"]:
            return {
                "success": False,
                "error": "모임이 이미 가득 찼어요"
            }
        
        # 매칭 점수 계산
        creator = await self.db.get_user_profile(gathering["creator_id"])
        user = await self.db.get_user_profile(user_id)
        place = await self.db.get_place(gathering["place_id"])
        
        match_score_data = await self._calculate_match_score(creator, user, place)
        
        # 참여 기록
        await self.db.add_gathering_participant(
            gathering_id=gathering_id,
            user_id=user_id,
            match_score=match_score_data["score"]
        )
        
        # 참여자 수 증가
        await self.db.increment_gathering_participants(gathering_id)
        
        # 정원 도달 시 상태 변경
        new_count = gathering["current_participants"] + 1
        if new_count >= gathering["max_participants"]:
            await self.db.update_gathering_status(gathering_id, "full")
        
        # 알림 전송 (생성자에게)
        await self._notify_gathering_join(
            gathering_id=gathering_id,
            creator_id=gathering["creator_id"],
            new_member=user,
            match_score=match_score_data["score"]
        )
        
        return {
            "success": True,
            "gathering": gathering,
            "match_score": match_score_data["score"],
            "reasons": match_score_data["reasons"]
        }
    
    async def get_recommended_gatherings(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        사용자에게 추천하는 모임 목록
        """
        
        user = await self.db.get_user_profile(user_id)
        
        # 열린 모임 조회
        open_gatherings = await self.db.get_open_gatherings(limit=50)
        
        # 매칭 점수 계산
        scored_gatherings = []
        for gathering in open_gatherings:
            creator = await self.db.get_user_profile(gathering["creator_id"])
            place = await self.db.get_place(gathering["place_id"])
            
            match_score_data = await self._calculate_match_score(user, creator, place)
            
            if match_score_data["score"] >= 0.6:  # 60% 이상만
                scored_gatherings.append({
                    "gathering": gathering,
                    "place": place,
                    "creator": creator,
                    "match_score": match_score_data["score"],
                    "reasons": match_score_data["reasons"]
                })
        
        # 점수 순 정렬
        scored_gatherings.sort(key=lambda x: x["match_score"], reverse=True)
        
        return scored_gatherings[:limit]
    
    async def _send_gathering_invitation(
        self,
        gathering_id: str,
        invitee_id: str,
        match_score: float,
        reasons: List[str]
    ):
        """
        모임 초대 알림 전송
        """
        
        gathering = await self.db.get_gathering(gathering_id)
        place = await self.db.get_place(gathering["place_id"])
        
        # TODO: 푸시 알림 전송
        notification = {
            "user_id": invitee_id,
            "type": "gathering_invitation",
            "title": f"🤝 {place['name']} 모임 초대",
            "body": f"매칭 점수 {int(match_score*100)}% - {reasons[0] if reasons else '함께 즐겨요!'}",
            "data": {
                "gathering_id": gathering_id,
                "match_score": match_score
            }
        }
        
        print(f"📬 모임 초대 알림: {invitee_id} -> {gathering_id}")
        
        # await push_notification_service.send(notification)
    
    async def _notify_gathering_join(
        self,
        gathering_id: str,
        creator_id: str,
        new_member: Dict,
        match_score: float
    ):
        """
        모임 참여 알림 (생성자에게)
        """
        
        notification = {
            "user_id": creator_id,
            "type": "gathering_join",
            "title": "🎉 새로운 멤버가 참여했어요!",
            "body": f"{new_member.get('nickname', '탐험가')}님이 모임에 참여했어요 (매칭 {int(match_score*100)}%)",
            "data": {
                "gathering_id": gathering_id,
                "new_member_id": new_member["id"]
            }
        }
        
        print(f"📬 모임 참여 알림: {creator_id} <- {new_member['id']}")
        
        # await push_notification_service.send(notification)
    
    async def get_gathering_details(
        self,
        gathering_id: str,
        user_id: str
    ) -> Dict:
        """
        모임 상세 정보
        """
        
        gathering = await self.db.get_gathering(gathering_id)
        place = await self.db.get_place(gathering["place_id"])
        creator = await self.db.get_user_profile(gathering["creator_id"])
        participants = await self.db.get_gathering_participants(gathering_id)
        
        # 사용자와의 매칭 점수
        user = await self.db.get_user_profile(user_id)
        match_scores = []
        
        for participant in participants:
            if participant["id"] != user_id:
                score_data = await self._calculate_match_score(user, participant, place)
                match_scores.append({
                    "user": participant,
                    "score": score_data["score"]
                })
        
        return {
            "gathering": gathering,
            "place": place,
            "creator": creator,
            "participants": participants,
            "match_scores": match_scores,
            "is_member": user_id in [p["id"] for p in participants],
            "is_full": gathering["current_participants"] >= gathering["max_participants"]
        }
