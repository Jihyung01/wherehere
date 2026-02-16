# -*- coding: utf-8 -*-
"""
챌린지 API 라우트
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel

from services.challenge_maker import ChallengeMakerService
from core.dependencies import get_db


router = APIRouter(prefix="/api/v1/challenges", tags=["Challenges"])


class GenerateChallengeRequest(BaseModel):
    user_id: str


class CompleteChallengeRequest(BaseModel):
    challenge_id: str
    user_id: str


@router.post("/generate")
async def generate_challenge(
    request: GenerateChallengeRequest,
    db = Depends(get_db)
):
    """주간 챌린지 생성"""
    try:
        # Mock 모드: 샘플 챌린지 반환
        if db is None:
            from datetime import datetime, timedelta
            return {
                "challenge_id": "mock-challenge-001",
                "title": "서울 카페 탐험가",
                "description": "서울의 숨은 카페 5곳을 발견하세요",
                "theme": "카페 탐방",
                "difficulty": "medium",
                "duration_days": 7,
                "places": [
                    {
                        "name": "연남동 숨은 카페",
                        "category": "카페",
                        "region": "연남동",
                        "why": "조용하고 아늑한 분위기",
                        "order": 1,
                        "completed": False
                    },
                    {
                        "name": "성수동 루프탑 카페",
                        "category": "카페",
                        "region": "성수동",
                        "why": "뷰가 좋은 루프탑",
                        "order": 2,
                        "completed": False
                    },
                    {
                        "name": "이태원 북카페",
                        "category": "카페",
                        "region": "이태원",
                        "why": "책과 함께하는 여유",
                        "order": 3,
                        "completed": False
                    }
                ],
                "rewards": {
                    "xp": 1000,
                    "badge_code": "cafe_explorer",
                    "badge_name": "카페 탐험가",
                    "unlock": None
                },
                "tips": "주말에 방문하면 더 좋아요!",
                "created_at": datetime.now().isoformat(),
                "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": "active"
            }
        
        challenge_maker = ChallengeMakerService(db)
        challenge = await challenge_maker.generate_weekly_challenge(request.user_id)
        return challenge
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Challenge generation error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # 에러 시 기본 챌린지 반환
        from datetime import datetime, timedelta
        return {
            "challenge_id": f"challenge-{request.user_id}-fallback",
            "title": "서울 탐험 시작하기",
            "description": "새로운 장소 3곳을 방문해보세요",
            "theme": "기본 탐험",
            "difficulty": "easy",
            "duration_days": 7,
            "places": [],
            "rewards": {"xp": 500, "badge_code": "starter", "badge_name": "시작하는 탐험가"},
            "tips": "첫 탐험을 시작해보세요!",
            "created_at": datetime.now().isoformat(),
            "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
            "status": "active"
        }


@router.get("/{challenge_id}/progress")
async def get_challenge_progress(
    challenge_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """챌린지 진행 상황 조회"""
    try:
        # Mock 모드: 샘플 진행 상황 반환
        if db is None:
            from datetime import datetime, timedelta
            return {
                "challenge": {
                    "challenge_id": challenge_id,
                    "title": "서울 카페 탐험가",
                    "description": "서울의 숨은 카페 5곳을 발견하세요",
                    "difficulty": "medium",
                    "places": [
                        {"name": "연남동 숨은 카페", "category": "카페", "region": "연남동", "why": "조용하고 아늑한 분위기", "order": 1, "completed": False},
                        {"name": "성수동 루프탑 카페", "category": "카페", "region": "성수동", "why": "뷰가 좋은 루프탑", "order": 2, "completed": False},
                        {"name": "이태원 북카페", "category": "카페", "region": "이태원", "why": "책과 함께하는 여유", "order": 3, "completed": False}
                    ],
                    "rewards": {"xp": 1000, "badge_code": "cafe_explorer", "badge_name": "카페 탐험가"},
                    "deadline": (datetime.now() + timedelta(days=7)).isoformat()
                },
                "completed_places": [],
                "completed_count": 0,
                "total_places": 3,
                "progress": 0.0,
                "days_left": 7,
                "ai_comment": "좋은 시작이에요! 첫 번째 카페부터 방문해보세요 ☕",
                "next_recommendation": {
                    "name": "연남동 숨은 카페",
                    "category": "카페",
                    "region": "연남동",
                    "why": "조용하고 아늑한 분위기",
                    "order": 1
                }
            }
        
        challenge_maker = ChallengeMakerService(db)
        progress = await challenge_maker.get_challenge_progress(challenge_id, user_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete_challenge(
    request: CompleteChallengeRequest,
    db = Depends(get_db)
):
    """챌린지 완료 처리"""
    try:
        challenge_maker = ChallengeMakerService(db)
        result = await challenge_maker.complete_challenge(request.challenge_id, request.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
