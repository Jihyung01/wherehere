# -*- coding: utf-8 -*-
"""
소셜 기능 API 라우트
- 모임 생성/참여
- 소셜 공유
- 매칭 시스템
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from services.social_matching import SocialMatchingService
from services.social_share import SocialShareService
from core.dependencies import get_db


router = APIRouter(prefix="/api/v1/social", tags=["Social"])


# ============================================================
# Request Models
# ============================================================

class CreateGatheringRequest(BaseModel):
    creator_id: str
    place_id: str
    scheduled_time: datetime
    title: Optional[str] = None
    description: Optional[str] = None
    max_participants: int = 4


class JoinGatheringRequest(BaseModel):
    gathering_id: str
    user_id: str


class CreateShareRequest(BaseModel):
    user_id: str
    quest_id: str
    place_id: str
    quest_data: dict


# ============================================================
# 모임 (Gathering)
# ============================================================

@router.post("/gatherings/create")
async def create_gathering(
    request: CreateGatheringRequest,
    db = Depends(get_db)
):
    """모임 생성"""
    try:
        matching = SocialMatchingService(db)
        
        gathering = await matching.create_gathering(
            creator_id=request.creator_id,
            place_id=request.place_id,
            scheduled_time=request.scheduled_time,
            title=request.title,
            description=request.description,
            max_participants=request.max_participants
        )
        
        return gathering
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gatherings/join")
async def join_gathering(
    request: JoinGatheringRequest,
    db = Depends(get_db)
):
    """모임 참여"""
    try:
        matching = SocialMatchingService(db)
        
        result = await matching.join_gathering(
            gathering_id=request.gathering_id,
            user_id=request.user_id
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gatherings/{gathering_id}")
async def get_gathering_details(
    gathering_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """모임 상세 정보"""
    try:
        matching = SocialMatchingService(db)
        
        details = await matching.get_gathering_details(
            gathering_id=gathering_id,
            user_id=user_id
        )
        
        return details
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gatherings/recommended/{user_id}")
async def get_recommended_gatherings(
    user_id: str,
    limit: int = 10,
    db = Depends(get_db)
):
    """추천 모임 목록"""
    try:
        matching = SocialMatchingService(db)
        
        gatherings = await matching.get_recommended_gatherings(
            user_id=user_id,
            limit=limit
        )
        
        return {"gatherings": gatherings}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 매칭
# ============================================================

@router.post("/matches/find")
async def find_matches(
    user_id: str,
    place_id: str,
    scheduled_time: datetime,
    max_distance_km: float = 5.0,
    db = Depends(get_db)
):
    """비슷한 취향의 사용자 매칭"""
    try:
        matching = SocialMatchingService(db)
        
        matches = await matching.find_matches(
            user_id=user_id,
            place_id=place_id,
            scheduled_time=scheduled_time,
            max_distance_km=max_distance_km
        )
        
        return {"matches": matches}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 소셜 공유
# ============================================================

@router.post("/share/create")
async def create_share_link(
    request: CreateShareRequest,
    db = Depends(get_db)
):
    """공유 링크 생성"""
    try:
        share_service = SocialShareService(db)
        
        share = await share_service.create_share_link(
            user_id=request.user_id,
            quest_id=request.quest_id,
            place_id=request.place_id,
            quest_data=request.quest_data
        )
        
        return share
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/share/{share_id}")
async def get_share_data(
    share_id: str,
    db = Depends(get_db)
):
    """공유 데이터 조회"""
    try:
        share_service = SocialShareService(db)
        
        share = await share_service.get_share_data(share_id)
        
        if not share:
            raise HTTPException(status_code=404, detail="공유 링크를 찾을 수 없거나 만료되었어요")
        
        return share
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
