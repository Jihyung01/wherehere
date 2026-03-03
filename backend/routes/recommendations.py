"""
Recommendations API Routes
Mock-First Architecture: Works without DB, upgrades seamlessly with DB
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import math
import random

from core.dependencies import Database
from mock.mock_data import get_mock_recommendations
from services.weather_service import get_weather, get_time_of_day
from services.narrative_generator import generate_narrative

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RecommendationResponse(BaseModel):
    recommendations: List[PlaceRecommendation]
    role_type: str
    radius_used: int
    total_candidates: int
    generated_at: str
    weather: Optional[Dict] = None
    time_of_day: str = ""
    data_source: str = "mock"


class NarrativeRequest(BaseModel):
    """클릭한 장소 1곳에 대한 서사 생성 요청"""
    place_name: str
    category: str = "기타"
    role_type: str = "explorer"
    user_mood: Optional[str] = None
    vibe_tags: List[str] = []
    is_hidden_gem: bool = False


@router.post("/narrative")
async def get_narrative_for_place(request: NarrativeRequest):
    """클릭한 장소 1곳에 대해 AI 서사 1건만 생성 (토큰 절감)"""
    narrative = await generate_narrative(
        place_name=request.place_name,
        category=request.category,
        role_type=request.role_type,
        vibe_tags=request.vibe_tags or [],
        is_hidden_gem=request.is_hidden_gem,
        user_mood=request.user_mood,
    )
    return {"narrative": narrative}


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

    # 기분 텍스트 기반 선호 카테고리/분위기 키워드 계산
    mood_text = (request.mood.mood_text or "").lower() if request.mood else ""
    mood_preferred_categories: set[str] = set()
    mood_vibe_keywords: set[str] = set()

    if any(k in mood_text for k in ["지침", "피곤", "피로", "번아웃", "우울", "힘들"]):
        # 휴식/힐링이 필요한 상태 → 공원, 조용한 카페
        mood_preferred_categories.update(["공원", "카페"])
        mood_vibe_keywords.update(["힐링", "자연", "고요", "조용", "산책"])

    if any(k in mood_text for k in ["설렘", "설레", "두근", "데이트", "로맨틱", "좋아하는 사람"]):
        # 데이트/설렘 → 분위기 좋은 식당, 와인바, 카페
        mood_preferred_categories.update(["카페", "술집/바", "음식점"])
        mood_vibe_keywords.update(["데이트", "분위기", "로맨틱", "와인"])

    if any(k in mood_text for k in ["신남", "신나요", "신나는", "활기", "에너지", "스트레스 풀", "달리고"]):
        # 에너지 발산/스트레스 해소 → 나이트라이프, 사람 많은 곳
        mood_preferred_categories.update(["술집/바", "음식점", "공원"])
        mood_vibe_keywords.update(["나이트라이프", "활기찬", "친구", "파티"])

    if any(k in mood_text for k in ["혼자", "혼밥", "생각", "정리", "조용히"]):
        # 혼자 정리하고 싶은 날 → 조용한 카페/문화시설
        mood_preferred_categories.update(["카페", "문화시설"])
        mood_vibe_keywords.update(["조용", "북카페", "갤러리", "전시"])

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

        # 이미 방문한(place_id가 visits에 존재하는) 장소를 추천에서 제외하기 위해 목록 가져오기
        completed_place_ids = set()
        try:
            if request.user_id:
                completed_ids = await helpers.get_completed_places(request.user_id)
                completed_place_ids = set(completed_ids)
        except Exception:
            # 방문 기록 조회 실패 시에도 추천 자체는 계속 진행
            completed_place_ids = set()

        # DB에서 장소 가져오기 (추천 3곳 채우기 위해 충분히 많이 조회)
        places = await helpers.get_places_nearby(
            request.current_location.latitude,
            request.current_location.longitude,
            radius,
            250
        )

        if places and len(places) > 0:
            from math import radians, sin, cos, sqrt, atan2
            from mock.mock_data import ROLE_CATEGORY_MAP

            def calculate_distance(lat1, lon1, lat2, lon2):
                """Haversine 거리 계산 (미터)"""
                R = 6371000
                lat1_rad, lat2_rad = radians(lat1), radians(lat2)
                delta_lat, delta_lon = radians(lat2 - lat1), radians(lon2 - lon1)
                a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
                c = 2 * atan2(sqrt(a), sqrt(1 - a))
                return R * c

            user_lat = request.current_location.latitude
            user_lon = request.current_location.longitude
            role_preferred_categories = ROLE_CATEGORY_MAP.get(request.role_type, [])

            # 1) 각 장소의 거리/점수 계산 후 후보 리스트 생성
            candidates: list[Dict] = []
            for p in places:
                place_lat = p.get("latitude")
                place_lon = p.get("longitude")
                place_id = p.get("id")

                # 이미 방문한(place_id가 visits에 있는) 장소는 건너뛰기
                if place_id and place_id in completed_place_ids:
                    continue

                if place_lat is None or place_lon is None:
                    continue

                dist = calculate_distance(user_lat, user_lon, place_lat, place_lon)
                if dist > radius:
                    continue

                primary_cat = (p.get("primary_category") or "").strip()
                vibe_tags = p.get("vibe_tags") or []
                vibe_text = " ".join(vibe_tags)

                # 역할 매칭 점수 (탐험가/힐러/예술가/미식가/도전자 등)
                role_match = primary_cat in role_preferred_categories
                role_score = 22.0 if role_match else 10.0

                # 기분 매칭 점수 (mood_text + vibe_tags 기반)
                mood_cat_match = primary_cat in mood_preferred_categories
                mood_vibe_match = any(kw in vibe_text for kw in mood_vibe_keywords) if vibe_text else False
                mood_score = 0.0
                if mood_cat_match or mood_vibe_match:
                    # 강도(intensity)에 따라 가중 (0.0~1.0)
                    intensity = request.mood.intensity if request.mood else 0.5
                    mood_score = 10.0 * (0.5 + intensity / 2.0)

                # 평점/거리 점수
                base = 70.0
                rating = p.get("average_rating") or 0.0
                rating_score = rating * 4.0  # 0~20점 정도
                distance_km = dist / 1000.0
                distance_score = max(0.0, 12.0 - distance_km * 2.0)  # 가까울수록 가산

                # 숨은 스팟/탐험 보너스
                hidden_bonus = 8.0 if (p.get("is_hidden_gem") and request.user_level >= 6) else 0.0

                # 약간의 랜덤 탐색(매 호출마다 살짝 다른 결과)
                explore_noise = random.uniform(0.0, 5.0)

                score = base + rating_score + distance_score + role_score + mood_score + hidden_bonus + explore_noise

                candidates.append(
                    {
                        "place": p,
                        "score": score,
                        "distance": dist,
                        "role_score": role_score,
                        "mood_score": mood_score,
                        "rating_score": rating_score,
                        "distance_score": distance_score,
                    }
                )

            if not candidates:
                # 반경 이내 후보가 없으면 전체 places에서 거리 제한 없이 점수 계산
                for p in places:
                    place_lat = p.get("latitude")
                    place_lon = p.get("longitude")
                    if place_lat is None or place_lon is None:
                        continue
                    dist = calculate_distance(user_lat, user_lon, place_lat, place_lon)
                    primary_cat = (p.get("primary_category") or "").strip()
                    vibe_tags = p.get("vibe_tags") or []
                    vibe_text = " ".join(vibe_tags)

                    role_match = primary_cat in role_preferred_categories
                    role_score = 20.0 if role_match else 8.0

                    mood_cat_match = primary_cat in mood_preferred_categories
                    mood_vibe_match = any(kw in vibe_text for kw in mood_vibe_keywords) if vibe_text else False
                    mood_score = 0.0
                    if mood_cat_match or mood_vibe_match:
                        intensity = request.mood.intensity if request.mood else 0.5
                        mood_score = 8.0 * (0.5 + intensity / 2.0)

                    base = 65.0
                    rating = p.get("average_rating") or 0.0
                    rating_score = rating * 3.5
                    distance_km = dist / 1000.0
                    distance_score = max(0.0, 10.0 - distance_km * 1.5)
                    hidden_bonus = 6.0 if (p.get("is_hidden_gem") and request.user_level >= 6) else 0.0
                    explore_noise = random.uniform(0.0, 5.0)

                    score = base + rating_score + distance_score + role_score + mood_score + hidden_bonus + explore_noise
                    candidates.append(
                        {
                            "place": p,
                            "score": score,
                            "distance": dist,
                            "role_score": role_score,
                            "mood_score": mood_score,
                            "rating_score": rating_score,
                            "distance_score": distance_score,
                        }
                    )

            # 2) 1km 이내 우선: 3곳 중 최소 2곳은 1km 이내에서 선택
            NEAR_METERS = 1000
            within_1km = [c for c in candidates if c["distance"] <= NEAR_METERS]
            beyond_1km = [c for c in candidates if c["distance"] > NEAR_METERS]
            within_1km.sort(key=lambda c: c["score"], reverse=True)
            beyond_1km.sort(key=lambda c: c["score"], reverse=True)

            selected_ids: set = set()
            selected_wrapped: list = []

            def add_if_new(c):
                pid = c["place"].get("id")
                if pid and pid in selected_ids:
                    return False
                if pid:
                    selected_ids.add(pid)
                selected_wrapped.append(c)
                return True

            # 1km 이내에서 2곳 (점수 상위 풀에서 랜덤)
            near_pool = within_1km[:12]
            random.shuffle(near_pool)
            for c in near_pool:
                if len(selected_wrapped) >= 2:
                    break
                add_if_new(c)

            # 나머지 1곳: 1km 초과 후보 중 1곳
            if len(selected_wrapped) < 3 and beyond_1km:
                far_pool = beyond_1km[:8]
                random.shuffle(far_pool)
                for c in far_pool:
                    if add_if_new(c):
                        break

            # 2곳 미만이면 1km 이내에서 더 채우기
            for c in within_1km:
                if len(selected_wrapped) >= 3:
                    break
                add_if_new(c)
            # 그래도 부족하면 1km 초과에서 채우기
            for c in beyond_1km:
                if len(selected_wrapped) >= 3:
                    break
                add_if_new(c)

            # 3곳 미만이면 점수 순으로 남은 후보에서 채우기 (항상 3곳 노출)
            if len(selected_wrapped) < 3:
                remaining = [c for c in candidates if c["place"].get("id") not in selected_ids]
                remaining.sort(key=lambda c: c["score"], reverse=True)
                for c in remaining:
                    if len(selected_wrapped) >= 3:
                        break
                    add_if_new(c)

            random.shuffle(selected_wrapped)
            selected = [c["place"] for c in selected_wrapped]

            # 서사는 클릭한 장소에서만 요청 (단일 서사 API 사용)
            recommendations: List[PlaceRecommendation] = []
            for idx, wrapped in enumerate(selected_wrapped):
                place = wrapped["place"]
                distance = wrapped["distance"]
                total_score = wrapped["score"]
                primary_cat = place.get("primary_category", "기타")

                recommendations.append(
                    PlaceRecommendation(
                        place_id=place.get("id", ""),
                        name=place.get("name", "Unknown"),
                        address=place.get("address", ""),
                        category=primary_cat,
                        distance_meters=round(distance, 1),
                        score=round(total_score, 1),
                        score_breakdown={
                            "role": round(wrapped["role_score"], 1),
                            "mood": round(wrapped["mood_score"], 1),
                            "rating": round(wrapped["rating_score"], 1),
                            "distance": round(wrapped["distance_score"], 1),
                        },
                        reason=f"{request.role_type} · 기분 '{request.mood.mood_text}'에 맞는 장소" if request.mood else f"{request.role_type} 역할에 맞는 장소",
                        estimated_cost=place.get("average_price"),
                        vibe_tags=place.get("vibe_tags", []),
                        average_rating=place.get("average_rating", 0),
                        is_hidden_gem=place.get("is_hidden_gem", False),
                        typical_crowd_level=place.get("typical_crowd_level", "medium"),
                        narrative="",
                        description=place.get("description", ""),
                        latitude=place.get("latitude"),
                        longitude=place.get("longitude"),
                    )
                )

            return RecommendationResponse(
                recommendations=recommendations,
                role_type=request.role_type,
                radius_used=radius,
                total_candidates=len(candidates) if candidates else len(places),
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
    for p in top_3:
        p["narrative"] = ""

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
