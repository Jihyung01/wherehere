# -*- coding: utf-8 -*-
"""
Web Push 구독 등록 API
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from core.dependencies import get_db

router = APIRouter(prefix="/api/v1/push", tags=["push"])


class PushSubscribeRequest(BaseModel):
    user_id: str
    subscription: dict  # { endpoint, keys: { p256dh, auth } }


@router.post("/subscribe")
async def subscribe_push(req: PushSubscribeRequest, db=Depends(get_db)):
    """브라우저 푸시 구독 저장 (Web Push API subscription 객체)."""
    if db is None:
        return {"success": False}
    try:
        endpoint = (req.subscription or {}).get("endpoint") or ""
        keys = (req.subscription or {}).get("keys") or {}
        p256dh = keys.get("p256dh") or ""
        auth = keys.get("auth") or ""
        if not endpoint or not p256dh or not auth:
            return {"success": False, "error": "missing endpoint or keys"}
        ok = await db.save_push_subscription(req.user_id, endpoint, p256dh, auth)
        return {"success": ok}
    except Exception:
        return {"success": False}
