"""
추천 API 응답 인메모리 TTL 캐시 (프로세스 단위).
- 같은 위치·역할·기분·유저로 짧은 시간 내 재요청 시 Kakao/DB 부하 감소.
- TTL 안에는 랜덤 스코어 결과도 동일하게 재사용됨 (의도적 트레이드오프).
"""

from __future__ import annotations

import asyncio
import hashlib
import time
from typing import Any, Dict, Optional

_lock = asyncio.Lock()
_store: Dict[str, tuple[float, Dict[str, Any]]] = {}


def make_recommendation_cache_key(
    latitude: float,
    longitude: float,
    role_type: str,
    mood_text: str,
    mood_intensity: float,
    user_id: str,
    user_level: int,
) -> str:
    raw = "|".join(
        (
            f"{round(latitude, 4)}",
            f"{round(longitude, 4)}",
            role_type,
            mood_text or "",
            f"{mood_intensity:.2f}",
            user_id or "anon",
            str(user_level),
        )
    )
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_cached(key: str, ttl_seconds: int) -> Optional[Dict[str, Any]]:
    if ttl_seconds <= 0:
        return None
    now = time.monotonic()
    async with _lock:
        item = _store.get(key)
        if not item:
            return None
        exp, payload = item
        if now >= exp:
            del _store[key]
            return None
        return payload


async def set_cached(key: str, ttl_seconds: int, model_dump: Dict[str, Any]) -> None:
    if ttl_seconds <= 0:
        return
    async with _lock:
        _store[key] = (time.monotonic() + ttl_seconds, model_dump)
        if len(_store) > 300:
            # 만료 임박·오래된 항목부터 삭제
            for k, (exp, _) in sorted(_store.items(), key=lambda x: x[1][0])[:150]:
                _store.pop(k, None)
