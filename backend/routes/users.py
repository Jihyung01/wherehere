"""
User Routes - Simplified for Phase 1
Works without authentication
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/users", tags=["users"])

# In-memory user store for Phase 1
_mock_user = {
    "id": "user-001",
    "username": "explorer_lee",
    "display_name": "이지형",
    "bio": "도시 탐험가",
    "current_role": "explorer",
    "level": 8,
    "total_xp": 2450,
    "xp_to_next_level": 3200,
    "current_streak": 7,
    "longest_streak": 14,
    "is_onboarded": True,
    "completed_quests": 23,
    "total_places_visited": 31,
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
async def get_user_stats():
    """사용자 통계"""
    return {
        "level": _mock_user["level"],
        "total_xp": _mock_user["total_xp"],
        "xp_to_next_level": _mock_user["xp_to_next_level"],
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
