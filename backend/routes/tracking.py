# -*- coding: utf-8 -*-
"""
사용자 행동 추적 API
실제 데이터 수집 및 저장
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.dependencies import Database
from services.user_tracking import UserTrackingService
from services.place_discovery import PlaceDiscoveryService
from core.config import settings


router = APIRouter(prefix="/api/v1/tracking", tags=["Tracking"])


# ============================================================
# Request Models
# ============================================================

class RecordVisitRequest(BaseModel):
    user_id: str
    place_id: str
    duration_minutes: Optional[int] = None
    rating: Optional[float] = None
    review: Optional[str] = None
    mood: Optional[str] = None
    companions: int = 1
    spent_amount: Optional[int] = None


class RecordLocationRequest(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None


class DiscoverPlacesRequest(BaseModel):
    latitude: float
    longitude: float
    radius: int = 3000
    category: Optional[str] = None


# ============================================================
# Endpoints
# ============================================================

@router.post("/visit")
async def record_visit(request: RecordVisitRequest):
    """
    방문 기록 저장 (실제 데이터 축적)
    """
    if not Database.is_connected():
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        tracking = UserTrackingService(Database.get_pool())
        result = await tracking.record_visit(
            user_id=request.user_id,
            place_id=request.place_id,
            duration_minutes=request.duration_minutes,
            rating=request.rating,
            review=request.review,
            mood=request.mood,
            companions=request.companions,
            spent_amount=request.spent_amount
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/location")
async def record_location(request: RecordLocationRequest):
    """
    위치 기록 저장 (실시간 추적)
    """
    if not Database.is_connected():
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        tracking = UserTrackingService(Database.get_pool())
        success = await tracking.record_location(
            user_id=request.user_id,
            latitude=request.latitude,
            longitude=request.longitude,
            accuracy=request.accuracy
        )
        return {"success": success, "message": "위치가 기록되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visits/{user_id}")
async def get_user_visits(user_id: str, days: int = 90):
    """
    사용자 방문 기록 조회
    """
    if not Database.is_connected():
        return {"visits": [], "message": "Database not connected - mock mode"}
    
    try:
        tracking = UserTrackingService(Database.get_pool())
        visits = await tracking.get_user_visits(user_id, days)
        return {
            "visits": visits,
            "total_count": len(visits),
            "days": days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nearby")
async def check_nearby_places(latitude: float, longitude: float, radius: int = 100):
    """
    현재 위치 근처 장소 확인 (자동 체크인용)
    """
    if not Database.is_connected():
        return {"places": [], "message": "Database not connected"}
    
    try:
        tracking = UserTrackingService(Database.get_pool())
        places = await tracking.check_nearby_places(latitude, longitude, radius)
        return {"places": places, "count": len(places)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discover")
async def discover_places(request: DiscoverPlacesRequest):
    """
    실제 장소 검색 및 DB 추가 (Kakao API)
    """
    if not Database.is_connected():
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        discovery = PlaceDiscoveryService(settings.KAKAO_API_KEY, Database.get_pool())
        places = await discovery.search_and_add_places(
            latitude=request.latitude,
            longitude=request.longitude,
            radius=request.radius,
            category=request.category
        )
        return {
            "added_places": places,
            "count": len(places),
            "message": f"{len(places)}개의 새로운 장소가 추가되었습니다"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
