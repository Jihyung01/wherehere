# -*- coding: utf-8 -*-
"""
챌린지 API 라우트
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel

from services.challenge_maker import ChallengeMakerService
from db.database import get_db


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
        challenge_maker = ChallengeMakerService(db)
        challenge = await challenge_maker.generate_weekly_challenge(request.user_id)
        return challenge
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{challenge_id}/progress")
async def get_challenge_progress(
    challenge_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """챌린지 진행 상황 조회"""
    try:
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
