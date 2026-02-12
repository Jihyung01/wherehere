"""
Weather Service - OpenWeatherMap API
"""

import httpx
from typing import Optional, Dict
from core.config import settings


async def get_weather(latitude: float, longitude: float) -> Optional[Dict]:
    """Get current weather for coordinates"""
    if not settings.OPENWEATHER_API_KEY:
        return _get_mock_weather()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "appid": settings.OPENWEATHER_API_KEY,
                    "units": "metric",
                    "lang": "kr",
                }
            )
            if resp.status_code == 200:
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
    except Exception as e:
        print(f"Weather API error: {e}")

    return _get_mock_weather()


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


def _get_mock_weather() -> Dict:
    from datetime import datetime
    hour = datetime.now().hour
    temp = 3 if hour < 8 else (8 if hour < 18 else 2)
    return {
        "condition": "cloudy",
        "condition_kr": "흐림",
        "temperature": temp,
        "feels_like": temp - 2,
        "humidity": 55,
        "icon": "04d",
    }


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
