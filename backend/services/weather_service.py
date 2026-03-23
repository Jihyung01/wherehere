"""
Weather Service — OpenWeatherMap 실제 API만 사용 (mock 없음).
OPENWEATHER_API_KEY 필수. 인메모리 TTL 캐시로 호출 빈도만 줄임.
"""

from __future__ import annotations

import asyncio
import time
from typing import Dict, Tuple

import httpx

from core.config import settings

# 좌표 2자리 반올림 키 → (만료 monotonic, payload)
_weather_cache: Dict[str, Tuple[float, Dict]] = {}
_weather_lock = asyncio.Lock()


class WeatherUnavailableError(Exception):
    """실제 날씨를 가져올 수 없을 때 (API 키 없음, 응답 오류, 네트워크 등)"""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _weather_cache_key(latitude: float, longitude: float) -> str:
    return f"{round(latitude, 2)},{round(longitude, 2)}"


def _map_weather_condition(main: str) -> str:
    mapping = {
        "Clear": "sunny",
        "Clouds": "cloudy",
        "Rain": "rainy",
        "Drizzle": "rainy",
        "Snow": "snowy",
        "Thunderstorm": "rainy",
    }
    return mapping.get(main, "cloudy")


async def _fetch_openweather(latitude: float, longitude: float) -> Dict:
    """OpenWeather 단일 호출 (캐시 밖). 실패 시 WeatherUnavailableError."""
    key = (settings.OPENWEATHER_API_KEY or "").strip()
    if not key:
        raise WeatherUnavailableError(
            "OPENWEATHER_API_KEY가 설정되지 않았습니다. Railway/Vercel 백엔드 환경 변수에 "
            "OpenWeatherMap API 키를 추가하세요.",
            status_code=503,
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "appid": key,
                    "units": "metric",
                    "lang": "kr",
                },
            )
    except httpx.RequestError as e:
        raise WeatherUnavailableError(
            f"날씨 API 네트워크 오류: {e}",
            status_code=503,
        ) from e

    if resp.status_code != 200:
        detail = resp.text[:200] if resp.text else resp.reason_phrase
        raise WeatherUnavailableError(
            f"OpenWeather 응답 오류 (HTTP {resp.status_code}): {detail}",
            status_code=502,
        )

    data = resp.json()
    weather_main = data.get("weather", [{}])[0].get("main", "Clear")
    return {
        "condition": _map_weather_condition(weather_main),
        "condition_kr": data.get("weather", [{}])[0].get("description", "맑음"),
        "temperature": round(data.get("main", {}).get("temp", 20)),
        "feels_like": round(data.get("main", {}).get("feels_like", 20)),
        "humidity": data.get("main", {}).get("humidity", 50),
        "icon": data.get("weather", [{}])[0].get("icon", "01d"),
    }


async def get_weather(latitude: float, longitude: float) -> Dict:
    """
    현재 좌표의 실제 날씨. mock 없음.
    실패 시 WeatherUnavailableError 발생.
    """
    ttl = max(0, int(getattr(settings, "WEATHER_CACHE_TTL_SECONDS", 600) or 0))
    key = _weather_cache_key(latitude, longitude)
    now = time.monotonic()

    if ttl > 0:
        async with _weather_lock:
            hit = _weather_cache.get(key)
            if hit and now < hit[0]:
                return dict(hit[1])

    data = await _fetch_openweather(latitude, longitude)

    if ttl > 0:
        async with _weather_lock:
            _weather_cache[key] = (now + ttl, dict(data))
            if len(_weather_cache) > 500:
                _weather_cache.clear()
                _weather_cache[key] = (now + ttl, dict(data))

    return data


def get_time_of_day() -> str:
    from datetime import datetime

    hour = datetime.now().hour
    if hour < 6:
        return "dawn"
    elif hour < 11:
        return "morning"
    elif hour < 17:
        return "afternoon"
    elif hour < 21:
        return "evening"
    else:
        return "night"
