# -*- coding: utf-8 -*-
"""
방문 기록 API
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from core.dependencies import get_db

router = APIRouter(prefix="/api/v1/visits", tags=["Visits"])


class VisitCreate(BaseModel):
    user_id: str
    place_id: str
    duration_minutes: int
    rating: Optional[float] = None
    mood: Optional[str] = None
    spent_amount: Optional[int] = None
    companions: int = 1


@router.get("/{user_id}")
async def get_user_visits(
    user_id: str,
    days: int = 90,
    db = Depends(get_db)
):
    """사용자 방문 기록 조회"""
    
    try:
        if db is None:
            # Mock 데이터
            return {
                "visits": [],
                "total_count": 0
            }
        
        visits = await db.get_user_visits(user_id, days=days)
        
        # 장소 정보와 조인 (optional - place가 없어도 visit은 표시)
        enriched_visits = []
        for visit in visits:
            place = await db.get_place_by_id(visit.get("place_id"))
            
            enriched_visit = {
                "id": visit.get("id"),
                "place_id": visit.get("place_id"),
                "visited_at": visit.get("visited_at"),
                "duration_minutes": visit.get("duration_minutes", 60),
                "xp_earned": visit.get("xp_earned", 100),
                "mood": visit.get("mood"),
                "rating": visit.get("rating"),
                "spent_amount": visit.get("spent_amount"),
            }
            
            # place 정보가 있으면 추가
            if place:
                enriched_visit.update({
                    "place_name": place.get("name"),
                    "category": place.get("primary_category"),
                    "latitude": place.get("latitude"),
                    "longitude": place.get("longitude"),
                })
            else:
                # place 정보 없어도 기본값으로 표시
                enriched_visit.update({
                    "place_name": visit.get("place_id", "Unknown Place"),
                    "category": "기타",
                    "latitude": 37.5665,  # 서울 기본 위치
                    "longitude": 126.9780,
                })
            
            enriched_visits.append(enriched_visit)
        
        return {
            "visits": enriched_visits,
            "total_count": len(enriched_visits)
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Error fetching visits: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            "visits": [],
            "total_count": 0
        }


@router.post("")
async def create_visit(
    visit: VisitCreate,
    db = Depends(get_db)
):
    """방문 기록 생성"""
    
    try:
        if db is None:
            return {
                "success": False,
                "message": "Database not connected"
            }
        
        # XP 계산
        xp_earned = 100
        if visit.duration_minutes > 60:
            xp_earned += 50
        if visit.rating and visit.rating >= 4.0:
            xp_earned += 30
        
        visit_data = {
            "user_id": visit.user_id,
            "place_id": visit.place_id,
            "visited_at": datetime.now().isoformat(),
            "duration_minutes": visit.duration_minutes,
            "rating": visit.rating,
            "mood": visit.mood,
            "spent_amount": visit.spent_amount,
            "companions": visit.companions,
            "xp_earned": xp_earned
        }
        
        result = await db.insert_visit(visit_data)
        
        return {
            "success": True,
            "visit_id": result.get("id"),
            "xp_earned": xp_earned
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Error creating visit: {e}")
        raise HTTPException(status_code=500, detail=str(e))
