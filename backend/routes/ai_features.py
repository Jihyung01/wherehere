# -*- coding: utf-8 -*-
"""
AI 기능 API 라우트
- 개인화 프로필
- 맞춤형 미션
- 위치 기반 가이드
- 패턴 분석
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from services.personalization import PersonalizationService
from services.mission_generator import MissionGenerator
from services.location_guide import LocationGuideService
from core.dependencies import get_db


router = APIRouter(prefix="/api/v1/ai", tags=["AI Features"])


# ============================================================
# Request/Response Models
# ============================================================

class PersonalityAnalysisRequest(BaseModel):
    user_id: str


class ArrivalRequest(BaseModel):
    user_id: str
    quest_id: str
    place_id: str


class PatternAnalysisRequest(BaseModel):
    user_id: str
    days: int = 90


# ============================================================
# 개인화 프로필
# ============================================================

@router.post("/personality/analyze")
async def analyze_personality(
    request: PersonalityAnalysisRequest,
    db = Depends(get_db)
):
    """
    사용자 성격 분석 (Big Five)
    """
    
    try:
        # Mock 모드: 샘플 데이터 반환
        if db is None:
            return {
                "success": True,
                "personality": {
                    "openness": 0.75,
                    "conscientiousness": 0.65,
                    "extraversion": 0.70,
                    "agreeableness": 0.80,
                    "neuroticism": 0.35
                },
                "companion_style": {
                    "tone": "friendly",
                    "emoji_usage": "medium",
                    "formality": "casual",
                    "encouragement_level": 0.7
                }
            }
        
        personalization = PersonalizationService()
        
        # 방문 기록 가져오기
        visits = await db.get_user_visits(request.user_id, days=90)
        
        # AI 분석
        personality = await personalization.analyze_user_personality(
            user_id=request.user_id,
            visits=visits,
            db=db
        )
        
        # AI 동행자 스타일 생성
        companion_style = await personalization.create_ai_companion_style(
            user_id=request.user_id,
            personality=personality,
            db=db
        )
        
        return {
            "success": True,
            "personality": personality,
            "companion_style": companion_style
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personality/{user_id}")
async def get_personality(
    user_id: str,
    db = Depends(get_db)
):
    """
    사용자 성격 프로필 조회
    """
    
    try:
        # Mock 모드: 샘플 데이터 반환
        if db is None:
            return {
                "personality": {
                    "openness": 0.75,
                    "conscientiousness": 0.65,
                    "extraversion": 0.70,
                    "agreeableness": 0.80,
                    "neuroticism": 0.35
                },
                "companion_style": {
                    "tone": "friendly",
                    "emoji_usage": "medium",
                    "formality": "casual",
                    "encouragement_level": 0.7
                },
                "preferred_categories": ["카페", "문화공간", "공원"],
                "behavior_stats": {
                    "total_visits": 0,
                    "avg_duration": 60,
                    "social_ratio": 0.5
                }
            }
        
        profile = await db.get_user_profile(user_id)
        
        return {
            "personality": profile.get("personality", {}),
            "companion_style": profile.get("companion_style", {}),
            "preferred_categories": profile.get("preferred_categories", []),
            "behavior_stats": {
                "total_visits": profile.get("total_visits", 0),
                "avg_duration": profile.get("avg_duration_minutes", 60),
                "social_ratio": profile.get("social_ratio", 0.5)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 위치 기반 가이드
# ============================================================

@router.post("/arrival")
async def on_arrival(
    request: ArrivalRequest,
    db = Depends(get_db)
):
    """
    장소 도착 시 AI 가이드 제공
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        result = await guide_service.on_arrival(
            user_id=request.user_id,
            quest_id=request.quest_id,
            place_id=request.place_id
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{quest_id}")
async def check_progress(
    quest_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """
    진행 중인 퀘스트 체크 및 다음 제안
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        suggestion = await guide_service.check_progress_and_suggest(
            user_id=user_id,
            quest_id=quest_id
        )
        
        if not suggestion:
            return {"message": "아직 30분이 지나지 않았어요"}
        
        return suggestion
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 패턴 분석
# ============================================================

@router.post("/pattern/analyze")
async def analyze_pattern(
    request: PatternAnalysisRequest,
    db = Depends(get_db)
):
    """
    사용자 패턴 분석 (지도 시각화용)
    """
    
    try:
        # Mock 모드: 샘플 데이터 반환
        if db is None:
            return {
                "insufficient_data": True,
                "message": "아직 충분한 데이터가 없어요. 3개 이상의 장소를 방문해주세요!",
                "stats": {
                    "total_visits": 0,
                    "category_distribution": {},
                    "time_preference": {},
                    "avg_duration": 0,
                    "avg_budget": 0,
                    "max_budget": 0,
                    "total_distance_km": 0,
                    "exploration_radius_km": 0,
                    "main_region": "서울"
                },
                "ai_analysis": {
                    "style_name": "신규 탐험가",
                    "style_emoji": "🌱",
                    "style_description": "이제 막 탐험을 시작했어요",
                    "characteristics": [],
                    "recommendations": []
                }
            }
        
        personalization = PersonalizationService()
        
        analysis = await personalization.analyze_user_pattern(
            user_id=request.user_id,
            days=request.days,
            db=db
        )
        
        return analysis
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 개인화 메시지
# ============================================================

@router.post("/message/generate")
async def generate_personalized_message(
    user_id: str,
    context_type: str,
    context_data: dict,
    db = Depends(get_db)
):
    """
    개인화된 AI 메시지 생성
    
    context_type: "arrival", "mission_complete", "recommendation"
    """
    
    try:
        personalization = PersonalizationService()
        
        message = await personalization.generate_personalized_message(
            user_id=user_id,
            context_type=context_type,
            context_data=context_data,
            db=db
        )
        
        return {"message": message}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
