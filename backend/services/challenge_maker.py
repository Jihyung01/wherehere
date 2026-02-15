# -*- coding: utf-8 -*-
"""
AI 챌린지 메이커
- 사용자 레벨에 맞는 주간/월간 챌린지 생성
- 진행 상황 추적
- AI 코멘트 및 격려
"""

import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from anthropic import Anthropic

from core.config import settings


class ChallengeMakerService:
    """
    AI 기반 챌린지 생성 및 관리
    """
    
    def __init__(self, db):
        self.db = db
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def generate_weekly_challenge(
        self,
        user_id: str
    ) -> Dict:
        """
        사용자 레벨에 맞는 주간 챌린지 생성
        
        Returns:
            {
                "challenge_id": "...",
                "title": "서울 5대 루프탑 정복",
                "description": "도심 위에서 바라보는 특별한 시선",
                "difficulty": "hard",
                "duration_days": 7,
                "places": [...],
                "rewards": {...},
                "tips": "..."
            }
        """
        
        # 사용자 프로필
        user = await self.db.get_user_profile(user_id)
        completed_places = await self.db.get_completed_places(user_id)
        
        # 난이도 결정
        difficulty = self._determine_difficulty(user.get("level", 1))
        
        # AI로 챌린지 생성
        challenge_data = await self._generate_challenge(
            user=user,
            completed_places=completed_places,
            difficulty=difficulty,
            duration_days=7
        )
        
        # DB 저장
        challenge_id = await self.db.create_challenge(
            user_id=user_id,
            challenge_data=challenge_data
        )
        
        challenge_data["challenge_id"] = challenge_id
        
        return challenge_data
    
    def _determine_difficulty(self, user_level: int) -> str:
        """
        사용자 레벨에 따른 난이도 결정
        """
        
        if user_level < 5:
            return "easy"
        elif user_level < 10:
            return "medium"
        else:
            return "hard"
    
    async def _generate_challenge(
        self,
        user: Dict,
        completed_places: List[Dict],
        difficulty: str,
        duration_days: int
    ) -> Dict:
        """
        AI로 챌린지 생성
        """
        
        # 완료한 장소 카테고리 분석
        completed_categories = {}
        for place in completed_places:
            cat = place.get("category", "기타")
            completed_categories[cat] = completed_categories.get(cat, 0) + 1
        
        # 선호 카테고리
        preferred_categories = user.get("preferred_categories", ["카페", "갤러리"])
        
        prompt = f"""
사용자 프로필:
- 레벨: Lv.{user.get('level', 1)}
- 역할: {user.get('primary_role', 'explorer')}
- 완료한 장소: {len(completed_places)}곳
- 완료 카테고리: {json.dumps(completed_categories, ensure_ascii=False)}
- 선호 카테고리: {preferred_categories}

난이도: {difficulty}
기간: {duration_days}일

이번 주 챌린지를 생성하세요:

요구사항:
1. 테마가 명확해야 함 (예: "서울 5대 루프탑 정복", "힙한 카페 마스터")
2. {5 if difficulty == 'easy' else 7 if difficulty == 'medium' else 10}개 장소
3. {duration_days}일 안에 완료 가능
4. 사용자가 아직 안 가본 곳
5. 보상이 매력적 (XP, 뱃지, 지역 해금)
6. 사용자 선호도 반영

난이도 기준:
- easy: 가까운 거리, 쉬운 미션, 5개 장소
- medium: 중간 거리, 다양한 미션, 7개 장소
- hard: 먼 거리, 챌린지 미션, 10개 장소

출력 형식:
{{
  "title": "서울 5대 루프탑 정복",
  "description": "도심 위에서 바라보는 특별한 시선",
  "theme": "rooftop",
  "difficulty": "hard",
  "duration_days": 7,
  "places": [
    {{
      "name": "을지로 루프탑 바",
      "category": "바",
      "region": "중구",
      "why": "석양이 가장 아름다운 곳",
      "order": 1,
      "mission_hint": "석양 사진 촬영하기"
    }},
    ...
  ],
  "rewards": {{
    "xp": 1000,
    "badge_code": "skyline_master",
    "badge_name": "스카이라인 마스터",
    "unlock": "부산 지역 해금"
  }},
  "tips": "주말 오후 5-7시가 골든아워예요. 날씨 좋은 날을 노려보세요!",
  "estimated_cost": 50000,
  "estimated_time": "3-4시간 × 5일"
}}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            challenge_text = response.content[0].text.strip()
            
            if "```json" in challenge_text:
                challenge_text = challenge_text.split("```json")[1].split("```")[0].strip()
            elif "```" in challenge_text:
                challenge_text = challenge_text.split("```")[1].split("```")[0].strip()
            
            challenge = json.loads(challenge_text)
            
            # 장소 ID 매칭 (실제 DB에서 찾기)
            for place_data in challenge["places"]:
                # TODO: 실제 장소 검색
                place_data["place_id"] = None
                place_data["completed"] = False
            
            # 마감일 설정
            challenge["created_at"] = datetime.now()
            challenge["deadline"] = datetime.now() + timedelta(days=duration_days)
            challenge["status"] = "active"
            
            print(f"✅ 챌린지 생성: {challenge['title']}")
            
            return challenge
        
        except Exception as e:
            print(f"❌ 챌린지 생성 실패: {e}")
            
            # 폴백: 기본 챌린지
            return self._get_default_challenge(difficulty, duration_days)
    
    def _get_default_challenge(self, difficulty: str, duration_days: int) -> Dict:
        """
        기본 챌린지 (폴백)
        """
        
        place_count = 5 if difficulty == "easy" else 7 if difficulty == "medium" else 10
        
        return {
            "title": "서울 탐험가 도전",
            "description": "서울의 숨은 보석을 찾아 떠나는 여정",
            "theme": "exploration",
            "difficulty": difficulty,
            "duration_days": duration_days,
            "places": [
                {
                    "name": f"장소 {i+1}",
                    "category": "카페",
                    "region": "강남구",
                    "why": "특별한 곳",
                    "order": i + 1,
                    "place_id": None,
                    "completed": False
                }
                for i in range(place_count)
            ],
            "rewards": {
                "xp": 500 * place_count,
                "badge_code": "explorer_challenge",
                "badge_name": "탐험가 챌린지",
                "unlock": None
            },
            "tips": "하나씩 천천히 완료해보세요!",
            "created_at": datetime.now(),
            "deadline": datetime.now() + timedelta(days=duration_days),
            "status": "active"
        }
    
    async def get_challenge_progress(
        self,
        challenge_id: str,
        user_id: str
    ) -> Dict:
        """
        챌린지 진행 상황 조회
        
        Returns:
            {
                "challenge": {...},
                "completed_places": [...],
                "progress": 0.6,
                "days_left": 3,
                "ai_comment": "...",
                "next_recommendation": {...}
            }
        """
        
        challenge = await self.db.get_challenge(challenge_id)
        
        if not challenge:
            return {"error": "챌린지를 찾을 수 없어요"}
        
        # 완료한 장소
        completed_place_ids = await self.db.get_completed_places_in_challenge(
            challenge_id, user_id
        )
        
        # 진행률
        total_places = len(challenge["places"])
        completed_count = len(completed_place_ids)
        progress = completed_count / total_places if total_places > 0 else 0
        
        # 남은 일수
        days_left = (challenge["deadline"] - datetime.now()).days
        
        # AI 코멘트
        ai_comment = await self._generate_progress_comment(
            challenge=challenge,
            progress=progress,
            days_left=days_left,
            user_id=user_id
        )
        
        # 다음 추천 장소
        next_place = self._get_next_recommended_place(
            challenge=challenge,
            completed_place_ids=completed_place_ids
        )
        
        return {
            "challenge": challenge,
            "completed_places": completed_place_ids,
            "completed_count": completed_count,
            "total_places": total_places,
            "progress": progress,
            "days_left": days_left,
            "ai_comment": ai_comment,
            "next_recommendation": next_place
        }
    
    async def _generate_progress_comment(
        self,
        challenge: Dict,
        progress: float,
        days_left: int,
        user_id: str
    ) -> str:
        """
        AI 진행 상황 코멘트 생성
        """
        
        user = await self.db.get_user_profile(user_id)
        
        # 상황 분석
        if progress >= 1.0:
            situation = "완료"
        elif progress >= 0.8:
            situation = "거의 완료"
        elif progress >= 0.5:
            situation = "중반"
        elif progress < 0.3 and days_left < 3:
            situation = "위기"
        else:
            situation = "시작"
        
        prompt = f"""
챌린지: {challenge['title']}
진행률: {progress*100:.0f}%
남은 일수: {days_left}일
상황: {situation}

사용자 성격:
- 외향성: {user.get('personality', {}).get('extraversion', 0.5):.2f}
- 성실성: {user.get('personality', {}).get('conscientiousness', 0.5):.2f}

상황에 맞는 AI 코멘트를 작성하세요 (1-2문장):

예시:
- 완료: "축하해요! 챌린지를 완료했어요! 🎉"
- 거의 완료: "거의 다 왔어요! 마지막 스퍼트! 🔥"
- 중반: "좋은 페이스예요! 이대로만 가면 완료할 수 있어요 💪"
- 위기: "서두르세요! 시간이 얼마 안 남았어요 ⏰"
- 시작: "좋은 시작이에요! 하나씩 완료해나가요 🎯"

출력: 코멘트만 (JSON 없이)
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            
            comment = response.content[0].text.strip()
            
            return comment
        
        except Exception as e:
            print(f"❌ AI 코멘트 생성 실패: {e}")
            
            # 폴백
            if progress >= 1.0:
                return "축하해요! 챌린지를 완료했어요! 🎉"
            elif progress >= 0.8:
                return "거의 다 왔어요! 마지막 스퍼트! 🔥"
            elif progress >= 0.5:
                return "좋은 페이스예요! 이대로만 가면 완료할 수 있어요 💪"
            elif progress < 0.3 and days_left < 3:
                return "서두르세요! 시간이 얼마 안 남았어요 ⏰"
            else:
                return "좋은 시작이에요! 하나씩 완료해나가요 🎯"
    
    def _get_next_recommended_place(
        self,
        challenge: Dict,
        completed_place_ids: List[str]
    ) -> Optional[Dict]:
        """
        다음 추천 장소
        """
        
        for place in challenge["places"]:
            if place.get("place_id") not in completed_place_ids:
                return place
        
        return None
    
    async def complete_challenge(
        self,
        challenge_id: str,
        user_id: str
    ) -> Dict:
        """
        챌린지 완료 처리
        
        Returns:
            {
                "success": True,
                "rewards": {...},
                "badge": {...},
                "next_challenge": {...}
            }
        """
        
        challenge = await self.db.get_challenge(challenge_id)
        
        # 완료 체크
        completed_place_ids = await self.db.get_completed_places_in_challenge(
            challenge_id, user_id
        )
        
        total_places = len(challenge["places"])
        completed_count = len(completed_place_ids)
        
        if completed_count < total_places:
            return {
                "success": False,
                "error": f"아직 {total_places - completed_count}개 장소가 남았어요"
            }
        
        # 보상 지급
        rewards = challenge["rewards"]
        
        # XP 지급
        await self.db.add_user_xp(user_id, rewards["xp"])
        
        # 뱃지 지급
        badge = None
        if rewards.get("badge_code"):
            badge = await self.db.award_badge(user_id, rewards["badge_code"])
        
        # 지역 해금
        if rewards.get("unlock"):
            await self.db.unlock_region(user_id, rewards["unlock"])
        
        # 챌린지 상태 업데이트
        await self.db.update_challenge_status(challenge_id, "completed", datetime.now())
        
        # 다음 챌린지 생성
        next_challenge = await self.generate_weekly_challenge(user_id)
        
        print(f"🏆 챌린지 완료: {challenge['title']} by {user_id}")
        
        return {
            "success": True,
            "rewards": rewards,
            "badge": badge,
            "next_challenge": next_challenge,
            "completion_message": f"축하해요! '{challenge['title']}' 챌린지를 완료했어요! 🎉"
        }
    
    async def get_user_challenges(
        self,
        user_id: str,
        status: Optional[str] = None
    ) -> List[Dict]:
        """
        사용자의 챌린지 목록
        
        Args:
            status: "active", "completed", "failed", "abandoned"
        """
        
        challenges = await self.db.get_user_challenges(user_id, status=status)
        
        # 진행률 추가
        for challenge in challenges:
            completed_place_ids = await self.db.get_completed_places_in_challenge(
                challenge["id"], user_id
            )
            
            total_places = len(challenge["places"])
            completed_count = len(completed_place_ids)
            
            challenge["progress"] = completed_count / total_places if total_places > 0 else 0
            challenge["completed_count"] = completed_count
            challenge["total_places"] = total_places
            challenge["days_left"] = (challenge["deadline"] - datetime.now()).days
        
        return challenges
    
    async def abandon_challenge(
        self,
        challenge_id: str,
        user_id: str
    ) -> Dict:
        """
        챌린지 포기
        """
        
        await self.db.update_challenge_status(challenge_id, "abandoned", None)
        
        return {
            "success": True,
            "message": "챌린지를 포기했어요. 다음에 다시 도전해보세요!"
        }
