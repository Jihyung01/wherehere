"""
Quest Routes - 퀘스트 관리
로그인 없이도 작동하는 Mock-First 구조
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/v1/quests", tags=["quests"])

# In-memory quest storage (Phase 1, DB 없이 작동)
_active_quests: Dict[str, dict] = {}


class QuestCreateRequest(BaseModel):
    user_id: str = "anonymous"
    role_type: str
    place_id: str
    place_name: str
    xp_reward: int = 100


class QuestCompleteRequest(BaseModel):
    user_id: str = "anonymous"
    quest_id: str
    duration_minutes: Optional[int] = None
    photo_uploaded: bool = False
    review_text: Optional[str] = None


@router.post("/accept")
async def accept_quest(request: QuestCreateRequest):
    """퀘스트 수락"""
    quest_id = str(uuid.uuid4())[:8]

    quest = {
        "quest_id": quest_id,
        "user_id": request.user_id,
        "role_type": request.role_type,
        "place_id": request.place_id,
        "place_name": request.place_name,
        "xp_reward": request.xp_reward,
        "status": "in_progress",
        "accepted_at": datetime.now().isoformat(),
        "checklist": [
            {"id": 1, "task": "장소에 도착하기", "completed": False},
            {"id": 2, "task": "30분 이상 체류하기", "completed": False},
            {"id": 3, "task": "사진 1장 촬영하기", "completed": False},
        ],
    }

    _active_quests[quest_id] = quest
    return quest


@router.post("/complete")
async def complete_quest(request: QuestCompleteRequest):
    """퀘스트 완료"""
    quest = _active_quests.get(request.quest_id)

    if not quest:
        return {
            "success": True,
            "quest_id": request.quest_id,
            "xp_earned": 100,
            "bonus_xp": 0,
            "total_xp": 100,
            "message": "퀘스트를 완료했습니다!",
        }

    base_xp = quest.get("xp_reward", 100)
    bonus_xp = 0
    if request.photo_uploaded:
        bonus_xp += 20
    if request.review_text:
        bonus_xp += 30
    if request.duration_minutes and request.duration_minutes >= 30:
        bonus_xp += 50

    quest["status"] = "completed"
    quest["completed_at"] = datetime.now().isoformat()

    return {
        "success": True,
        "quest_id": request.quest_id,
        "xp_earned": base_xp,
        "bonus_xp": bonus_xp,
        "total_xp": base_xp + bonus_xp,
        "message": "퀘스트를 완료했습니다! 🎉",
        "breakdown": {
            "base": base_xp,
            "photo_bonus": 20 if request.photo_uploaded else 0,
            "review_bonus": 30 if request.review_text else 0,
            "duration_bonus": 50 if request.duration_minutes and request.duration_minutes >= 30 else 0,
        },
    }


@router.get("/active/{user_id}")
async def get_active_quests(user_id: str = "anonymous"):
    """활성 퀘스트 조회"""
    user_quests = [
        q for q in _active_quests.values()
        if q["user_id"] == user_id and q["status"] == "in_progress"
    ]
    return {"quests": user_quests}
