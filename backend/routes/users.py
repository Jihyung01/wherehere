"""
User Routes - Real stats from visits when DB connected
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.dependencies import get_db

router = APIRouter(prefix="/api/v1/users", tags=["users"])

# Mock: DB 미연결 시에만 사용. 레벨/XP는 실데이터와 동일 곡선(레벨 1~10).
def _mock_user_stats(total_xp: int = 1580):
    XP = (0, 150, 400, 750, 1200, 1750, 2400, 3150, 4000, 5000)
    level = 1
    for i in range(1, 10):
        if total_xp >= XP[i]:
            level = i + 1
        else:
            break
    xp_to_next = max(0, XP[level] - total_xp) if level < 10 else 0
    return level, total_xp, xp_to_next

_mock_user = {
    "id": "user-001",
    "username": "explorer_lee",
    "display_name": "이지형",
    "bio": "도시 탐험가",
    "current_role": "explorer",
    "level": 5,
    "total_xp": 1580,
    "xp_to_next_level": 170,
    "current_streak": 0,
    "longest_streak": 0,
    "is_onboarded": True,
    "completed_quests": 12,
    "total_places_visited": 12,
}


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    current_role: Optional[str] = None
    bio: Optional[str] = None


@router.get("/me")
async def get_current_user_profile():
    """현재 사용자 프로필 (Phase 1: Mock)"""
    return _mock_user


@router.patch("/me")
async def update_profile(update: UserUpdateRequest):
    """프로필 업데이트"""
    if update.display_name:
        _mock_user["display_name"] = update.display_name
    if update.current_role:
        _mock_user["current_role"] = update.current_role
    if update.bio:
        _mock_user["bio"] = update.bio
    return _mock_user


@router.get("/me/stats")
async def get_user_stats(user_id: Optional[str] = None, db=Depends(get_db)):
    """사용자 통계. user_id 쿼리 있으면 visits 기반 실데이터, 없으면 목(mock) 반환."""
    if user_id and db is not None:
        try:
            stats = await db.get_user_stats_full(user_id)
            stats["favorite_categories"] = []
            stats["role_distribution"] = {}
            return stats
        except Exception as e:
            import logging
            logging.getLogger("uvicorn.error").exception("get_user_stats_full failed: %s", e)
    lv, txp, nxt = _mock_user_stats(_mock_user["total_xp"])
    return {
        "level": lv,
        "total_xp": _mock_user["total_xp"],
        "xp_to_next_level": nxt,
        "current_streak": _mock_user["current_streak"],
        "longest_streak": _mock_user["longest_streak"],
        "completed_quests": _mock_user["completed_quests"],
        "total_places_visited": _mock_user["total_places_visited"],
        "favorite_categories": ["카페", "이색장소", "공원"],
        "role_distribution": {
            "explorer": 12,
            "healer": 4,
            "archivist": 3,
            "relation": 2,
            "achiever": 2,
        },
    }
