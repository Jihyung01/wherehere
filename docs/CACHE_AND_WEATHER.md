# 날씨·추천 캐시 (TTL)

## 날씨: mock 없음 (실제 OpenWeather만)

- `OPENWEATHER_API_KEY`가 **비어 있으면** `get_weather()`는 **`WeatherUnavailableError`** → 추천 POST/GET, `/api/v1/recommendations/weather`, AI 도착 가이드 등에서 **HTTP 503**과 안내 메시지를 반환합니다.
- 키는 [OpenWeatherMap](https://openweathermap.org/api)에서 발급 후 Railway(또는 백엔드) 환경 변수에 넣으세요.

## TTL이 뭐야?

**TTL(Time To Live)** = 캐시에 넣은 결과를 **몇 초 동안** 같은 요청에 재사용할지입니다.  
외부 API 호출 횟수를 줄여 **비용·지연**을 줄입니다.

## 캐시 동작 (백엔드 인메모리)

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `WEATHER_CACHE_TTL_SECONDS` | `600` | 같은 대략적 좌표(소수점 2자리)에 대해 **10분** 동안 날씨 결과 재사용. `0`이면 캐시 끔. |
| `RECOMMENDATION_CACHE_TTL_SECONDS` | `120` | 같은 위치·역할·기분·유저로 **2분** 동안 추천 POST 응답 재사용. `0`이면 끔. |

- **프로세스 메모리**만 사용 (Redis 없음).
- 추천 캐시 히트 시 그 안의 랜덤 스코어도 동일하게 재사용됩니다.
- 방문 완료 직후 목록과 어긋날 수 있으면 TTL을 짧게(예: 60) 조정하세요.

## 환경 변수 예시

```env
OPENWEATHER_API_KEY=xxxxxxxx
WEATHER_CACHE_TTL_SECONDS=600
RECOMMENDATION_CACHE_TTL_SECONDS=120
```
