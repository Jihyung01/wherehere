# -*- coding: utf-8 -*-
"""
방문 기록 API
"""

import math
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from core.dependencies import get_db
from services.push_service import send_push_for_user

router = APIRouter(prefix="/api/v1/visits", tags=["Visits"])

# 체크인 허용 거리(미터). 이 거리 이내일 때만 서버에서 체크인 허용
CHECKIN_RADIUS_METERS = 100


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine 거리(미터)"""
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class VisitCreate(BaseModel):
    user_id: str
    place_id: str
    duration_minutes: int
    rating: Optional[float] = None
    mood: Optional[str] = None
    spent_amount: Optional[int] = None
    companions: int = 1
    user_latitude: Optional[float] = None
    user_longitude: Optional[float] = None


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
    """방문 기록 생성. user_latitude/user_longitude 있으면 100m 이내에서만 체크인 허용."""
    
    try:
        if db is None:
            return {
                "success": False,
                "message": "Database not connected"
            }
        
        location_verified = False
        if visit.user_latitude is not None and visit.user_longitude is not None:
            place = await db.get_place_by_id(visit.place_id)
            if place:
                plat = place.get("latitude")
                plon = place.get("longitude")
                if plat is not None and plon is not None:
                    dist = _distance_meters(
                        visit.user_latitude,
                        visit.user_longitude,
                        float(plat),
                        float(plon),
                    )
                    if dist > CHECKIN_RADIUS_METERS:
                        raise HTTPException(
                            status_code=400,
                            detail=f"체크인은 장소 {CHECKIN_RADIUS_METERS}m 이내에서만 가능해요. (현재 약 {int(dist)}m)"
                        )
                    location_verified = True
        
        # XP 계산: 기본 + 체류시간 보너스 + 별점 보너스 + 위치 검증 보너스
        xp_earned = 100
        if visit.duration_minutes > 60:
            xp_earned += 50
        if visit.rating is not None and visit.rating >= 4.0:
            xp_earned += 30
        if location_verified:
            xp_earned += 20
        
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
        try:
            await db.create_notification(
                visit.user_id,
                "quest_complete",
                "퀘스트 완료!",
                f"+{xp_earned} XP를 획득했어요.",
                {"xp_earned": xp_earned, "place_id": visit.place_id}
            )
            await send_push_for_user(db, visit.user_id, "퀘스트 완료!", f"+{xp_earned} XP를 획득했어요.")
        except Exception:
            pass
        try:
            place = await db.get_place_by_id(visit.place_id)
            place_name = place.get("name") if place else None
            await db.create_feed_activity(visit.user_id, "checkin", visit.place_id, place_name, xp_earned, None)
        except Exception:
            pass
        return {
            "success": True,
            "visit_id": result.get("id"),
            "xp_earned": xp_earned,
            "location_verified": location_verified
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Error creating visit: {e}")
        raise HTTPException(status_code=500, detail=str(e))
