# -*- coding: utf-8 -*-
"""
크리에이터 모드: 장소 제안 (UGC)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from core.dependencies import get_db

router = APIRouter(prefix="/api/v1/place-suggestions", tags=["place-suggestions"])


class PlaceSuggestionCreate(BaseModel):
    user_id: str
    name: str
    address: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str = "기타"
    description: str = ""


@router.post("")
async def create_suggestion(req: PlaceSuggestionCreate, db=Depends(get_db)):
    """장소 제안 제출 (검수 후 places 반영 예정)"""
    if db is None:
        return {"success": False, "id": None, "message": "DB not connected"}
    out = await db.create_place_suggestion(
        req.user_id,
        req.name,
        req.address,
        req.latitude,
        req.longitude,
        req.category,
        req.description,
    )
    return {"success": out is not None, "id": out.get("id") if out else None, "message": "제안이 접수되었어요. 검수 후 반영됩니다."}


@router.get("")
async def list_my_suggestions(user_id: str, db=Depends(get_db)):
    """내가 제안한 장소 목록"""
    if db is None:
        return {"suggestions": []}
    suggestions = await db.get_place_suggestions_by_user(user_id)
    return {"suggestions": suggestions}
