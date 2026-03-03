# -*- coding: utf-8 -*-
"""
Web Push 전송 (VAPID). VAPID 키가 설정된 경우에만 전송.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from core.config import settings

logger = logging.getLogger(__name__)


def _send_one_sync(subscription: Dict[str, Any], payload: str, vapid_private_key: str, vapid_claims: Dict) -> None:
    """동기 Web Push 전송 (스레드에서 실행)."""
    try:
        from pywebpush import webpush
        sub_info = {
            "endpoint": subscription["endpoint"],
            "keys": {
                "p256dh": subscription["p256dh"],
                "auth": subscription["auth"],
            },
        }
        webpush(
            subscription_info=sub_info,
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims,
        )
    except Exception as e:
        logger.warning("Web push send failed for one subscription: %s", e)


async def send_push_for_user(
    db: Any,
    user_id: str,
    title: str,
    body: str = "",
) -> None:
    """
    해당 사용자의 모든 푸시 구독에 Web Push 전송.
    db: RestDatabaseHelpers (get_push_subscriptions 있음)
    VAPID_PRIVATE_KEY가 없으면 스킵.
    """
    if not getattr(settings, "VAPID_PRIVATE_KEY", None) or not settings.VAPID_PRIVATE_KEY.strip():
        return
    try:
        subs = await db.get_push_subscriptions(user_id)
        if not subs:
            return
        vapid_claims = {"sub": getattr(settings, "VAPID_EMAIL", "mailto:admin@wherehere.app") or "mailto:admin@wherehere.app"}
        payload = __import__("json").dumps({"title": title, "body": body or title})
        loop = asyncio.get_event_loop()
        for sub in subs:
            await loop.run_in_executor(
                None,
                _send_one_sync,
                sub,
                payload,
                settings.VAPID_PRIVATE_KEY,
                vapid_claims,
            )
    except Exception as e:
        logger.warning("Web push send_for_user failed: %s", e)
