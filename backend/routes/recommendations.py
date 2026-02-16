"""
Recommendations API Routes
Mock-First Architecture: Works without DB, upgrades seamlessly with DB
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

from core.dependencies import Database
from mock.mock_data import get_mock_recommendations
from services.weather_service import get_weather, get_time_of_day
from services.narrative_generator import generate_narratives_batch

router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["recommendations"]
)


class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class MoodInput(BaseModel):
    mood_text: str = Field(..., max_length=100)
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)


class RecommendationRequest(BaseModel):
    user_id: Optional[str] = "anonymous"
    role_type: str = Field(..., pattern="^(explorer|healer|artist|foodie|challenger|archivist|relation|achiever)$")
    user_level: int = Field(default=1, ge=1, le=50)
    current_location: LocationInput
    mood: Optional[MoodInput] = None
    weather: Optional[str] = None
    time_of_day: Optional[str] = None


class PlaceRecommendation(BaseModel):
    place_id: str
    name: str
    address: str
    category: str
    distance_meters: float = 0.0
    score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    reason: str
    estimated_cost: Optional[int] = None
    vibe_tags: List[str] = []
    average_rating: float = 0
    is_hidden_gem: bool = False
    typical_crowd_level: str = "medium"
    narrative: str = ""
    description: str = ""


class RecommendationResponse(BaseModel):
    recommendations: List[PlaceRecommendation]
    role_type: str
    radius_used: int
    total_candidates: int
    generated_at: str
    weather: Optional[Dict] = None
    time_of_day: str = ""
    data_source: str = "mock"


@router.post("", response_model=RecommendationResponse)
@router.post("/", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    장소 추천 API

    1) DB 연결 시: 실제 PostGIS 쿼리로 추천
    2) DB 미연결 시: Mock 데이터로 즉시 응답
    """

    # 날씨 & 시간 자동 감지
    weather_data = await get_weather(
        request.current_location.latitude,
        request.current_location.longitude
    )
    time_now = request.time_of_day or get_time_of_day()

    # Supabase REST API로 직접 추천
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        
        # 역할별 반경
        radius_map = {
            "explorer": 3000,
            "healer": 800,
            "archivist": 2000,
            "relation": 2000,
            "achiever": 5000,
            "artist": 2500,
            "foodie": 1500,
            "challenger": 4000,
        }
        radius = radius_map.get(request.role_type, 2000)
        
        # DB에서 장소 가져오기
        places = await helpers.get_places_nearby(
            request.current_location.latitude,
            request.current_location.longitude,
            radius,
            50
        )
        
        if places and len(places) > 0:
            # 상위 3개 선택
            import random
            from math import radians, sin, cos, sqrt, atan2
            
            def calculate_distance(lat1, lon1, lat2, lon2):
                """Haversine 거리 계산 (미터)"""
                R = 6371000
                lat1_rad, lat2_rad = radians(lat1), radians(lat2)
                delta_lat, delta_lon = radians(lat2 - lat1), radians(lon2 - lon1)
                a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                return R * c
            
            selected = random.sample(places, min(3, len(places)))
            
            recommendations = []
            for place in selected:
                # 거리 계산
                place_lat = place.get("latitude")
                place_lon = place.get("longitude")
                
                if place_lat and place_lon:
                    distance = calculate_distance(
                        request.current_location.latitude,
                        request.current_location.longitude,
                        place_lat,
                        place_lon
                    )
                else:
                    distance = 0.0
                
                # 스코어 계산
                score = 85.0
                if place.get("average_rating"):
                    score += place.get("average_rating", 0) * 2
                if distance > 0:
                    distance_score = max(0, 10 - (distance / 1000))
                    score += distance_score
                
                recommendations.append(PlaceRecommendation(
                    place_id=place.get("id", ""),
                    name=place.get("name", "Unknown"),
                    address=place.get("address", ""),
                    category=place.get("primary_category", "기타"),
                    distance_meters=round(distance, 1),
                    score=round(score, 1),
                    score_breakdown={
                        "category": 40.0,
                        "distance": round(max(0, 25 - (distance / 200)), 1),
                        "rating": round(place.get("average_rating", 0) * 4, 1),
                    },
                    reason=f"{request.role_type} 역할에 맞는 장소",
                    estimated_cost=place.get("average_price"),
                    vibe_tags=place.get("vibe_tags", []),
                    average_rating=place.get("average_rating", 0),
                    is_hidden_gem=place.get("is_hidden_gem", False),
                    typical_crowd_level=place.get("typical_crowd_level", "medium"),
                    narrative=f"추천: {place.get('name', 'Unknown')}",
                    description=place.get("description", "")
                ))
            
            return RecommendationResponse(
                recommendations=recommendations,
                role_type=request.role_type,
                radius_used=radius,
                total_candidates=len(places),
                generated_at=datetime.now().isoformat(),
                weather=weather_data,
                time_of_day=time_now,
                data_source="database_rest"
            )
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"REST API failed: {e}")
        import traceback
        logger.error(traceback.format_exc())

    # Mock 추천 (fallback)
    mock_result = get_mock_recommendations(
        role_type=request.role_type,
        latitude=request.current_location.latitude,
        longitude=request.current_location.longitude,
        user_level=request.user_level,
        top_k=3,
    )

    mock_result["weather"] = weather_data
    mock_result["time_of_day"] = time_now

    return RecommendationResponse(**mock_result)


async def _get_db_recommendations(request, weather_data, time_now):
    """실제 DB에서 추천 (Supabase REST API)"""
    # REST API 헬퍼 사용
    helpers = Database.get_helpers()
    from .recommendations_rest import get_db_recommendations_rest
    return await get_db_recommendations_rest(helpers, request, weather_data, time_now)

    # 역할별 반경
    radius_map = {
        "explorer": 3000 + request.user_level * 200,
        "healer": 800 + request.user_level * 50,
        "archivist": 2000 + request.user_level * 150,
        "relation": 2000 + request.user_level * 150,
        "achiever": 5000 + request.user_level * 300,
    }
    radius = radius_map.get(request.role_type, 2000)

    query = """
        SELECT
            place_id::text,
            name,
            address,
            primary_category,
            secondary_categories,
            price_tier,
            average_price,
            vibe_tags,
            average_rating,
            is_hidden_gem,
            typical_crowd_level,
            description,
            ST_Distance(
                location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_meters
        FROM public.places
        WHERE
            ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
            )
            AND is_active = TRUE
        ORDER BY distance_meters ASC
        LIMIT 50;
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            query,
            request.current_location.longitude,
            request.current_location.latitude,
            radius,
        )

    if not rows:
        # DB에 데이터 없으면 mock fallback
        mock_result = get_mock_recommendations(
            request.role_type,
            request.current_location.latitude,
            request.current_location.longitude,
            request.user_level,
        )
        mock_result["weather"] = weather_data
        mock_result["time_of_day"] = time_now
        return RecommendationResponse(**mock_result)

    # 간단 스코어링
    from mock.mock_data import ROLE_CATEGORY_MAP, ROLE_NARRATIVES
    preferred = ROLE_CATEGORY_MAP.get(request.role_type, [])
    narratives = ROLE_NARRATIVES.get(request.role_type, ["좋은 장소입니다."])

    scored = []
    for row in rows:
        r = dict(row)
        cat_score = 1.0 if r["primary_category"] in preferred else 0.6
        dist_score = math.exp(-0.0003 * r["distance_meters"])
        hidden_bonus = 15 if request.user_level >= 6 and r.get("is_hidden_gem") else 0
        final = cat_score * 40 + dist_score * 25 + hidden_bonus + random.uniform(0, 5)

        scored.append({
            "place_id": r["place_id"],
            "name": r["name"],
            "address": r["address"] or "",
            "category": r["primary_category"],
            "distance_meters": round(r["distance_meters"]),
            "score": round(final, 2),
            "score_breakdown": {
                "category": round(cat_score * 100, 1),
                "distance": round(dist_score * 100, 1),
                "hidden_bonus": hidden_bonus,
            },
            "reason": f"{'히든 스팟!' if r.get('is_hidden_gem') else '추천'} - 평점 {r.get('average_rating', 0)}점",
            "estimated_cost": r.get("average_price"),
            "vibe_tags": r.get("vibe_tags") or [],
            "average_rating": float(r.get("average_rating") or 0),
            "is_hidden_gem": r.get("is_hidden_gem", False),
            "typical_crowd_level": r.get("typical_crowd_level") or "medium",
            "narrative": random.choice(narratives),
            "description": r.get("description") or "",
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top_3 = scored[:3]
    
    # 🤖 AI 서사 생성 (상위 3개만)
    user_mood = request.mood.mood_text if request.mood else None
    places_for_narrative = [
        {
            "name": p["name"],
            "category": p["category"],
            "vibe_tags": p["vibe_tags"],
            "is_hidden_gem": p["is_hidden_gem"],
        }
        for p in top_3
    ]
    
    ai_narratives = await generate_narratives_batch(
        places=places_for_narrative,
        role_type=request.role_type,
        user_mood=user_mood,
    )
    
    # AI 서사 적용
    for i, place in enumerate(top_3):
        place["narrative"] = ai_narratives[i]

    return RecommendationResponse(
        recommendations=top_3,
        role_type=request.role_type,
        radius_used=radius,
        total_candidates=len(rows),
        generated_at=datetime.now().isoformat(),
        weather=weather_data,
        time_of_day=time_now,
        data_source="database",
    )


@router.get("/debug")
async def debug_db_status():
    """DB 연결 상태 디버깅"""
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    is_connected = Database.is_connected()
    has_pool = Database.pool is not None
    has_supabase = Database.supabase_client is not None
    
    logger.info(f"[DEBUG] is_connected={is_connected}, has_pool={has_pool}, has_supabase={has_supabase}")
    
    return {
        "is_connected": is_connected,
        "has_pool": has_pool,
        "has_supabase_client": has_supabase,
        "pool_value": str(Database.pool) if Database.pool else None,
        "supabase_value": str(Database.supabase_client) if Database.supabase_client else None
    }


@router.get("/roles")
async def get_roles():
    """역할 목록 조회"""
    return {
        "roles": [
            {"id": "explorer", "name": "탐험가", "icon": "🧭", "desc": "새로운 발견을 추구하는 모험가", "tagline": "지도 밖으로 나가볼까요?"},
            {"id": "healer", "name": "치유자", "icon": "🌿", "desc": "쉼과 회복의 수호자", "tagline": "오늘은 쉬어가도 괜찮아요"},
            {"id": "archivist", "name": "수집가", "icon": "📸", "desc": "감각의 큐레이터", "tagline": "아름다운 순간을 포착하세요"},
            {"id": "relation", "name": "연결자", "icon": "🤝", "desc": "관계의 직조자", "tagline": "함께라서 더 빛나는 시간"},
            {"id": "achiever", "name": "달성자", "icon": "🏆", "desc": "성취의 챔피언", "tagline": "오늘도 한계를 넘어서"},
        ]
    }


@router.get("/weather")
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """현재 날씨 조회"""
    weather = await get_weather(lat, lon)
    return {"weather": weather, "time_of_day": get_time_of_day()}
