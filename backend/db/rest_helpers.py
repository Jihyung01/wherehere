# -*- coding: utf-8 -*-
"""
Supabase REST API 기반 DB 헬퍼
asyncpg 대신 HTTP API 사용
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from core.config import settings


class RestDatabaseHelpers:
    """Supabase REST API를 통한 DB 작업"""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def get_places_nearby(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 3000,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """주변 장소 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "is_active": "eq.true",
                "limit": limit
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
    
    async def get_user_visits(self, user_id: str, days: int = 90) -> List[Dict[str, Any]]:
        """사용자 방문 기록 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_visits"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "order": "visited_at.desc",
                "limit": 100
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
    
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """사용자 프로필 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else {}
            return {}
    
    async def update_user_personality(
        self,
        user_id: str,
        personality: Dict[str, float],
        companion_style: Dict[str, Any]
    ) -> bool:
        """성격 분석 결과 저장"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            
            data = {
                "user_id": user_id,
                "openness": personality.get("openness", 0.5),
                "conscientiousness": personality.get("conscientiousness", 0.5),
                "extraversion": personality.get("extraversion", 0.5),
                "agreeableness": personality.get("agreeableness", 0.5),
                "neuroticism": personality.get("neuroticism", 0.5),
                "analyzed_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            response = await client.post(url, headers=headers, json=data)
            
            return response.status_code in [200, 201]
    
    async def insert_visit(self, visit_data: Dict[str, Any]) -> Dict[str, Any]:
        """방문 기록 저장"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_visits"
            
            response = await client.post(url, headers=self.headers, json=visit_data)
            
            if response.status_code in [200, 201]:
                return response.json()[0] if response.json() else {}
            return {}
    
    async def create_challenge(self, challenge_data: Dict[str, Any]) -> Dict[str, Any]:
        """챌린지 생성"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/challenges"
            
            response = await client.post(url, headers=self.headers, json=challenge_data)
            
            if response.status_code in [200, 201]:
                return response.json()[0] if response.json() else {}
            return {}
    
    async def get_challenge(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        """챌린지 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/challenges"
            params = {
                "select": "*",
                "id": f"eq.{challenge_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else None
            return None
    
    async def get_completed_places(self, user_id: str) -> List[str]:
        """사용자가 완료한 장소 ID 목록"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_visits"
            params = {
                "select": "place_id",
                "user_id": f"eq.{user_id}"
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                visits = response.json()
                return [v["place_id"] for v in visits if v.get("place_id")]
            return []
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """사용자 통계"""
        visits = await self.get_user_visits(user_id, 365)
        return {
            "total_visits": len(visits),
            "unique_places": len(set(v.get("place_id") for v in visits if v.get("place_id"))),
            "total_xp": sum(v.get("xp_earned", 0) for v in visits)
        }
    
    async def get_place_by_id(self, place_id: str) -> Optional[Dict[str, Any]]:
        """장소 상세 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "id": f"eq.{place_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else None
            return None
    
    async def get_all_places(self, limit: int = 100) -> List[Dict[str, Any]]:
        """모든 장소 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "is_active": "eq.true",
                "limit": limit
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
