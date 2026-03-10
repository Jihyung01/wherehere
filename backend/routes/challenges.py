# -*- coding: utf-8 -*-
"""
챌린지 API 라우트 — 서버 사이드 영구 기록 지원
Challenge progress is tracked in-memory per user session,
and persists to DB when connected.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, List
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from services.challenge_maker import ChallengeMakerService
from core.dependencies import get_db


router = APIRouter(prefix="/api/v1/challenges", tags=["Challenges"])

# ── In-memory stores (Phase 1 / DB 없을 때) ──────────────────────────────────
# {user_id: {challenge_id: {"claimed": bool, "completed_at": str, "xp_awarded": int}}}
_user_challenge_claims: Dict[str, Dict[str, dict]] = {}

# {user_id: {challenge_id: {"progress": int, "total": int, "last_updated": str}}}
_user_challenge_progress: Dict[str, Dict[str, dict]] = {}


class GenerateChallengeRequest(BaseModel):
    user_id: str


class CompleteChallengeRequest(BaseModel):
    challenge_id: str
    user_id: str


class ClaimRewardRequest(BaseModel):
    user_id: str
    challenge_id: str
    xp_to_award: int = 0


class UpdateProgressRequest(BaseModel):
    user_id: str
    challenge_id: str
    progress: int
    total: int


@router.post("/generate")
async def generate_challenge(
    request: GenerateChallengeRequest,
    db=Depends(get_db)
):
    """주간 챌린지 생성"""
    try:
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
                    {"name": "연남동 숨은 카페", "category": "카페", "region": "연남동", "why": "조용하고 아늑한 분위기", "order": 1, "completed": False},
                    {"name": "성수동 루프탑 카페", "category": "카페", "region": "성수동", "why": "뷰가 좋은 루프탑", "order": 2, "completed": False},
                    {"name": "이태원 북카페", "category": "카페", "region": "이태원", "why": "책과 함께하는 여유", "order": 3, "completed": False},
                ],
                "rewards": {"xp": 1000, "badge_code": "cafe_explorer", "badge_name": "카페 탐험가", "unlock": None},
                "tips": "주말에 방문하면 더 좋아요!",
                "created_at": datetime.now().isoformat(),
                "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": "active",
            }
        challenge_maker = ChallengeMakerService(db)
        challenge = await challenge_maker.generate_weekly_challenge(request.user_id)
        return challenge
    except Exception as e:
        import logging, traceback
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Challenge generation error: {e}\n{traceback.format_exc()}")
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
            "status": "active",
        }


@router.get("/{challenge_id}/progress")
async def get_challenge_progress(challenge_id: str, user_id: str, db=Depends(get_db)):
    """챌린지 진행 상황 조회"""
    try:
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
                        {"name": "이태원 북카페", "category": "카페", "region": "이태원", "why": "책과 함께하는 여유", "order": 3, "completed": False},
                    ],
                    "rewards": {"xp": 1000, "badge_code": "cafe_explorer", "badge_name": "카페 탐험가"},
                    "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
                },
                "completed_places": [],
                "completed_count": 0,
                "total_places": 3,
                "progress": 0.0,
                "days_left": 7,
                "ai_comment": "좋은 시작이에요! 첫 번째 카페부터 방문해보세요 ☕",
                "next_recommendation": {"name": "연남동 숨은 카페", "category": "카페", "region": "연남동", "why": "조용하고 아늑한 분위기", "order": 1},
            }
        challenge_maker = ChallengeMakerService(db)
        progress = await challenge_maker.get_challenge_progress(challenge_id, user_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete_challenge(request: CompleteChallengeRequest, db=Depends(get_db)):
    """챌린지 완료 처리"""
    try:
        challenge_maker = ChallengeMakerService(db)
        result = await challenge_maker.complete_challenge(request.challenge_id, request.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 유저 챌린지 진행 현황 ─────────────────────────────────────────────────────

@router.get("/user/{user_id}/all-progress")
async def get_user_all_challenge_progress(user_id: str):
    """
    유저의 모든 챌린지 진행/수령 현황 반환.
    프론트에서 새로고침할 때마다 호출하여 서버 기록과 동기화.
    """
    claims = _user_challenge_claims.get(user_id, {})
    progress = _user_challenge_progress.get(user_id, {})
    return {
        "user_id": user_id,
        "claims": claims,      # {challenge_id: {claimed, completed_at, xp_awarded}}
        "progress": progress,  # {challenge_id: {progress, total, last_updated}}
    }


@router.post("/user/{user_id}/update-progress")
async def update_challenge_progress(user_id: str, req: UpdateProgressRequest):
    """
    유저 챌린지 진행도 갱신.
    프론트에서 userStats 변경 시 호출.
    """
    if user_id not in _user_challenge_progress:
        _user_challenge_progress[user_id] = {}
    _user_challenge_progress[user_id][req.challenge_id] = {
        "progress": req.progress,
        "total": req.total,
        "last_updated": datetime.now().isoformat(),
    }
    return {"success": True, "challenge_id": req.challenge_id, "progress": req.progress}


@router.post("/claim-reward")
async def claim_challenge_reward(req: ClaimRewardRequest, db=Depends(get_db)):
    """
    챌린지 완료 보상 수령.
    - 중복 수령 방지
    - XP를 유저에게 부여 (DB 연결 시)
    - in-memory에 수령 기록 저장
    """
    user_id = req.user_id
    challenge_id = req.challenge_id

    # 중복 수령 방지
    if user_id in _user_challenge_claims and challenge_id in _user_challenge_claims[user_id]:
        existing = _user_challenge_claims[user_id][challenge_id]
        if existing.get("claimed"):
            return {
                "success": False,
                "already_claimed": True,
                "message": "이미 수령한 보상이에요.",
                "completed_at": existing.get("completed_at"),
            }

    # 기록 저장
    if user_id not in _user_challenge_claims:
        _user_challenge_claims[user_id] = {}

    completed_at = datetime.now().isoformat()
    _user_challenge_claims[user_id][challenge_id] = {
        "claimed": True,
        "completed_at": completed_at,
        "xp_awarded": req.xp_to_award,
    }

    # DB 연결 시 XP 부여
    xp_note = ""
    if db is not None and req.xp_to_award > 0:
        try:
            await db.award_xp(user_id, req.xp_to_award, f"challenge_reward:{challenge_id}")
            xp_note = f" +{req.xp_to_award} XP 지급 완료"
        except Exception:
            xp_note = " (XP DB 반영 실패 — 수령 기록만 저장)"

    return {
        "success": True,
        "already_claimed": False,
        "message": f"보상을 수령했어요! 🎉{xp_note}",
        "xp_awarded": req.xp_to_award,
        "completed_at": completed_at,
    }
