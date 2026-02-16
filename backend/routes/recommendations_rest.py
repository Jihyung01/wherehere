# -*- coding: utf-8 -*-
"""
REST API 기반 추천 로직
"""

from datetime import datetime
import random
from typing import Dict, Any
from .recommendations import PlaceRecommendation, RecommendationResponse


async def get_db_recommendations_rest(helpers, request, weather_data, time_now):
    """REST API를 사용한 DB 추천"""
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    logger.info(f"[REST] Getting recommendations for {request.role_type}")
    
    # 역할별 반경
    radius_map = {
        "explorer": 3000 + request.user_level * 200,
        "healer": 800 + request.user_level * 50,
        "archivist": 2000 + request.user_level * 150,
        "relation": 2000 + request.user_level * 150,
        "achiever": 5000 + request.user_level * 300,
        "artist": 2500 + request.user_level * 150,
        "foodie": 1500 + request.user_level * 100,
        "challenger": 4000 + request.user_level * 250,
    }
    radius = radius_map.get(request.role_type, 2000)
    
    # DB에서 장소 가져오기
    logger.info(f"[REST] Fetching places within {radius}m radius")
    try:
        places = await helpers.get_places_nearby(
            request.current_location.latitude,
            request.current_location.longitude,
            radius,
            50
        )
        logger.info(f"[REST] Found {len(places)} places")
    except Exception as e:
        logger.error(f"[REST] Error fetching places: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    
    if not places:
        # 빈 결과 반환
        return RecommendationResponse(
            recommendations=[],
            role_type=request.role_type,
            radius_used=radius,
            total_candidates=0,
            generated_at=datetime.now().isoformat(),
            weather=weather_data,
            time_of_day=time_now,
            data_source="database_rest"
        )
    
    # 상위 3개 선택
    selected = random.sample(places, min(3, len(places)))
    
    # 거리 계산 함수 (Haversine formula)
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """두 지점 간 거리 계산 (미터)"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371000  # 지구 반지름 (미터)
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c
    
    recommendations = []
    for place in selected:
        # 거리 계산
        place_lat = place.get("latitude")
        place_lon = place.get("longitude")
        
        logger.info(f"[REST] Place: {place.get('name')}, Lat: {place_lat}, Lon: {place_lon}")
        
        if place_lat and place_lon:
            distance = calculate_distance(
                request.current_location.latitude,
                request.current_location.longitude,
                place_lat,
                place_lon
            )
            logger.info(f"[REST] Calculated distance: {distance}m")
        else:
            distance = 0.0
            logger.warning(f"[REST] No lat/lon for place: {place.get('name')}")
        
        # 스코어 계산 (간단한 버전)
        score = 85.0  # 기본 스코어
        if place.get("average_rating"):
            score += place.get("average_rating", 0) * 2
        if place.get("is_hidden_gem"):
            score += 5
        if distance > 0:
            # 거리가 가까울수록 점수 증가 (최대 10점)
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
            reason=f"{request.role_type} 역할에 맞는 장소입니다",
            estimated_cost=place.get("average_price"),
            vibe_tags=place.get("vibe_tags", []),
            average_rating=place.get("average_rating", 0),
            is_hidden_gem=place.get("is_hidden_gem", False),
            typical_crowd_level=place.get("typical_crowd_level", "medium"),
            narrative=f"AI가 추천하는 {place.get('name', 'Unknown')}",
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
