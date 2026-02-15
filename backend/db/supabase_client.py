# -*- coding: utf-8 -*-
"""
Supabase REST API 클라이언트
PostgreSQL 직접 연결이 안 될 때 HTTP API 사용
"""

import httpx
from typing import List, Dict, Any, Optional
from core.config import settings


class SupabaseClient:
    """Supabase REST API를 통한 DB 접근"""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def query_places(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 3000,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        주변 장소 검색 (REST API)
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Supabase PostgREST API
            url = f"{self.base_url}/rest/v1/rpc/nearby_places"
            
            response = await client.post(
                url,
                headers=self.headers,
                json={
                    "lat": latitude,
                    "lng": longitude,
                    "radius": radius_meters,
                    "limit_count": limit
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                # RPC 함수가 없으면 일반 쿼리 사용
                return await self._query_places_fallback(latitude, longitude, radius_meters, limit)
    
    async def _query_places_fallback(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        일반 테이블 쿼리 (필터링 없이)
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "is_active": "eq.true",
                "limit": limit
            }
            
            response = await client.get(
                url,
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
    
    async def insert_visit(self, visit_data: Dict[str, Any]) -> Dict[str, Any]:
        """방문 기록 저장"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_visits"
            
            response = await client.post(
                url,
                headers=self.headers,
                json=visit_data
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                raise Exception(f"Failed to insert visit: {response.text}")
    
    async def get_user_visits(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """사용자 방문 기록 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_visits"
            params = {
                "select": "*,places(*)",
                "user_id": f"eq.{user_id}",
                "order": "visited_at.desc",
                "limit": limit
            }
            
            response = await client.get(
                url,
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
    
    async def upsert_personality(self, user_id: str, personality_data: Dict[str, Any]) -> bool:
        """성격 분석 결과 저장"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            
            data = {"user_id": user_id, **personality_data}
            
            response = await client.post(
                url,
                headers={**self.headers, "Prefer": "resolution=merge-duplicates"},
                json=data
            )
            
            return response.status_code in [200, 201]
    
    async def get_personality(self, user_id: str) -> Optional[Dict[str, Any]]:
        """성격 프로필 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "limit": 1
            }
            
            response = await client.get(
                url,
                headers=self.headers,
                params=params
            )
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else None
            else:
                return None
