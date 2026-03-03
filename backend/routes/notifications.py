# -*- coding: utf-8 -*-
"""
알림 API - in-app 알림 센터
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List

from core.dependencies import get_db
from services.push_service import send_push_for_user

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class CreateNotificationRequest(BaseModel):
    user_id: str
    type: str
    title: str
    body: str = ""
    extra: Optional[dict] = None


@router.get("")
async def list_notifications(user_id: str, limit: int = 50, unread_only: bool = False, db=Depends(get_db)):
    """사용자 알림 목록"""
    if db is None:
        return {"notifications": [], "unread_count": 0}
    notifications = await db.get_notifications(user_id, limit=limit, unread_only=unread_only)
    if unread_only:
        return {"notifications": notifications, "unread_count": len(notifications)}
    all_list = await db.get_notifications(user_id, limit=limit, unread_only=False)
    unread_count = sum(1 for n in all_list if n.get("read") is False)
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("")
async def create_notification(req: CreateNotificationRequest, db=Depends(get_db)):
    """알림 생성 (내부/퀘스트 완료 시 등)"""
    if db is None:
        return {"success": False, "id": None}
    out = await db.create_notification(req.user_id, req.type, req.title, req.body, req.extra)
    if out:
        await send_push_for_user(db, req.user_id, req.title, req.body)
    return {"success": out is not None, "id": out.get("id") if out else None}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, db=Depends(get_db)):
    """알림 읽음 처리"""
    if db is None:
        return {"success": False}
    ok = await db.mark_notification_read(notification_id)
    return {"success": ok}
