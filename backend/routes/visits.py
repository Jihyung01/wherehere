# -*- coding: utf-8 -*-
"""
방문 기록 API
"""

import math
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from core.dependencies import get_db
from services.push_service import send_push_for_user

router = APIRouter(prefix="/api/v1/visits", tags=["Visits"])

# 체크인 허용 거리(미터). 이 거리 이내일 때만 서버에서 체크인 허용
CHECKIN_RADIUS_METERS = 100


async def _ensure_place_from_client(
    place_id: str, place_name: Optional[str], place_category: Optional[str], db,
    latitude: Optional[float] = None, longitude: Optional[float] = None
) -> Optional[dict]:
    """클라이언트에서 전달한 place_name/place_category로 places 테이블에 upsert (나의 지도 표시용)"""
    if hasattr(db, "upsert_place_minimal"):
        ok = await db.upsert_place_minimal(
            place_id=place_id,
            name=place_name or place_id,
            primary_category=place_category or "기타",
            latitude=latitude or 37.5665,
            longitude=longitude or 126.9780,
        )
        if ok:
            return await db.get_place_by_id(place_id)
    return None


async def _fetch_and_save_kakao_place(place_id: str, db) -> Optional[dict]:
    """카카오 place_id로 장소 정보 조회 후 places 테이블에 저장"""
    try:
        from services.kakao_places import KakaoPlacesService
        from core.config import settings
        import httpx
        
        kakao_id = place_id.replace("kakao-", "")
        
        # 카카오 API로 장소 상세 정보 조회
        kakao = KakaoPlacesService()
        url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={"Authorization": f"KakaoAK {settings.KAKAO_API_KEY}"},
                params={"query": kakao_id, "size": 1}
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            documents = data.get("documents", [])
            
            if not documents:
                return None
            
            kakao_place = documents[0]
            
            # places 테이블에 저장
            place_data = {
                "id": place_id,
                "name": kakao_place.get("place_name", "Unknown"),
                "primary_category": kakao._extract_main_category(kakao_place.get("category_name", "")),
                "latitude": float(kakao_place.get("y", 37.5665)),
                "longitude": float(kakao_place.get("x", 126.978)),
                "address": kakao_place.get("address_name", ""),
                "is_active": True,
                "rating": 4.0,
            }
            
            # Supabase에 저장
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{db.base_url}/rest/v1/places"
                headers = {**db.headers, "Prefer": "resolution=merge-duplicates"}
                resp = await client.post(url, headers=headers, json=place_data)
                
                if resp.status_code in [200, 201]:
                    return place_data
            
            return None
            
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"카카오 장소 정보 저장 실패: {e}")
        return None


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine 거리(미터)"""
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class VisitCreate(BaseModel):
    user_id: str
    place_id: str
    duration_minutes: int
    rating: Optional[float] = None
    mood: Optional[str] = None
    spent_amount: Optional[int] = None
    companions: int = 1
    user_latitude: Optional[float] = None
    user_longitude: Optional[float] = None
    place_name: Optional[str] = None
    place_category: Optional[str] = None
    place_latitude: Optional[float] = None
    place_longitude: Optional[float] = None


@router.get("/{user_id}")
async def get_user_visits(
    user_id: str,
    days: int = 90,
    db = Depends(get_db)
):
    """사용자 방문 기록 조회"""
    
    try:
        if db is None:
            # Mock 데이터
            return {
                "visits": [],
                "total_count": 0
            }
        
        visits = await db.get_user_visits(user_id, days=days)

        # visits 테이블에 place_name/latitude/longitude 컬럼이 있으면 N+1 쿼리 스킵
        # 없는 경우에만 places 테이블 조회 (백워드 호환)
        enriched_visits = []
        missing_place_ids: list = []
        for visit in visits:
            if visit.get("latitude") is None and visit.get("place_id"):
                missing_place_ids.append(visit.get("place_id"))

        # 좌표 없는 place만 일괄 조회 (최대 1번 쿼리로 처리)
        place_cache: dict = {}
        if missing_place_ids:
            for pid in missing_place_ids[:20]:  # 최대 20개만 보완 조회
                try:
                    p = await db.get_place_by_id(pid)
                    if p:
                        place_cache[pid] = p
                except Exception:
                    pass

        for visit in visits:
            place_id = visit.get("place_id")
            # visits 테이블에 이미 좌표가 있으면 바로 사용 (빠른 경로)
            if visit.get("latitude") is not None:
                enriched_visits.append({
                    "id": visit.get("id"),
                    "place_id": place_id,
                    "visited_at": visit.get("visited_at"),
                    "duration_minutes": visit.get("duration_minutes", 60),
                    "xp_earned": visit.get("xp_earned", 100),
                    "mood": visit.get("mood"),
                    "rating": visit.get("rating"),
                    "spent_amount": visit.get("spent_amount"),
                    "place_name": visit.get("place_name") or "장소",
                    "category": visit.get("category") or "기타",
                    "latitude": visit.get("latitude"),
                    "longitude": visit.get("longitude"),
                })
                continue

            # 캐시에서 place 정보 사용
            place = place_cache.get(place_id)
            enriched_visit = {
                "id": visit.get("id"),
                "place_id": place_id,
                "visited_at": visit.get("visited_at"),
                "duration_minutes": visit.get("duration_minutes", 60),
                "xp_earned": visit.get("xp_earned", 100),
                "mood": visit.get("mood"),
                "rating": visit.get("rating"),
                "spent_amount": visit.get("spent_amount"),
            }
            if place:
                enriched_visit.update({
                    "place_name": place.get("name") or visit.get("place_name") or "장소",
                    "category": place.get("primary_category") or "기타",
                    "latitude": place.get("latitude"),
                    "longitude": place.get("longitude"),
                })
            else:
                enriched_visit.update({
                    "place_name": visit.get("place_name") or "장소 정보 없음",
                    "category": visit.get("category") or "기타",
                    "latitude": None,
                    "longitude": None,
                })
            enriched_visits.append(enriched_visit)
        
        return {
            "visits": enriched_visits,
            "total_count": len(enriched_visits)
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Error fetching visits: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            "visits": [],
            "total_count": 0
        }


@router.post("")
async def create_visit(
    visit: VisitCreate,
    db = Depends(get_db)
):
    """방문 기록 생성. user_latitude/user_longitude 있으면 100m 이내에서만 체크인 허용."""
    
    try:
        if db is None:
            return {
                "success": False,
                "message": "Database not connected"
            }
        
        # place_id로 places 테이블 조회
        place = await db.get_place_by_id(visit.place_id)
        # kakao- 접두사 또는 숫자형 카카오 ID면 Kakao API로 장소 정보 조회 후 저장
        if not place and (visit.place_id.startswith("kakao-") or visit.place_id.isdigit()):
            place = await _fetch_and_save_kakao_place(
                f"kakao-{visit.place_id}" if visit.place_id.isdigit() else visit.place_id, db
            )
        # 클라이언트가 place_name을 보내면 항상 upsert (장소 좌표도 함께 저장)
        if visit.place_name:
            updated = await _ensure_place_from_client(
                visit.place_id, visit.place_name, visit.place_category, db,
                latitude=visit.place_latitude, longitude=visit.place_longitude,
            )
            if updated:
                place = updated
        elif not place and visit.place_category:
            place = await _ensure_place_from_client(
                visit.place_id, visit.place_id, visit.place_category, db,
                latitude=visit.place_latitude, longitude=visit.place_longitude,
            ) or place
        
        location_verified = False
        if visit.user_latitude is not None and visit.user_longitude is not None:
            if place:
                plat = place.get("latitude")
                plon = place.get("longitude")
                if plat is not None and plon is not None:
                    dist = _distance_meters(
                        visit.user_latitude,
                        visit.user_longitude,
                        float(plat),
                        float(plon),
                    )
                    if dist > CHECKIN_RADIUS_METERS:
                        raise HTTPException(
                            status_code=400,
                            detail=f"체크인은 장소 {CHECKIN_RADIUS_METERS}m 이내에서만 가능해요. (현재 약 {int(dist)}m)"
                        )
                    location_verified = True
        
        # XP 계산: 기본 + 체류시간 보너스 + 별점 보너스 + 위치 검증 보너스
        xp_earned = 100
        if visit.duration_minutes > 60:
            xp_earned += 50
        if visit.rating is not None and visit.rating >= 4.0:
            xp_earned += 30
        if location_verified:
            xp_earned += 20
        
        visit_data = {
            "user_id": visit.user_id,
            "place_id": visit.place_id,
            "visited_at": datetime.now().isoformat(),
            "duration_minutes": visit.duration_minutes,
            "rating": visit.rating,
            "mood": visit.mood,
            "spent_amount": visit.spent_amount,
            "companions": visit.companions,
            "xp_earned": xp_earned,
        }

        result = await db.insert_visit(visit_data)
        try:
            await db.create_notification(
                visit.user_id,
                "quest_complete",
                "퀘스트 완료!",
                f"+{xp_earned} XP를 획득했어요.",
                {"xp_earned": xp_earned, "place_id": visit.place_id}
            )
            await send_push_for_user(db, visit.user_id, "퀘스트 완료!", f"+{xp_earned} XP를 획득했어요.")
        except Exception:
            pass
        try:
            place = await db.get_place_by_id(visit.place_id)
            place_name = place.get("name") if place else None
            await db.create_feed_activity(visit.user_id, "checkin", visit.place_id, place_name, xp_earned, None)
        except Exception:
            pass
        return {
            "success": True,
            "visit_id": result.get("id"),
            "xp_earned": xp_earned,
            "location_verified": location_verified
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Error creating visit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presence/{place_id}")
async def get_place_presence(
    place_id: str,
    hours: int = 3,
    requester_id: Optional[str] = None,
    db = Depends(get_db)
):
    """현재 장소에 함께 있는 사람 조회 (최근 N시간 내 체크인한 사용자)"""
    try:
        if db is None:
            return {"users": [], "count": 0}

        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()

        # activity_logs 또는 visits 테이블에서 최근 체크인 조회
        import httpx
        headers = {**db.headers, "Accept": "application/json"}

        # visits 테이블: 최근 N시간 내 같은 place_id 방문자
        url = f"{db.base_url}/rest/v1/visits"
        params = {
            "place_id": f"eq.{place_id}",
            "visited_at": f"gte.{cutoff}",
            "select": "user_id,visited_at",
            "order": "visited_at.desc",
            "limit": "50",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers, params=params)

        if resp.status_code != 200:
            return {"users": [], "count": 0}

        visits_raw = resp.json() or []
        # 중복 user_id 제거 (가장 최근 체크인만 유지)
        seen: dict = {}
        for v in visits_raw:
            uid = v.get("user_id")
            if uid and uid != requester_id and uid not in seen:
                seen[uid] = v.get("visited_at")

        if not seen:
            return {"users": [], "count": 0}

        # 사용자 프로필 조회
        user_ids = list(seen.keys())[:20]
        in_filter = "(" + ",".join(f'"{uid}"' for uid in user_ids) + ")"
        profile_url = f"{db.base_url}/rest/v1/users"
        profile_params = {
            "user_id": f"in.{in_filter}",
            "select": "user_id,username,profile_image_url",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            presp = await client.get(profile_url, headers=headers, params=profile_params)

        profiles: dict = {}
        if presp.status_code == 200:
            for p in (presp.json() or []):
                profiles[p["user_id"]] = p

        users = []
        for uid, checked_in_at in seen.items():
            p = profiles.get(uid, {})
            users.append({
                "user_id": uid,
                "display_name": p.get("username") or uid[:8],
                "avatar_url": p.get("profile_image_url"),
                "checked_in_at": checked_in_at,
            })

        return {"users": users, "count": len(users)}

    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Presence error: {e}")
        return {"users": [], "count": 0}


@router.post("/location")
async def update_user_location(
    user_id: str,
    latitude: float,
    longitude: float,
    db = Depends(get_db)
):
    """사용자 마지막 위치 업데이트 (소셜 지도용)"""
    try:
        if db is None:
            return {"success": False}

        import httpx
        headers = {**db.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}
        url = f"{db.base_url}/rest/v1/users"
        params = {"user_id": f"eq.{user_id}"}
        body = {
            "last_location": f"POINT({longitude} {latitude})",
            "last_active_date": datetime.now().isoformat(),
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(url, headers=headers, json=body, params=params)

        return {"success": resp.status_code in [200, 204]}
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error(f"Location update error: {e}")
        return {"success": False}
