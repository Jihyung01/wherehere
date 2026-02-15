# -*- coding: utf-8 -*-
"""
실제 장소 검색 및 자동 추가 서비스
Kakao Local API를 사용하여 실제 장소 데이터 수집
"""

import httpx
import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime


class PlaceDiscoveryService:
    """Kakao API로 실제 장소를 검색하고 DB에 자동 추가"""
    
    def __init__(self, kakao_api_key: str, db_pool: asyncpg.Pool):
        self.api_key = kakao_api_key
        self.pool = db_pool
        self.base_url = "https://dapi.kakao.com/v2/local/search"
    
    async def search_and_add_places(
        self,
        latitude: float,
        longitude: float,
        radius: int = 3000,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        현재 위치 주변의 실제 장소를 검색하고 DB에 추가
        """
        # Kakao API 카테고리 매핑
        kakao_categories = {
            "카페": "CE7",  # 카페
            "음식점": "FD6",  # 음식점
            "문화시설": "CT1",  # 문화시설
            "관광명소": "AT4",  # 관광명소
        }
        
        category_code = kakao_categories.get(category, "")
        
        # Kakao Local API 호출
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"KakaoAK {self.api_key}"}
            params = {
                "x": longitude,
                "y": latitude,
                "radius": radius,
                "category_group_code": category_code,
                "size": 15,
                "sort": "distance"
            }
            
            response = await client.get(
                f"{self.base_url}/category.json",
                headers=headers,
                params=params
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            places = data.get("documents", [])
        
        # DB에 장소 추가
        added_places = []
        async with self.pool.acquire() as conn:
            for place in places:
                try:
                    # AI로 vibe_tags 생성
                    vibe_tags = await self._generate_vibe_tags(
                        place["place_name"],
                        place["category_name"]
                    )
                    
                    # DB에 삽입
                    result = await conn.fetchrow("""
                        INSERT INTO places (
                            place_id, name, address, location,
                            primary_category, vibe_tags, description,
                            average_rating, is_active
                        )
                        VALUES (
                            $1, $2, $3, 
                            ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                            $6, $7, $8, 0, TRUE
                        )
                        ON CONFLICT (place_id) DO UPDATE
                        SET updated_at = NOW()
                        RETURNING id, name
                    """,
                        place["id"],
                        place["place_name"],
                        place.get("road_address_name") or place.get("address_name"),
                        float(place["x"]),
                        float(place["y"]),
                        self._extract_category(place["category_name"]),
                        vibe_tags,
                        place.get("place_name", "")
                    )
                    
                    added_places.append({
                        "id": str(result["id"]),
                        "name": result["name"],
                        "source": "kakao_api"
                    })
                
                except Exception as e:
                    print(f"Failed to add place {place.get('place_name')}: {e}")
                    continue
        
        return added_places
    
    async def search_places_by_keyword(
        self,
        keyword: str,
        latitude: float,
        longitude: float,
        radius: int = 5000
    ) -> List[Dict[str, Any]]:
        """
        키워드로 장소 검색 (사용자가 직접 검색)
        """
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"KakaoAK {self.api_key}"}
            params = {
                "query": keyword,
                "x": longitude,
                "y": latitude,
                "radius": radius,
                "size": 15
            }
            
            response = await client.get(
                f"{self.base_url}/keyword.json",
                headers=headers,
                params=params
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("documents", [])
    
    def _extract_category(self, category_name: str) -> str:
        """카카오 카테고리를 우리 카테고리로 변환"""
        if "카페" in category_name:
            return "카페"
        elif "음식점" in category_name or "식당" in category_name:
            return "음식점"
        elif "문화" in category_name or "박물관" in category_name or "갤러리" in category_name:
            return "문화공간"
        elif "공원" in category_name:
            return "공원"
        elif "술집" in category_name or "바" in category_name:
            return "바"
        else:
            return "기타"
    
    async def _generate_vibe_tags(self, place_name: str, category: str) -> List[str]:
        """
        AI로 장소의 vibe_tags 생성
        (간단한 버전 - 실제로는 Anthropic API 사용)
        """
        # 키워드 기반 태그 생성
        tags = []
        
        keywords = {
            "조용한": ["조용", "한적", "고요"],
            "힙한": ["힙", "트렌디", "핫플", "인기"],
            "감성": ["감성", "무드", "분위기"],
            "데이트": ["데이트", "커플", "로맨틱"],
            "가족": ["가족", "아이", "어린이"],
            "친구": ["친구", "모임", "단체"],
        }
        
        place_lower = place_name.lower()
        category_lower = category.lower()
        
        for tag, words in keywords.items():
            if any(word in place_lower or word in category_lower for word in words):
                tags.append(tag)
        
        # 카테고리별 기본 태그
        if "카페" in category:
            tags.extend(["커피", "디저트"])
        elif "음식점" in category:
            tags.extend(["맛집", "식사"])
        elif "공원" in category:
            tags.extend(["자연", "산책"])
        
        return list(set(tags))[:5]  # 최대 5개
