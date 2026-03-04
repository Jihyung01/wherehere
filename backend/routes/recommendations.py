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
from mock.mock_data import (
    get_mock_recommendations,
    ROLE_CATEGORY_MAP as MOCK_ROLE_CATEGORY_MAP,
    ROLE_NARRATIVES,
)
from services.weather_service import get_weather, get_time_of_day
from services.narrative_generator import generate_narrative
from services.kakao_places import KakaoPlacesService

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


# ------------------------------------------------------------
# 역할/기분 스코어링을 위한 룰 테이블
# ------------------------------------------------------------

# 역할별 기본 탐색 반경 (미터)
ROLE_RADIUS_MAP: Dict[str, int] = {
    "explorer": 3000,
    "healer": 1200,
    "archivist": 2500,
    "relation": 2000,
    "achiever": 4000,
    "artist": 2500,
    "foodie": 2000,
    "challenger": 4000,
}

# 역할 → Kakao category_group_code 매핑
ROLE_TO_KAKAO_CODES: Dict[str, List[str]] = {
    # 관광 / 산책 / 이색 장소
    "explorer": ["AT4", "AD5", "CT1"],
    # 카페 / 공원 / 쉼
    "healer": ["CE7", "AT4"],
    # 전시 / 복합문화공간 + 카페
    "artist": ["CT1", "CE7"],
    # 맛집 / 카페
    "foodie": ["FD6", "CE7"],
    # 운동 / 액티비티 (문화시설 + 기타)
    "challenger": ["CT1", "FD6"],
    # 관계/모임: 맛집 + 카페
    "relation": ["FD6", "CE7"],
    # 성취/스터디: 카페 위주
    "achiever": ["CE7"],
}

# 역할 한글 라벨 (reason 문구용)
ROLE_LABELS_KO: Dict[str, str] = {
    "explorer": "탐험가",
    "healer": "힐러",
    "artist": "예술가",
    "foodie": "미식가",
    "challenger": "도전자",
    "archivist": "수집가",
    "relation": "연결자",
    "achiever": "달성자",
}


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

    # Kakao Local API 기반 추천 (DB는 유저 행동 로그/캐시로만 사용)
    try:
        user_lat = request.current_location.latitude
        user_lon = request.current_location.longitude

        # 방문 이력: 이미 완료한 장소는 추천에서 제외 (가능할 때만)
        completed_place_ids: set[str] = set()
        try:
            from db.rest_helpers import RestDatabaseHelpers

            helpers = RestDatabaseHelpers()
            if request.user_id:
                completed_ids = await helpers.get_completed_places(request.user_id)
                completed_place_ids = set(completed_ids)
        except Exception:
            completed_place_ids = set()

        # 1단계: Kakao Local API로 역할에 맞는 카테고리 주변 장소 조회
        kakao = KakaoPlacesService()
        radius = ROLE_RADIUS_MAP.get(request.role_type, 2000)
        category_codes = ROLE_TO_KAKAO_CODES.get(request.role_type, ["FD6", "CE7"])

        kakao_docs: list[Dict] = []
        for code in category_codes:
            try:
                result = await kakao.search_by_category(
                    x=user_lon,
                    y=user_lat,
                    category_group_code=code,
                    radius=radius,
                    size=15,
                )
                kakao_docs.extend(result.get("documents", []))
            except Exception:
                continue

        # 중복 제거
        seen_ids: set[str] = set()
        unique_docs: list[Dict] = []
        for doc in kakao_docs:
            doc_id = doc.get("id")
            if not doc_id or doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            unique_docs.append(doc)

        if not unique_docs:
            raise RuntimeError("No Kakao places found")

        # Kakao 응답을 우리 스키마에 맞춘 place 딕셔너리로 변환
        def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371000
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            d_phi = math.radians(lat2 - lat1)
            d_lambda = math.radians(lon2 - lon1)
            a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        places: list[Dict] = []
        for doc in unique_docs:
            mapped = kakao.map_to_our_schema(doc)
            coords = mapped["location"]["coordinates"]
            place_lon = float(coords[0])
            place_lat = float(coords[1])
            distance = mapped.get("distance_meters")
            if distance is None:
                distance = _haversine_distance(user_lat, user_lon, place_lat, place_lon)

            place_id = f"kakao-{mapped['external_id']}"
            if place_id in completed_place_ids:
                continue

            places.append(
                {
                    "id": place_id,
                    "name": mapped["name"],
                    "address": mapped.get("road_address") or mapped.get("address") or "",
                    "primary_category": mapped.get("category") or "기타",
                    "secondary_categories": [],
                    "average_price": mapped.get("estimated_cost"),
                    "vibe_tags": [],  # Kakao만으로는 vibe 태그 없음 (나중에 AI 태깅)
                    "average_rating": 4.3,  # 기본값 (실제 평점 없으므로 보수적 기본)
                    "is_hidden_gem": False,
                    "typical_crowd_level": "medium",
                    "description": "",
                    "latitude": place_lat,
                    "longitude": place_lon,
                    "distance_meters": distance,
                }
            )

        if not places:
            raise RuntimeError("No places after filtering")

        # 2단계: 역할/기분/거리 기반 스코어링
        role_preferred_categories = MOCK_ROLE_CATEGORY_MAP.get(request.role_type, [])

        candidates: list[Dict] = []
        for p in places:
            dist = float(p.get("distance_meters") or 0.0)
            primary_cat = (p.get("primary_category") or "").strip()

            # 역할 매칭
            role_match = primary_cat in role_preferred_categories
            role_score = 22.0 if role_match else 10.0

            # 기분 매칭
            mood_cat_match = primary_cat in mood_preferred_categories
            mood_vibe_match = False  # Kakao-only에서는 vibe_tags 없음
            mood_score = 0.0
            if mood_cat_match or mood_vibe_match:
                intensity = request.mood.intensity if request.mood else 0.5
                mood_score = 10.0 * (0.5 + intensity / 2.0)

            base = 70.0
            rating = float(p.get("average_rating") or 0.0)
            rating_score = rating * 4.0
            distance_km = dist / 1000.0
            distance_score = max(0.0, 12.0 - distance_km * 2.0)
            hidden_bonus = 0.0
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
            raise RuntimeError("No scored candidates")

        # 3단계: 1km 이내 우선 선택 로직
        NEAR_METERS = 1000
        within_1km = [c for c in candidates if c["distance"] <= NEAR_METERS]
        beyond_1km = [c for c in candidates if c["distance"] > NEAR_METERS]
        within_1km.sort(key=lambda c: c["score"], reverse=True)
        beyond_1km.sort(key=lambda c: c["score"], reverse=True)

        selected_ids: set[str] = set()
        selected_wrapped: list[Dict] = []

        def add_if_new(c: Dict) -> bool:
            pid = c["place"].get("id")
            if pid and pid in selected_ids:
                return False
            if pid:
                selected_ids.add(pid)
            selected_wrapped.append(c)
            return True

        # 1km 이내에서 2곳 우선
        near_pool = within_1km[:12]
        random.shuffle(near_pool)
        for c in near_pool:
            if len(selected_wrapped) >= 2:
                break
            add_if_new(c)

        # 나머지 1곳은 1km 초과 후보 중에서
        if len(selected_wrapped) < 3 and beyond_1km:
            far_pool = beyond_1km[:8]
            random.shuffle(far_pool)
            for c in far_pool:
                if add_if_new(c):
                    break

        # 부족하면 다시 채우기
        for c in within_1km:
            if len(selected_wrapped) >= 3:
                break
            add_if_new(c)
        for c in beyond_1km:
            if len(selected_wrapped) >= 3:
                break
            add_if_new(c)

        # 그래도 3곳 미만이면 점수순으로 채우기
        if len(selected_wrapped) < 3:
            remaining = [c for c in candidates if c["place"].get("id") not in selected_ids]
            remaining.sort(key=lambda c: c["score"], reverse=True)
            for c in remaining:
                if len(selected_wrapped) >= 3:
                    break
                add_if_new(c)

        random.shuffle(selected_wrapped)

        # 4단계: reason/narrative용 메타데이터 기반 설명 생성
        role_label = ROLE_LABELS_KO.get(request.role_type, request.role_type)
        mood_text_for_reason = request.mood.mood_text if request.mood else ""

        def build_reason(primary_cat: str, distance_m: float) -> str:
            pieces: list[str] = []
            if mood_text_for_reason:
                pieces.append(f"지금 기분 \"{mood_text_for_reason}\"인 {role_label}을 위한 {primary_cat}")
            else:
                pieces.append(f"{role_label}에게 어울리는 {primary_cat}")
            if distance_m > 0:
                if distance_m < 600:
                    pieces.append(f"집 근처 {int(distance_m)}m 거리")
                else:
                    pieces.append(f"약 {int(distance_m/1000)}km 거리")
            return " · ".join(pieces)

        recommendations: List[PlaceRecommendation] = []
        for wrapped in selected_wrapped:
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
                    reason=build_reason(primary_cat, distance),
                    estimated_cost=place.get("average_price"),
                    vibe_tags=place.get("vibe_tags", []),
                    average_rating=place.get("average_rating", 0),
                    is_hidden_gem=place.get("is_hidden_gem", False),
                    typical_crowd_level=place.get("typical_crowd_level", "medium"),
                    narrative="",  # 실제 서사는 /narrative 엔드포인트에서 on-demand로 생성
                    description=place.get("description", ""),
                    latitude=place.get("latitude"),
                    longitude=place.get("longitude"),
                )
            )

        return RecommendationResponse(
            recommendations=recommendations,
            role_type=request.role_type,
            radius_used=radius,
            total_candidates=len(candidates),
            generated_at=datetime.now().isoformat(),
            weather=weather_data,
            time_of_day=time_now,
            data_source="kakao_hybrid",
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
