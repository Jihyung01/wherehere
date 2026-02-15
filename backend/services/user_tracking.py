# -*- coding: utf-8 -*-
"""
실제 사용자 행동 추적 서비스
- 방문 기록 저장
- 위치 추적
- 데이터 축적
"""

from datetime import datetime
from typing import Optional, Dict, Any
import asyncpg


class UserTrackingService:
    """사용자 행동을 실시간으로 추적하고 DB에 저장"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.pool = db_pool
    
    async def record_visit(
        self,
        user_id: str,
        place_id: str,
        duration_minutes: Optional[int] = None,
        rating: Optional[float] = None,
        review: Optional[str] = None,
        mood: Optional[str] = None,
        companions: int = 1,
        spent_amount: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        방문 기록 저장 (실제 데이터 축적)
        """
        async with self.pool.acquire() as conn:
            visit = await conn.fetchrow("""
                INSERT INTO user_visits (
                    user_id, place_id, duration_minutes, rating, 
                    review, mood, companions, spent_amount, visited_at
                )
                VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id, visited_at
            """, user_id, place_id, duration_minutes, rating, review, mood, companions, spent_amount)
            
            # 사용자 총 방문 횟수 업데이트
            await self._update_user_stats(conn, user_id)
            
            return {
                "visit_id": str(visit["id"]),
                "visited_at": visit["visited_at"].isoformat(),
                "message": "방문 기록이 저장되었습니다"
            }
    
    async def record_location(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        accuracy: Optional[float] = None
    ) -> bool:
        """
        위치 기록 저장 (실시간 추적)
        """
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO location_history (user_id, location, accuracy, recorded_at)
                VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, NOW())
            """, user_id, longitude, latitude, accuracy)
            
            return True
    
    async def get_user_visits(
        self,
        user_id: str,
        days: int = 90
    ) -> list:
        """
        사용자 방문 기록 조회 (AI 분석용)
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    v.id,
                    v.visited_at,
                    v.duration_minutes,
                    v.rating,
                    v.mood,
                    v.companions,
                    v.spent_amount,
                    p.name as place_name,
                    p.primary_category,
                    p.vibe_tags,
                    p.is_hidden_gem,
                    ST_Y(p.location::geometry) as latitude,
                    ST_X(p.location::geometry) as longitude
                FROM user_visits v
                JOIN places p ON v.place_id = p.id
                WHERE v.user_id = $1
                    AND v.visited_at >= NOW() - INTERVAL '1 day' * $2
                ORDER BY v.visited_at DESC
            """, user_id, days)
            
            return [dict(row) for row in rows]
    
    async def get_user_location_history(
        self,
        user_id: str,
        days: int = 30
    ) -> list:
        """
        사용자 위치 기록 조회 (지도 시각화용)
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    ST_Y(location::geometry) as latitude,
                    ST_X(location::geometry) as longitude,
                    recorded_at
                FROM location_history
                WHERE user_id = $1
                    AND recorded_at >= NOW() - INTERVAL '1 day' * $2
                ORDER BY recorded_at ASC
            """, user_id, days)
            
            return [dict(row) for row in rows]
    
    async def _update_user_stats(self, conn, user_id: str):
        """사용자 통계 업데이트"""
        await conn.execute("""
            INSERT INTO user_personality (user_id, total_visits, updated_at)
            VALUES ($1, 1, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                total_visits = user_personality.total_visits + 1,
                updated_at = NOW()
        """, user_id)
    
    async def check_nearby_places(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 100
    ) -> list:
        """
        현재 위치 근처 장소 확인 (자동 체크인용)
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    id,
                    place_id,
                    name,
                    primary_category,
                    ST_Distance(
                        location,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                    ) as distance_meters
                FROM places
                WHERE ST_DWithin(
                    location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    $3
                )
                AND is_active = TRUE
                ORDER BY distance_meters ASC
                LIMIT 5
            """, longitude, latitude, radius_meters)
            
            return [dict(row) for row in rows]
