# -*- coding: utf-8 -*-
"""
Web Push 구독 등록 + 일일 "오늘의 한 곳" 푸시 발송 API
"""

import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict

from core.dependencies import get_db
from services.push_service import send_push_for_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/push", tags=["push"])

# ── In-memory fallback subscription store (DB 없을 때) ─────────────────────
_subscriptions: Dict[str, List[dict]] = {}  # {user_id: [subscription, ...]}


class PushSubscribeRequest(BaseModel):
    user_id: str
    subscription: dict  # { endpoint, keys: { p256dh, auth } }


class SendDailyRequest(BaseModel):
    """매일 아침 알림 트리거. admin 또는 APScheduler가 호출."""
    place_name: str = "오늘의 추천 장소"
    place_address: str = ""
    message: str = ""
    secret: str = ""  # 간단한 API 보호용


@router.post("/subscribe")
async def subscribe_push(req: PushSubscribeRequest, db=Depends(get_db)):
    """브라우저 푸시 구독 저장 (Web Push API subscription 객체)."""
    endpoint = (req.subscription or {}).get("endpoint") or ""
    keys = (req.subscription or {}).get("keys") or {}
    p256dh = keys.get("p256dh") or ""
    auth = keys.get("auth") or ""
    if not endpoint or not p256dh or not auth:
        return {"success": False, "error": "missing endpoint or keys"}

    # DB 연결 시 DB에 저장
    if db is not None:
        try:
            ok = await db.save_push_subscription(req.user_id, endpoint, p256dh, auth)
            return {"success": ok}
        except Exception as e:
            logger.warning("DB push save failed, falling back to memory: %s", e)

    # Fallback: 메모리에 저장
    sub_obj = {"endpoint": endpoint, "p256dh": p256dh, "auth": auth}
    existing = _subscriptions.setdefault(req.user_id, [])
    # 중복 방지
    if not any(s["endpoint"] == endpoint for s in existing):
        existing.append(sub_obj)
    return {"success": True, "mode": "memory"}


@router.post("/send-daily")
async def send_daily_notification(req: SendDailyRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):
    """
    일일 "오늘의 한 곳" 푸시 알림 발송.
    APScheduler (main.py lifespan) 또는 수동 호출.
    VAPID 키가 없으면 스킵.
    """
    from core.config import settings
    # 간단한 보호: DAILY_PUSH_SECRET 환경 변수와 일치해야 함 (없으면 항상 허용)
    expected = getattr(settings, "DAILY_PUSH_SECRET", "") or ""
    if expected and req.secret != expected:
        return {"success": False, "error": "unauthorized"}

    place = req.place_name or "오늘의 추천 장소"
    addr = req.place_address
    body = req.message or (f"📍 {addr}" if addr else "앱을 열어 오늘의 한 곳을 확인해보세요!")
    title = f"☀️ {place}"

    # 구독자 목록 수집
    user_ids: List[str] = []
    if db is not None:
        try:
            all_subs = await db.get_all_push_subscriptions()
            user_ids = list({s.get("user_id") for s in (all_subs or []) if s.get("user_id")})
        except Exception as e:
            logger.warning("get_all_push_subscriptions failed: %s", e)

    # Memory fallback
    if not user_ids:
        user_ids = list(_subscriptions.keys())

    sent = 0
    errors = 0
    for uid in user_ids:
        try:
            if db is not None:
                await send_push_for_user(db, uid, title, body)
            else:
                # memory 구독으로 직접 발송
                subs = _subscriptions.get(uid, [])
                if subs:
                    from core.config import settings as s
                    if getattr(s, "VAPID_PRIVATE_KEY", None):
                        for sub in subs:
                            import asyncio, json
                            vapid_claims = {"sub": getattr(s, "VAPID_EMAIL", "mailto:admin@wherehere.app")}
                            payload = json.dumps({"title": title, "body": body})
                            loop = asyncio.get_event_loop()
                            await loop.run_in_executor(
                                None,
                                lambda: __import__("services.push_service", fromlist=["_send_one_sync"])
                                        ._send_one_sync(sub, payload, s.VAPID_PRIVATE_KEY, vapid_claims)
                            )
            sent += 1
        except Exception as e:
            logger.warning("daily push failed for %s: %s", uid, e)
            errors += 1

    logger.info("Daily push sent=%d errors=%d", sent, errors)
    return {"success": True, "sent": sent, "errors": errors, "title": title, "body": body}


class ProximityNotifyRequest(BaseModel):
    user_id: str          # 알림을 받을 사용자 (근처에 있는 사람)
    friend_id: str        # 친구 (이 사람이 접근해온 것)
    friend_name: str = "친구"
    distance_m: int = 0


@router.post("/notify-proximity")
async def notify_proximity(req: ProximityNotifyRequest, bg: BackgroundTasks, db=Depends(get_db)):
    """친구가 proximity_alert_meters 이내로 가까워졌을 때 해당 사용자에게 푸시 알림 전송."""
    dist_label = f"{req.distance_m}m" if req.distance_m < 100 else f"약 {round(req.distance_m / 100) * 100}m"
    title = f"📍 {req.friend_name}님이 근처에 있어요!"
    body = f"{dist_label} 거리에서 WhereHere 중이에요 👋"
    bg.add_task(send_push_for_user, db, req.user_id, title, body)
    return {"queued": True, "to": req.user_id, "friend": req.friend_name}


@router.get("/subscribers/count")
async def get_subscriber_count(db=Depends(get_db)):
    """구독자 수 조회 (관리용)."""
    if db is not None:
        try:
            all_subs = await db.get_all_push_subscriptions()
            users = len({s.get("user_id") for s in (all_subs or []) if s.get("user_id")})
            return {"total_subscriptions": len(all_subs or []), "unique_users": users}
        except Exception:
            pass
    return {"total_subscriptions": sum(len(v) for v in _subscriptions.values()), "unique_users": len(_subscriptions)}
